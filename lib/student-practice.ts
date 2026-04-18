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
  const { orgId, selectedExamIds } = getOrgContext(user);

  const globalWhere: Prisma.ExamPaperWhereInput = {
    organizationId: null,
    status: ContentStatus.PUBLISHED,
    ...(filters?.examId ? { examId: filters.examId } : {}),
    ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    ...(filters?.year ? { year: filters.year } : {}),
  };

  if (allowedExamIds && allowedExamIds.length > 0) {
    if (filters?.examId) {
      if (!allowedExamIds.includes(filters.examId)) {
        globalWhere.id = '__none__';
      } else {
        globalWhere.examId = filters.examId;
      }
    } else {
      globalWhere.examId = { in: allowedExamIds };
    }
  } else if (allowedExamIds && allowedExamIds.length === 0) {
    globalWhere.id = '__none__';
  }

  if (allowedSubjectIds && allowedSubjectIds.length > 0) {
    if (filters?.subjectId) {
      if (!allowedSubjectIds.includes(filters.subjectId)) {
        globalWhere.id = '__none__';
      } else {
        globalWhere.subjectId = filters.subjectId;
      }
    } else {
      globalWhere.subjectId = { in: allowedSubjectIds };
    }
  } else if (allowedSubjectIds && allowedSubjectIds.length === 0) {
    globalWhere.id = '__none__';
  }

  if (allowedYears && allowedYears.length > 0) {
    const years = allowedYears.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
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
        include: { options: true, section: true },
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
          include: { options: true, section: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  const [globalPapers, orgPapers] = await Promise.all([globalPromise, orgPromise]);

  const filteredGlobal =
    selectedExamIds.length > 0 ? globalPapers.filter((paper) => selectedExamIds.includes(paper.examId)) : globalPapers;

  return [...orgPapers, ...filteredGlobal].filter(
    (paper) => paper.subjectId && paper.year && paper.questions.length > 0
  );
}

export async function getAvailablePracticeExams(userId: string) {
  const papers = await getAccessiblePracticePapers(userId);
  const examMap = new Map<string, { id: string; name: string; shortName: string }>();

  papers.forEach((paper) => {
    if (!examMap.has(paper.exam.id)) {
      examMap.set(paper.exam.id, {
        id: paper.exam.id,
        name: paper.exam.name,
        shortName: paper.exam.shortName,
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
  return Array.from(new Set(papers.map((paper) => paper.year).filter((year): year is number => !!year))).sort(
    (a, b) => b - a
  );
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
