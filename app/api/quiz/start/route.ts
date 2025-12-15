import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { mode, examId, subjectId, year } = body;

    // Build the query filter
    const where: any = {};

    if (examId) where.examId = examId;
    
    // Handle subject filtering (slug vs ID)
    if (subjectId) {
        // Check if it's a slug or ID
        const subject = await prisma.subject.findFirst({
            where: {
                OR: [
                    { id: subjectId },
                    { name: { equals: subjectId, mode: 'insensitive' } } // Fallback for name matching
                ]
            }
        });
        
        if (subject) {
             where.subjectId = subject.id;
        }
    }

    if (year) where.year = parseInt(year);

    // Fetch questions
    const questions = await prisma.question.findMany({
      where,
      take: 20, // Limit for practice mode
      include: {
        options: {
          select: {
            id: true,
            text: true,
          },
        },
        section: true,
      },
      orderBy: {
        createdAt: 'desc', // Randomize later if needed
      }
    });

    if (questions.length === 0) {
        return new NextResponse("No questions found matching criteria", { status: 404 });
    }

    // Transform for frontend
    const sanitizedQuestions = questions.map((q) => ({
      id: q.id,
      text: q.text,
      year: q.year || new Date().getFullYear(), // Fix: Fallback for nullable year
      type: q.type,          
      imageUrl: q.imageUrl,   
      sectionId: q.sectionId,
      section: q.section ? {
        instruction: q.section.instruction,
        passage: q.section.passage
      } : undefined,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
      })),
    }));

    return NextResponse.json({ questions: sanitizedQuestions });
  } catch (error) {
    console.error('[QUIZ_START_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}