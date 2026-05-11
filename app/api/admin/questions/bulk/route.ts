import { getAuthSession } from '@/lib/auth';
import { questionService } from '@/lib/question-service/question-service';
import { prisma } from '@/lib/prisma';
import { ContentStatus, ExaminationCategory, Prisma, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { questions, paperTitle, paperDuration } = body; // Expects StandardizedQuestion[]

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new NextResponse('No questions provided', { status: 400 });
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

    const resolvedYear = Number(firstQuestion.year) || new Date().getFullYear();
    const resolvedDuration =
      paperDuration === '' || paperDuration === null || paperDuration === undefined
        ? null
        : Number(paperDuration);

    const resolvedPaperTitle =
      typeof paperTitle === 'string' && paperTitle.trim().length > 0
        ? paperTitle.trim()
        : `${exam.shortName} ${subject.name} ${resolvedYear} Paper`;

    const examination = await prisma.organizationExamination.findFirst({
      where: {
        organizationId: null,
        title: resolvedPaperTitle,
        year: resolvedYear,
      },
    });

    let examinationId: string | undefined = examination?.id;

    if (!examinationId) {
      try {
        const createdExamination = await prisma.organizationExamination.create({
          data: {
            title: resolvedPaperTitle,
            category: resolvedYear ? ExaminationCategory.YEARLY : ExaminationCategory.CUSTOM,
            year: resolvedYear,
            status: ContentStatus.DRAFT,
            duration: resolvedDuration,
            authorId: session.user.id,
            organizationId: null,
          },
        });
        examinationId = createdExamination.id;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2011'
        ) {
          console.warn(
            '[ADMIN_BULK_CREATE] Platform examination container could not be created yet; continuing with draft paper only.'
          );
        } else {
          throw error;
        }
      }
    }

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
        duration: Number.isFinite(resolvedDuration as number) ? resolvedDuration : null,
      },
    });

    // Use our service to handle the complex Section/Question creation
    const created = await questionService.bulkCreate(
      questions.map((question) => ({
        ...question,
        paperId: paper.id,
      }))
    );

    return NextResponse.json({ count: created.length, paperId: paper.id, paperTitle: paper.title });

  } catch (error) {
    console.error('[BULK_CREATE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
