import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/organization';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse('Organization not found', { status: 404 });

  const subjects = await prisma.subject.findMany({
    where: { organizationId: org.organizationId },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          questions: true,
          examPapers: true,
        },
      },
    },
  });

  return NextResponse.json(subjects);
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse('Organization not found', { status: 404 });

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) return new NextResponse('Subject name is required', { status: 400 });

  const existing = await prisma.subject.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      organizationId: org.organizationId,
    },
  });

  if (existing) {
    return new NextResponse('You already created this subject', { status: 409 });
  }

  const subject = await prisma.subject.create({
    data: {
      name,
      organizationId: org.organizationId,
    },
  });

  return NextResponse.json(subject);
}

export async function DELETE(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse('Organization not found', { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return new NextResponse('Subject ID is required', { status: 400 });

  const subject = await prisma.subject.findFirst({
    where: {
      id,
      organizationId: org.organizationId,
    },
    include: {
      _count: {
        select: {
          questions: true,
          examPapers: true,
        },
      },
    },
  });

  if (!subject) return new NextResponse('Subject not found', { status: 404 });

  if (subject._count.questions > 0 || subject._count.examPapers > 0) {
    return new NextResponse('This subject is already in use and cannot be deleted.', { status: 400 });
  }

  await prisma.subject.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
