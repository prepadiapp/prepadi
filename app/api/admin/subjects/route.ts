import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma, UserRole } from '@prisma/client';
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
    const q = toNullableString(searchParams.get('q'));

    const where: Prisma.SubjectWhereInput = {};

    if (ownerType === 'PLATFORM') where.organizationId = null;
    if (ownerType === 'ORGANIZATION') where.organizationId = { not: null };
    if (organizationId) where.organizationId = organizationId;
    if (q) where.name = { contains: q, mode: 'insensitive' };

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            questions: true,
            examPapers: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    const payload = subjects.map((subject) => ({
      ...subject,
      ownerType: subject.organizationId ? 'ORGANIZATION' : 'PLATFORM',
      usageCount: subject._count.questions + subject._count.examPapers,
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[ADMIN_SUBJECTS_GET_API_ERROR]', error);
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
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        apiSlugs: body.apiSlugs || {},
        organizationId: body.organizationId || null,
      },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { questions: true, examPapers: true } },
      },
    });

    return NextResponse.json(subject);
  } catch (error) {
    console.error('[ADMIN_SUBJECTS_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
