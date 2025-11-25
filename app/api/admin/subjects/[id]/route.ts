import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * PATCH: Update an existing subject's name
 */
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
    const { name } = body;

    if (!id) return new NextResponse('Missing Subject ID', { status: 400 });
    if (!name) return new NextResponse('Name is required', { status: 400 });

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json(updatedSubject);
  } catch (error) {
    console.error('[SUBJECTS_PATCH_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * DELETE: Delete a subject
 */
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
    if (!id) return new NextResponse('Missing Subject ID', { status: 400 });

    await prisma.subject.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[SUBJECTS_DELETE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}