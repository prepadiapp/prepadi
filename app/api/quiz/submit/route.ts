import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { AttemptStatus } from '@prisma/client';

interface SubmitQuizBody {
  answers: [string, string][]; // An array of [questionId, value]. Value is OptionID (Obj) or Text (Theory)
  questionIds: string[];
  timeTaken: number;
  assignmentId?: string;
  paperId?: string; // Optional paper context
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body: SubmitQuizBody = await request.json();
    const { answers: clientAnswers, questionIds, timeTaken, assignmentId } = body;
    const answersMap = new Map(clientAnswers);

    // 1. Fetch questions to grade/store
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: {
        options: { select: { id: true, isCorrect: true } },
        subject: true,
        exam: true,
      },
    });

    if (questions.length === 0) {
      return new NextResponse('Invalid questions', { status: 400 });
    }

    // 2. Process Answers
    let correctCount = 0;
    let totalScoreAccumulator = 0;
    let hasTheory = false;
    const userAnswersData = [];

    for (const question of questions) {
      const answerValue = answersMap.get(question.id);

      if (question.type === 'THEORY') {
        hasTheory = true;
        // For theory, we store the text but leave isCorrect/score NULL for now
        // The grade-attempt API will handle this later
        userAnswersData.push({
            questionId: question.id,
            textAnswer: answerValue || '',
            isCorrect: null, 
            score: null
        });
      } else {
        // OBJECTIVE
        const correctOption = question.options.find((opt) => opt.isCorrect);
        const isCorrect = correctOption && answerValue === correctOption.id;
        
        if (isCorrect) {
            correctCount++;
            totalScoreAccumulator += 100; // 100 points for correct objective
        }

        userAnswersData.push({
          questionId: question.id,
          selectedOptionId: answerValue || null,
          isCorrect: isCorrect || false,
          score: isCorrect ? 100 : 0
        });
      }
    }

    // 3. Determine Initial State
    const initialScore = Math.round((totalScoreAccumulator / questions.length));
    const status = hasTheory ? AttemptStatus.IN_PROGRESS : AttemptStatus.COMPLETED;

    const { examId, subjectId, year } = questions[0];
    
    // Safety check: Subject ID is required for Attempt, but optional on Question.
    // If Question has no subject, we must fail or fallback (depending on your logic).
    // Assuming here we fallback to a known default or throw error if data is inconsistent.
    if (!subjectId) {
        return new NextResponse('Question data error: Missing Subject ID', { status: 400 });
    }

    // 4. Save Attempt
    const newAttempt = await prisma.quizAttempt.create({
      data: {
        score: initialScore,
        correct: correctCount,
        total: questions.length,
        timeTaken,
        year: year || new Date().getFullYear(),
        userId: session.user.id,
        examId,
        subjectId: subjectId, // Now guaranteed to be string
        assignmentId,
        status,
        userAnswers: {
          create: userAnswersData,
        },
      },
    });

    return NextResponse.json({ attemptId: newAttempt.id, status });

  } catch (error) {
    console.error('[QUIZ_SUBMIT_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}