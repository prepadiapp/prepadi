import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { questionService } from '@/lib/question-service/question-service';
// FIX: Import Question and Section models from Prisma client to define the required type
import { Question, Option, Section } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * A type for the "sanitized" option we send to the client (excludes correct answer info).
 */
type SanitizedOption = Omit<Option, 'isCorrect' | 'questionId' | 'userAnswers'>;

/**
 * The structure of a question object returned by questionService.getQuestions.
 * We must explicitly define the included relations (options and section).
 */
type QuestionWithRelations = Question & {
    options: Option[];
    section: Section | null; // Section is included via the relation
};

/**
 * A type for the "sanitized" question we send to the client.
 */
type SanitizedQuestion = {
  id: string;
  text: string;
  year: number;
  type: string; // 'OBJECTIVE' | 'THEORY'
  imageUrl: string | null;
  sectionId: string | null;
  section?: { instruction: string; passage: string | null } | null;
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
    // FIX: Assert the return type to QuestionWithRelations[] to satisfy the compiler
    const fullQuestions = (await questionService.getQuestions(
      examId,
      subjectId,
      Number(year)
    )) as QuestionWithRelations[];

    if (fullQuestions.length === 0) {
      return new NextResponse('No questions found for this selection.', {
        status: 404,
      });
    }

    // 4. Sanitize and Map the questions
    const sanitizedQuestions: SanitizedQuestion[] = fullQuestions.map((q) => {
      
      // The type of 'q' now correctly includes 'section' and 'options'
      const sanitizedQuestion: SanitizedQuestion = {
        id: q.id,
        text: q.text,
        year: q.year,
        
        type: q.type,           
        imageUrl: q.imageUrl,   
        sectionId: q.sectionId, 
        
        section: q.section ? {
          instruction: q.section.instruction,
          passage: q.section.passage,
        } : null,

        // We explicitly type 'opt' as 'Option' (from Prisma)
        options: q.options.map((opt: Option) => ({
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