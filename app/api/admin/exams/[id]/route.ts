import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/enums'; 
import { NextResponse } from 'next/server';


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
    const { name, shortName, description } = body;

    if (!id) {
      return new NextResponse('Missing Exam ID', { status: 400 });
    }
    if (!name || !shortName) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const updatedExam = await prisma.exam.update({
      where: { id: id }, // This will now be a valid string
      data: {
        name,
        shortName: shortName.toUpperCase(),
        description,
      },
    });
    return NextResponse.json(updatedExam);
  } catch (error) {
    console.error('[EXAMS_PATCH_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * DELETE: Delete an exam
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
    // We MUST await the promise
    const { id } = await params;

    if (!id) {
      return new NextResponse('Missing Exam ID', { status: 400 });
    }

    await prisma.exam.delete({
      where: { id: id }, 
    });
    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error('[EXAMS_DELETE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}