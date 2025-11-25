import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Exam, Subject } from '@prisma/client';

interface SubmitQuizBody {
  answers: [string, string][]; // An array of [questionId, optionId]
  questionIds: string[];
  timeTaken: number;
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body: SubmitQuizBody = await request.json();
    const { answers: clientAnswers, questionIds, timeTaken } = body;
    const answersMap = new Map(clientAnswers);

    // 1. Fetch the "grading key"
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

    // 2. Grade the quiz and prepare the data for the new table
    let correctCount = 0;
    const userAnswersData = []; // This will hold data for the UserAnswer model

    for (const question of questions) {
      const correctOption = question.options.find((opt) => opt.isCorrect);
      const userAnswerId = answersMap.get(question.id);
      let isAnswerCorrect = false;

      if (correctOption && userAnswerId === correctOption.id) {
        correctCount++;
        isAnswerCorrect = true;
      }
      
      userAnswersData.push({
        questionId: question.id,
        selectedOptionId: userAnswerId || null,
        isCorrect: isAnswerCorrect,
      });
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const { examId, subjectId, year } = questions[0];

    // 3. Use a transaction to save everything at once
    const newAttempt = await prisma.quizAttempt.create({
      data: {
        score,
        correct: correctCount,
        total: questions.length,
        timeTaken,
        year,
        userId: session.user.id,
        examId: examId,
        subjectId: subjectId,
        // This is the magic: create all UserAnswer records
        // and link them to this new attempt
        userAnswers: {
          create: userAnswersData.map(answer => ({
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
            isCorrect: answer.isCorrect,
          })),
        },
      },
    });

    // 4. Return the new attempt ID
    return NextResponse.json({ attemptId: newAttempt.id });

  } catch (error) {
    console.error('[QUIZ_SUBMIT_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}