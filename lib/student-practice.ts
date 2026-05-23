import { ContentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUserPlanFilters } from '@/lib/access-control';

type PracticeUser = Prisma.UserGetPayload<{
  include: {
    subscription: { include: { plan: true } };
    ownedOrganization: {
      include: {
        subscription: { include: { plan: true; selectedExams: true } };
      };
    };
    organization: {
      include: {
        subscription: { include: { plan: true; selectedExams: true } };
      };
    };
  };
}>;

async function getPracticeUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: { include: { plan: true } },
      ownedOrganization: {
        include: {
          subscription: { include: { plan: true, selectedExams: true } },
        },
      },
      organization: {
        include: {
          subscription: { include: { plan: true, selectedExams: true } },
        },
      },
    },
  });
}

function getOrgContext(user: NonNullable<PracticeUser>) {
  const ownedOrg = user.ownedOrganization;
  if (ownedOrg?.subscription?.isActive) {
    return {
      orgId: ownedOrg.id,
      selectedExamIds:
        ownedOrg.subscription.selectedExams?.map((selection: { examId: string }) => selection.examId) || [],
    };
  }

  const memberOrg = user.organization;
  if (memberOrg?.subscription?.isActive) {
    return {
      orgId: memberOrg.id,
      selectedExamIds:
        memberOrg.subscription.selectedExams?.map((selection: { examId: string }) => selection.examId) || [],
    };
  }

  return {
    orgId: null as string | null,
    selectedExamIds: [] as string[],
  };
}

function hasUnrestrictedAccess(values?: string[]) {
  return !values || values.length === 0 || values.includes('ALL');
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export async function getAccessiblePracticePapers(
  userId: string,
  filters?: {
    examId?: string;
    subjectId?: string;
    year?: number;
  }
) {
  const user = await getPracticeUser(userId);
  if (!user) return [];

  const { allowedExamIds, allowedSubjectIds, allowedYears } = await getUserPlanFilters(userId);
  const planExamIds = allowedExamIds ?? [];
  const planSubjectIds = allowedSubjectIds ?? [];
  const planYears = allowedYears ?? [];
  const { orgId, selectedExamIds } = getOrgContext(user);

  const globalWhere: Prisma.ExamPaperWhereInput = {
    organizationId: null,
    status: ContentStatus.PUBLISHED,
    ...(filters?.examId ? { examId: filters.examId } : {}),
    ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters?.year ? { year: filters.year } : {}),
  };

  if (!hasUnrestrictedAccess(planExamIds)) {
    if (filters?.examId) {
      if (!planExamIds.includes(filters.examId)) {
        globalWhere.id = '__none__';
      } else {
        globalWhere.examId = filters.examId;
      }
    } else {
      globalWhere.examId = { in: planExamIds };
    }
  } else if (allowedExamIds && allowedExamIds.length === 0) {
    globalWhere.id = '__none__';
  }

  if (!hasUnrestrictedAccess(planSubjectIds)) {
    if (filters?.subjectId) {
      if (!planSubjectIds.includes(filters.subjectId)) {
        globalWhere.id = '__none__';
      } else {
        globalWhere.subjectId = filters.subjectId;
      }
    } else {
      globalWhere.subjectId = { in: planSubjectIds };
    }
  } else if (allowedSubjectIds && allowedSubjectIds.length === 0) {
    globalWhere.id = '__none__';
  }

  if (!hasUnrestrictedAccess(planYears)) {
    const years = planYears.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
    if (filters?.year) {
      if (!years.includes(filters.year)) {
        globalWhere.id = '__none__';
      } else {
        globalWhere.year = filters.year;
      }
    } else {
      globalWhere.year = { in: years };
    }
  } else if (allowedYears && allowedYears.length === 0) {
    globalWhere.id = '__none__';
  }

  const globalPromise = prisma.examPaper.findMany({
    where: globalWhere,
    include: {
      exam: true,
      subject: true,
      organization: true,
      examination: true,
      questions: {
        include: { options: true, section: true, tags: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  let orgPromise: Promise<any[]> = Promise.resolve([]);
  if (orgId) {
    const orgWhere: Prisma.ExamPaperWhereInput = {
      organizationId: orgId,
      status: ContentStatus.PUBLISHED,
      ...(filters?.examId ? { examId: filters.examId } : {}),
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters?.year ? { year: filters.year } : {}),
      OR: [
        { practiceEnabled: true },
        { examination: { is: { practiceEnabled: true } } },
      ],
    };

    orgPromise = prisma.examPaper.findMany({
      where: orgWhere,
      include: {
        exam: true,
        subject: true,
        organization: true,
        examination: true,
        questions: {
          include: { options: true, section: true, tags: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  const [globalPapers, orgPapers] = await Promise.all([globalPromise, orgPromise]);

  const filteredGlobal =
    selectedExamIds.length > 0 ? globalPapers.filter((paper) => selectedExamIds.includes(paper.examId)) : globalPapers;

  const validPapers = [...orgPapers, ...filteredGlobal].filter(
    (paper) => paper.subjectId && (paper.exam.isYearBased === false || paper.year) && paper.questions.length > 0
  );

  const byIdentity = new Map<string, (typeof validPapers)[number]>();
  validPapers.forEach((paper) => {
    const isYearBased = paper.exam.isYearBased !== false;
    const identity = [
      paper.organizationId || 'platform',
      paper.examId,
      paper.subjectId,
      isYearBased ? paper.year : paper.title.toLowerCase(),
    ].join(':');

    if (!byIdentity.has(identity)) {
      byIdentity.set(identity, paper);
    }
  });

  return Array.from(byIdentity.values());
}

export async function getAvailablePracticeExams(userId: string) {
  const papers = await getAccessiblePracticePapers(userId);
  const examMap = new Map<string, { id: string; name: string; shortName: string; isYearBased: boolean }>();

  papers.forEach((paper) => {
    if (!examMap.has(paper.exam.id)) {
      examMap.set(paper.exam.id, {
        id: paper.exam.id,
        name: paper.exam.name,
        shortName: paper.exam.shortName,
        isYearBased: paper.exam.isYearBased,
      });
    }
  });

  return Array.from(examMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAvailablePracticeSubjects(userId: string, examId: string) {
  const papers = await getAccessiblePracticePapers(userId, { examId });
  const subjectMap = new Map<string, { id: string; name: string }>();

  papers.forEach((paper) => {
    if (paper.subject && !subjectMap.has(paper.subject.id)) {
      subjectMap.set(paper.subject.id, {
        id: paper.subject.id,
        name: paper.subject.name,
      });
    }
  });

  return Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAvailablePracticeYears(userId: string, examId: string, subjectId: string) {
  const papers = await getAccessiblePracticePapers(userId, { examId, subjectId });
  return Array.from(new Set(papers.filter((paper) => paper.exam.isYearBased !== false).map((paper) => paper.year).filter((year): year is number => !!year))).sort(
    (a, b) => b - a
  );
}

export async function getAvailablePracticePaperChoices(userId: string, examId: string, subjectId: string) {
  const papers = await getAccessiblePracticePapers(userId, { examId, subjectId });
  return papers
    .filter((paper) => paper.exam.isYearBased === false)
    .map((paper) => ({
      id: paper.id,
      title: paper.paperLabel || paper.title,
      questionCount: paper.questions.length,
      duration: paper.duration || paper.exam.duration || null,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getAvailablePracticeTopics(
  userId: string,
  examId: string,
  subjectId: string,
  year?: number
) {
  const papers = await getAccessiblePracticePapers(userId, {
    examId,
    subjectId,
    ...(year ? { year } : {}),
  });

  const topicMap = new Map<string, { value: string; label: string; count: number }>();

  papers.forEach((paper) => {
    paper.questions.forEach((question: any) => {
      question.tags?.forEach((tag: { id: string; name: string }) => {
        const existing = topicMap.get(tag.name);
        if (existing) {
          existing.count += 1;
        } else {
          topicMap.set(tag.name, {
            value: tag.name,
            label: tag.name,
            count: 1,
          });
        }
      });
    });
  });

  return Array.from(topicMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function resolveStudentTopicPracticeSession(args: {
  userId: string;
  examId: string;
  subjectId: string;
  tags: string[];
  limit?: number;
  year?: number;
}) {
  const papers = await getAccessiblePracticePapers(args.userId, {
    examId: args.examId,
    subjectId: args.subjectId,
    ...(args.year ? { year: args.year } : {}),
  });

  const normalizedTags = args.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  if (normalizedTags.length === 0) {
    return null;
  }

  const matchingQuestions = papers.flatMap((paper) =>
    paper.questions
      .filter((question: any) =>
        question.tags?.some((tag: { name: string }) => normalizedTags.includes(tag.name.toLowerCase()))
      )
      .map((question: any) => ({
        ...question,
        _paper: paper,
      }))
  );

  const uniqueQuestions = new Map<string, (typeof matchingQuestions)[number]>();
  matchingQuestions.forEach((question) => {
    if (!uniqueQuestions.has(question.id)) {
      uniqueQuestions.set(question.id, question);
    }
  });

  const pool = shuffleArray(Array.from(uniqueQuestions.values()));
  const requestedLimit = args.limit && Number.isFinite(args.limit) ? Math.max(1, Math.min(args.limit, 100)) : 20;
  const selectedQuestions = pool.slice(0, requestedLimit);

  if (selectedQuestions.length === 0) {
    return null;
  }

  const primaryPaper = selectedQuestions[0]._paper;

  return {
    exam: primaryPaper.exam,
    subject: primaryPaper.subject,
    year: args.year ?? primaryPaper.year ?? new Date().getFullYear(),
    duration:
      primaryPaper.duration ||
      primaryPaper.examination?.duration ||
      primaryPaper.exam.duration ||
      60,
    tags: normalizedTags,
    questions: selectedQuestions.map((question) => ({
      id: question.id,
      text: question.text,
      year: question.year ?? args.year ?? new Date().getFullYear(),
      type: question.type,
      imageUrl: question.imageUrl,
      sectionId: question.sectionId,
      section: question.section
        ? {
            instruction: question.section.instruction,
            passage: question.section.passage,
          }
        : null,
      options: question.options.map((option: any) => ({
        id: option.id,
        text: option.text,
      })),
    })),
  };
}

export async function resolveStudentPracticePaperByPaperId(userId: string, paperId: string) {
  const papers = await getAccessiblePracticePapers(userId);
  return papers.find((paper) => paper.id === paperId) || null;
}

export async function resolveStudentPracticePaperByIds(
  userId: string,
  examId: string,
  subjectId: string,
  year: number
) {
  const papers = await getAccessiblePracticePapers(userId, { examId, subjectId, year });
  return papers[0] || null;
}

export async function resolveStudentPracticePaperBySlug(
  userId: string,
  examSlug: string,
  subjectSlug: string,
  year: number
) {
  const exam = await prisma.exam.findFirst({
    where: { shortName: { equals: examSlug, mode: 'insensitive' } },
  });

  if (!exam) return null;

  const subject = await prisma.subject.findFirst({
    where: {
      name: { equals: subjectSlug.replace(/-/g, ' '), mode: 'insensitive' },
    },
  });

  if (!subject) return null;

  return resolveStudentPracticePaperByIds(userId, exam.id, subject.id, year);
}
