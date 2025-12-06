import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { gradeTheoryAnswer } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { questionId, answer } = await request.json();
    
    // Fetch question details securely
    const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: { text: true, markingGuide: true }
    });

    if (!question) return new NextResponse('Question not found', { status: 404 });

    // Grade it
    const result = await gradeTheoryAnswer(
        question.text, 
        answer, 
        question.markingGuide || "Grade based on general knowledge of the subject."
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Grading Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}