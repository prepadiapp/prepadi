import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  ContentStatus,
  ExaminationCategory,
  Prisma,
  UserRole,
} from '@prisma/client';
import { NextResponse } from 'next/server';

function toNullableString(value: string | null) {
  return value && value !== 'all' ? value : undefined;
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    const ownerType = toNullableString(searchParams.get('ownerType'));
    const organizationId = toNullableString(searchParams.get('organizationId'));
    const category = toNullableString(searchParams.get('category')) as ExaminationCategory | undefined;
    const status = toNullableString(searchParams.get('status')) as ContentStatus | undefined;
    const q = toNullableString(searchParams.get('q'));
    const examId = toNullableString(searchParams.get('examId'));
    const subjectId = toNullableString(searchParams.get('subjectId'));
    const year = toNullableString(searchParams.get('year'));
    const practiceEnabled = toNullableString(searchParams.get('practiceEnabled'));
    const randomizeQuestions = toNullableString(searchParams.get('randomizeQuestions'));

    const where: Prisma.OrganizationExaminationWhereInput = {};

    if (ownerType === 'PLATFORM') where.organizationId = null;
    if (ownerType === 'ORGANIZATION') where.organizationId = { not: null };
    if (organizationId) where.organizationId = organizationId;
    if (category) where.category = category;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (year) {
      if (year === 'none') where.year = null;
      else where.year = Number(year);
    }
    if (practiceEnabled) where.practiceEnabled = practiceEnabled === 'true';
    if (randomizeQuestions) where.randomizeQuestions = randomizeQuestions === 'true';
    if (examId || subjectId) {
      where.papers = {
        some: {
          ...(examId ? { examId } : {}),
          ...(subjectId ? { subjectId } : {}),
        },
      };
    }

    const examinations = await prisma.organizationExamination.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        papers: {
          include: {
            exam: { select: { id: true, name: true, shortName: true } },
            subject: { select: { id: true, name: true } },
            _count: { select: { questions: true } },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    const payload = examinations.map((examination) => {
      const questionCount = examination.papers.reduce(
        (sum, paper) => sum + paper._count.questions,
        0
      );

      return {
        ...examination,
        ownerType: examination.organizationId ? 'ORGANIZATION' : 'PLATFORM',
        questionCount,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[ADMIN_EXAMINATIONS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const examination = await prisma.organizationExamination.create({
      data: {
        title,
        description: body.description?.trim() || null,
        category: (body.category as ExaminationCategory) || ExaminationCategory.CUSTOM,
        year: body.year ? Number(body.year) : null,
        status: (body.status as ContentStatus) || ContentStatus.DRAFT,
        publishedAt:
          body.status === ContentStatus.PUBLISHED ? new Date() : null,
        duration: body.duration ? Number(body.duration) : null,
        randomizeQuestions: Boolean(body.randomizeQuestions),
        allowCustomOrder:
          body.allowCustomOrder !== undefined
            ? Boolean(body.allowCustomOrder)
            : true,
        practiceEnabled: Boolean(body.practiceEnabled),
        authorId: session.user.id,
        organizationId: body.organizationId || null,
      },
      include: {
        organization: { select: { id: true, name: true } },
        papers: { include: { _count: { select: { questions: true } } } },
      },
    });

    return NextResponse.json(examination);
  } catch (error) {
    console.error('[ADMIN_EXAMINATIONS_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
