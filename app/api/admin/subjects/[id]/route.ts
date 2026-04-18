import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await prisma.subject.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        apiSlugs: body.apiSlugs !== undefined ? body.apiSlugs || {} : undefined,
        organizationId:
          body.organizationId !== undefined ? body.organizationId || null : undefined,
      },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { questions: true, examPapers: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[ADMIN_SUBJECTS_PATCH_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        _count: { select: { questions: true, examPapers: true } },
      },
    });

    if (!subject) {
      return new NextResponse('Subject not found', { status: 404 });
    }

    if (subject._count.questions > 0 || subject._count.examPapers > 0) {
      return NextResponse.json(
        { error: 'This subject is already in use and cannot be deleted.' },
        { status: 400 }
      );
    }

    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_SUBJECTS_DELETE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
