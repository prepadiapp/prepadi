import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// This API route fetches subjects for a specific exam
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      return new NextResponse('Missing examId', { status: 400 });
    }

    // Find the exam and include its related subjects
    const examWithSubjects = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subjects: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!examWithSubjects) {
      return new NextResponse('Exam not found', { status: 404 });
    }

    return NextResponse.json(examWithSubjects.subjects);
  } catch (error) {
    console.error('[SUBJECTS_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}