import { getAuthSession } from '@/lib/auth';
import { questionService } from '@/lib/question-service/question-service';
import { prisma } from '@/lib/prisma';
import { ContentStatus, ExaminationCategory, Prisma, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { validateBulkQuestions } from '@/lib/bulk-question-validation';

type DestinationMode = 'NEW_PAPER' | 'APPEND_TO_DRAFT' | 'REVISION_FROM_PUBLISHED';

function toDuration(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function normalizeQuestionText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function findSiblingPapers(args: {
  examId: string;
  subjectId: string;
  year: number | null;
  title: string;
  isYearBased: boolean;
}) {
  return prisma.examPaper.findMany({
    where: {
      organizationId: null,
      examId: args.examId,
      subjectId: args.subjectId,
      status: { not: ContentStatus.ARCHIVED },
      ...(args.isYearBased
        ? { year: args.year }
        : { year: null, title: { equals: args.title, mode: 'insensitive' } }),
    },
    select: { id: true, title: true, status: true, year: true, revisionGroupId: true, _count: { select: { questions: true } } },
    orderBy: [{ updatedAt: 'desc' }],
  });
}

async function copyQuestionsToRevision(sourcePaperId: string, targetPaperId: string) {
  const sourceQuestions = await prisma.question.findMany({
    where: { paperId: sourcePaperId },
    include: { options: true, tags: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  for (const question of sourceQuestions) {
    await prisma.question.create({
      data: {
        text: question.text,
        explanation: question.explanation,
        markingGuide: question.markingGuide,
        aiContext: question.aiContext ?? undefined,
        sourceApi: question.sourceApi,
        year: question.year,
        imageUrl: question.imageUrl,
        subjectId: question.subjectId,
        examId: question.examId,
        sectionId: question.sectionId,
        organizationId: null,
        paperId: targetPaperId,
        type: question.type,
        order: question.order ?? 0,
        moderationStatus: ContentStatus.DRAFT,
        options: {
          createMany: {
            data: question.options.map((option) => ({
              text: option.text,
              isCorrect: option.isCorrect,
            })),
          },
        },
        tags: { connect: question.tags.map((tag) => ({ id: tag.id })) },
      },
    });
  }

  return sourceQuestions.length;
}

async function upsertRevisionUploadQuestions(args: {
  paperId: string;
  questions: any[];
  resolvedYear: number | null;
}) {
  const existingQuestions = await prisma.question.findMany({
    where: { paperId: args.paperId },
    include: { options: true, tags: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  const existingByText = new Map<string, typeof existingQuestions[number]>();
  for (const question of existingQuestions) {
    const key = normalizeQuestionText(question.text || '');
    if (key && !existingByText.has(key)) {
      existingByText.set(key, question);
    }
  }

  const uniqueSectionNames = Array.from(
    new Set(args.questions.map((q) => q.sectionName).filter((name): name is string => !!name))
  );
  const sectionMap = new Map<string, string>();

  for (const name of uniqueSectionNames) {
    let section = await prisma.section.findFirst({ where: { instruction: name } });
    if (!section) {
      section = await prisma.section.create({ data: { instruction: name } });
    }
    sectionMap.set(name, section.id);
  }

  const processTags = async (tagNames: string[]) => {
    const tagIds = [];
    for (const name of tagNames) {
      let tag = await prisma.tag.findUnique({ where: { name } });
      if (!tag) tag = await prisma.tag.create({ data: { name } });
      tagIds.push({ id: tag.id });
    }
    return tagIds;
  };

  const newQuestions: any[] = [];
  let updatedCount = 0;

  for (const question of args.questions) {
    const key = normalizeQuestionText(question.text || '');
    const existing = key ? existingByText.get(key) : undefined;

    if (!existing) {
      newQuestions.push(question);
      continue;
    }

    const sectionId = question.sectionName ? sectionMap.get(question.sectionName) : null;
    const tagConnects = question.tags ? await processTags(question.tags) : [];

    await prisma.question.update({
      where: { id: existing.id },
      data: {
        text: question.text,
        explanation: question.explanation,
        markingGuide: question.markingGuide,
        year: args.resolvedYear,
        type: question.type,
        imageUrl: question.imageUrl,
        sectionId: sectionId ?? null,
        tags: {
          set: tagConnects,
        },
        options: {
          deleteMany: {},
          createMany: {
            data: (question.options || []).map((option: any) => ({
              text: option.text,
              isCorrect: option.isCorrect,
            })),
          },
        },
      },
    });

    updatedCount += 1;
  }

  const maxOrder = await prisma.question.aggregate({
    where: { paperId: args.paperId },
    _max: { order: true },
  });
  const orderOffset = maxOrder._max.order ?? -1;

  const created = await questionService.bulkCreate(
    newQuestions.map((question, index) => ({
      ...question,
      year: args.resolvedYear,
      paperId: args.paperId,
      order: orderOffset + index + 1,
    }))
  );

  return {
    createdCount: created.length,
    updatedCount,
  };
}

async function ensurePlatformExamination(args: {
  title: string;
  year: number | null;
  duration: number | null;
  authorId: string;
  isYearBased: boolean;
}) {
  const existing = await prisma.organizationExamination.findFirst({
    where: {
      organizationId: null,
      title: args.title,
      year: args.year,
    },
  });

  if (existing) return existing.id;

  try {
    const created = await prisma.organizationExamination.create({
      data: {
        title: args.title,
        category: args.isYearBased ? ExaminationCategory.YEARLY : ExaminationCategory.CUSTOM,
        year: args.year,
        status: ContentStatus.DRAFT,
        duration: args.duration,
        authorId: args.authorId,
        organizationId: null,
      },
    });
    return created.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2011'
    ) {
      console.warn('[ADMIN_BULK_CREATE] Platform examination container could not be created yet; continuing with draft paper only.');
      return undefined;
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      questions,
      paperTitle,
      paperDuration,
      destinationMode = 'NEW_PAPER',
      targetPaperId,
      copyExistingQuestions = true,
    } = body as {
      questions: any[];
      paperTitle?: string;
      paperDuration?: unknown;
      destinationMode?: DestinationMode;
      targetPaperId?: string;
      copyExistingQuestions?: boolean;
    };

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new NextResponse('No questions provided', { status: 400 });
    }

    const validationIssues = validateBulkQuestions(questions);
    if (validationIssues.length > 0) {
      return NextResponse.json(
        { error: 'Please fix the listed questions before uploading.', issues: validationIssues },
        { status: 422 }
      );
    }

    const firstQuestion = questions[0];
    if (!firstQuestion?.dbExamId || !firstQuestion?.dbSubjectId) {
      return new NextResponse('Exam and subject are required', { status: 400 });
    }

    const [exam, subject] = await Promise.all([
      prisma.exam.findUnique({ where: { id: firstQuestion.dbExamId } }),
      prisma.subject.findUnique({ where: { id: firstQuestion.dbSubjectId } }),
    ]);

    if (!exam || !subject) {
      return new NextResponse('Invalid exam or subject', { status: 400 });
    }

    const isYearBased = exam.isYearBased !== false;
    const resolvedYear = isYearBased ? Number(firstQuestion.year) || null : null;
    if (isYearBased && !resolvedYear) {
      return new NextResponse('Year is required for this exam curriculum', { status: 400 });
    }

    const resolvedDuration = toDuration(paperDuration);
    const resolvedPaperTitle =
      typeof paperTitle === 'string' && paperTitle.trim().length > 0
        ? paperTitle.trim()
        : [exam.shortName, subject.name, resolvedYear, 'Paper'].filter(Boolean).join(' ');

    let paperId: string;
    let copiedQuestionCount = 0;
    let updatedQuestionCount = 0;
    let createdQuestionCount = 0;

    if (destinationMode === 'APPEND_TO_DRAFT' || destinationMode === 'REVISION_FROM_PUBLISHED') {
      if (!targetPaperId) {
        return new NextResponse('Select an existing paper first', { status: 400 });
      }

      const targetPaper = await prisma.examPaper.findUnique({
        where: { id: targetPaperId },
        include: { exam: true, subject: true },
      });

      if (!targetPaper || targetPaper.organizationId !== null) {
        return new NextResponse('Target paper not found', { status: 404 });
      }

      if (targetPaper.examId !== exam.id || targetPaper.subjectId !== subject.id) {
        return new NextResponse('Uploaded questions do not match the selected paper curriculum', { status: 400 });
      }

      if (isYearBased && targetPaper.year !== resolvedYear) {
        return new NextResponse('Uploaded year does not match the selected paper', { status: 400 });
      }

      if (destinationMode === 'APPEND_TO_DRAFT') {
        if (targetPaper.status !== ContentStatus.DRAFT) {
          return new NextResponse('Only draft papers can be appended directly', { status: 409 });
        }
        paperId = targetPaper.id;
      } else {
        if (targetPaper.status !== ContentStatus.PUBLISHED) {
          return new NextResponse('Only published papers can be revised this way', { status: 409 });
        }

        const revisionTitle = resolvedPaperTitle || targetPaper.title;
        const examinationId = await ensurePlatformExamination({
          title: revisionTitle,
          year: isYearBased ? targetPaper.year : null,
          duration: resolvedDuration ?? targetPaper.duration,
          authorId: session.user.id,
          isYearBased,
        });

        const revision = await prisma.examPaper.create({
          data: {
            title: revisionTitle,
            year: isYearBased ? targetPaper.year : null,
            examId: targetPaper.examId,
            subjectId: targetPaper.subjectId,
            authorId: session.user.id,
            examinationId,
            revisionGroupId: targetPaper.revisionGroupId,
            isPublic: false,
            isVerified: false,
            status: ContentStatus.DRAFT,
            duration: resolvedDuration ?? targetPaper.duration,
            randomizeQuestions: targetPaper.randomizeQuestions,
            allowCustomOrder: targetPaper.allowCustomOrder,
            practiceEnabled: targetPaper.practiceEnabled,
            paperLabel: targetPaper.paperLabel,
          },
        });
        paperId = revision.id;

        if (copyExistingQuestions) {
          copiedQuestionCount = await copyQuestionsToRevision(targetPaper.id, revision.id);
        }
      }
    } else {
      const siblings = await findSiblingPapers({
        examId: exam.id,
        subjectId: subject.id,
        year: resolvedYear,
        title: resolvedPaperTitle,
        isYearBased,
      });

      if (siblings.length > 0) {
        return NextResponse.json(
          {
            error: 'A paper already exists for this selection. Choose an existing draft to append to, or create a revision from the published paper.',
            existingPapers: siblings,
          },
          { status: 409 }
        );
      }

      const examinationId = await ensurePlatformExamination({
        title: resolvedPaperTitle,
        year: resolvedYear,
        duration: resolvedDuration,
        authorId: session.user.id,
        isYearBased,
      });

      const paper = await prisma.examPaper.create({
        data: {
          title: resolvedPaperTitle,
          year: resolvedYear,
          examId: firstQuestion.dbExamId,
          subjectId: firstQuestion.dbSubjectId,
          authorId: session.user.id,
          examinationId,
          isPublic: false,
          isVerified: false,
          status: ContentStatus.DRAFT,
          duration: resolvedDuration,
        },
      });
      paperId = paper.id;
    }

    if (destinationMode === 'REVISION_FROM_PUBLISHED') {
      const revisionResult = await upsertRevisionUploadQuestions({
        paperId,
        questions,
        resolvedYear,
      });
      createdQuestionCount = revisionResult.createdCount;
      updatedQuestionCount = revisionResult.updatedCount;
    } else {
      const maxOrder = await prisma.question.aggregate({
        where: { paperId },
        _max: { order: true },
      });
      const orderOffset = maxOrder._max.order ?? -1;

      const created = await questionService.bulkCreate(
        questions.map((question, index) => ({
          ...question,
          year: resolvedYear,
          paperId,
          order: orderOffset + index + 1,
        }))
      );
      createdQuestionCount = created.length;
    }

    const paper = await prisma.examPaper.findUnique({ where: { id: paperId } });

    return NextResponse.json({
      count: createdQuestionCount,
      copiedQuestionCount,
      updatedQuestionCount,
      paperId,
      paperTitle: paper?.title || resolvedPaperTitle,
      destinationMode,
    });
  } catch (error) {
    console.error('[BULK_CREATE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
