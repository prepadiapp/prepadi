import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { ContentStatus, Prisma, UserRole } from '@prisma/client';

function toNullableString(value: string | null) {
  return value && value !== 'all' ? value : undefined;
}

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ownerType = toNullableString(searchParams.get('ownerType'));
    const organizationId = toNullableString(searchParams.get('organizationId'));
    const status = toNullableString(searchParams.get('status')) as ContentStatus | undefined;
    const examId = toNullableString(searchParams.get('examId'));
    const subjectId = toNullableString(searchParams.get('subjectId'));
    const examinationId = toNullableString(searchParams.get('examinationId'));
    const year = toNullableString(searchParams.get('year'));
    const q = toNullableString(searchParams.get('q'));
    const isVerified = toNullableString(searchParams.get('isVerified'));
    const randomizeQuestions = toNullableString(searchParams.get('randomizeQuestions'));

    const where: Prisma.ExamPaperWhereInput = {};

    if (ownerType === 'PLATFORM') where.organizationId = null;
    if (ownerType === 'ORGANIZATION') where.organizationId = { not: null };
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;
    if (examId) where.examId = examId;
    if (subjectId) where.subjectId = subjectId;
    if (examinationId) where.examinationId = examinationId;
    if (year) {
      if (year === 'none') where.year = null;
      else where.year = Number(year);
    }
    if (isVerified) where.isVerified = isVerified === 'true';
    if (randomizeQuestions) where.randomizeQuestions = randomizeQuestions === 'true';
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { paperLabel: { contains: q, mode: 'insensitive' } },
      ];
    }

    const papers = await prisma.examPaper.findMany({
      where,
      include: {
        exam: true,
        subject: true,
        organization: { select: { id: true, name: true } },
        examination: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            year: true,
          },
        },
        questions: {
          select: { id: true, isFlagged: true },
        },
        author: { select: { name: true, email: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const formatted = papers.map((paper) => ({
      ...paper,
      ownerType: paper.organizationId ? 'ORGANIZATION' : 'PLATFORM',
      questionCount: paper.questions.length,
      flaggedQuestionCount: paper.questions.filter((question) => question.isFlagged).length,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('[ADMIN_PAPERS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
