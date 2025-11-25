import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { questionService } from '@/lib/question-service/question-service';
import { Question, Option } from '@prisma/client'
import { NextResponse } from 'next/server';

/**
 * A type for the "sanitized" question we send to the client.
 * We Omit sensitive fields (explanation, sourceApi, correct answers)
 * BUT we keep the fields needed for the UI (type, sectionId, imageUrl).
 */
type SanitizedOption = Omit<Option, 'isCorrect' | 'questionId' | 'userAnswers'>;

// We define the return type explicitly to match what the UI needs
type SanitizedQuestion = {
  id: string;
  text: string;
  year: number;
  type: string; // 'OBJECTIVE' | 'THEORY'
  imageUrl: string | null;
  sectionId: string | null;
  section?: { instruction: string; passage: string | null } | null; // Optional nested section data
  options: SanitizedOption[];
};

export async function POST(request: Request) {
  try {
    // 1. Check for authenticated user
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Validate the request body
    const body = await request.json();
    const { examId, subjectId, year } = body;

    if (!examId || !subjectId || !year) {
      return new NextResponse('Missing examId, subjectId, or year', {
        status: 400,
      });
    }

    // 3. Call the QuestionService
    const fullQuestions = await questionService.getQuestions(
      examId,
      subjectId,
      Number(year)
    );

    if (fullQuestions.length === 0) {
      return new NextResponse('No questions found for this selection.', {
        status: 404,
      });
    }

    // 4. Sanitize and Map the questions
    // This fixes the Type Error by including the new fields
    const sanitizedQuestions: SanitizedQuestion[] = fullQuestions.map((q) => {
      
      const sanitizedQuestion: SanitizedQuestion = {
        id: q.id,
        text: q.text,
        year: q.year,
        
        // --- NEW FIELDS ---
        type: q.type,           // OBJECTIVE or THEORY
        imageUrl: q.imageUrl,   // If it has an image
        sectionId: q.sectionId, // To group questions
        
        // Pass the section details if they exist (for the UI to display instructions)
        // note: 'q' comes from questionService which includes 'section'
        section: q.section ? {
          instruction: q.section.instruction,
          passage: q.section.passage,
        } : null,
        // ------------------

        // Sanitize options
        options: q.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
        })),
      };
      
      return sanitizedQuestion;
    });

    // 5. Return the "safe" questions to the client
    return NextResponse.json(sanitizedQuestions);
    
  } catch (error) {
    console.error('[QUIZ_START_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}