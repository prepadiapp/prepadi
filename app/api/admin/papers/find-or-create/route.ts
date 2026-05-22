import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { examId, subjectId, year } = body;

    if (!examId || !subjectId || !year) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // 1. Check if Paper already exists
    const existingPaper = await prisma.examPaper.findFirst({
      where: {
        examId,
        subjectId,
        year: parseInt(year),
        // We might want to check for authorId if papers are private to admins, 
        // but typically "Master Papers" are shared. Let's assume global uniqueness for now.
      },
      include: {
        questions: true // Include to check count
      }
    });

    if (existingPaper) {
      return NextResponse.json(existingPaper);
    }

    // External source auto-seeding is intentionally paused. Admins should create
    // papers through bulk upload/manual authoring, then publish when reviewed.
    return NextResponse.json(
      {
        error:
          'External question loading is currently disabled. Use bulk upload or manual authoring to create this paper.',
      },
      { status: 410 }
    );

  } catch (error) {
    console.error('[PAPER_FIND_CREATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
