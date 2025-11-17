import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { questionService } from '@/lib/question-service/question-service';
import { Question, Option } from '@/lib/generated/prisma'; // <-- Corrected path
import { NextResponse } from 'next/server';

/**
 * A type for the "sanitized" question we send to the client.
 * Notice it does NOT include `isCorrect` or `explanation`.
 */
type SanitizedOption = Omit<Option, 'isCorrect' | 'questionId'>;
type SanitizedQuestion = Omit<Question, 'explanation' | 'sourceApi' | 'subjectId' | 'examId'> & {
  options: SanitizedOption[];
};

/**
 * This API route is called when a user clicks "Start Exam".
 * It fetches questions, sanitizes them, and sends them to the client.
 */
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

    // 3. Call the QuestionService to get the questions
    // This is the "brain" we built in Part 2. It handles all the logic
    // of checking the DB, calling APIs, and caching.
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

    // 4. CRITICAL: Sanitize the questions before sending to the client
    // We must remove all correct answers and explanations.
    const sanitizedQuestions: SanitizedQuestion[] = fullQuestions.map((q) => {
      // Create a new object for the question
      const sanitizedQuestion: SanitizedQuestion = {
        id: q.id,
        text: q.text,
        year: q.year,
        // Sanitize the options
        options: q.options.map((opt) => {
          const sanitizedOption: SanitizedOption = {
            id: opt.id,
            text: opt.text,
          };
          return sanitizedOption;
        }),
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