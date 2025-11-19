import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/enums';
import { NextResponse } from 'next/server';

/**
 * GET: Fetch all subjects
 */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            // We only count "general" questions (not org-specific)
            questions: { where: { organizationId: null } },
          },
        },
      },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    console.error('[SUBJECTS_GET_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST: Create a new subject
 */
export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return new NextResponse('Name is required', { status: 400 });
    }

    const newSubject = await prisma.subject.create({
      data: { name },
    });
    return NextResponse.json(newSubject);
  } catch (error) {
    console.error('[SUBJECTS_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}