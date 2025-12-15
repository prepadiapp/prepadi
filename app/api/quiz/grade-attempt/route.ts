import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { gradeTheoryAnswer } from '@/lib/ai';
import { AttemptStatus } from '@prisma/client';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { attemptId } = await request.json();

    // 1. Fetch attempt with ungraded theory questions
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId, userId: session.user.id },
      include: {
        userAnswers: {
          where: { isCorrect: null }, // Only fetch where grading is pending
          include: { question: true }
        }
      }
    });

    if (!attempt) return new NextResponse('Attempt not found', { status: 404 });
    
    // If no ungraded questions exist, mark as completed if not already
    if (attempt.userAnswers.length === 0) {
        if (attempt.status !== AttemptStatus.COMPLETED) {
            await prisma.quizAttempt.update({
                where: { id: attemptId },
                data: { status: AttemptStatus.COMPLETED }
            });
        }
        return NextResponse.json({ success: true, message: 'Already graded' });
    }

    // 2. Grade pending questions in parallel
    const gradingPromises = attempt.userAnswers.map(async (ua) => {
        // Fallback for empty answers
        const studentAnswer = ua.textAnswer && ua.textAnswer.trim().length > 0 
            ? ua.textAnswer 
            : "No answer provided";

        const result = await gradeTheoryAnswer(
            ua.question.text,
            studentAnswer,
            ua.question.markingGuide || "Grade based on general knowledge of the subject context."
        );

        // Update the specific UserAnswer
        await prisma.userAnswer.update({
            where: { id: ua.id },
            data: {
                isCorrect: result.isCorrect,
                score: result.score,
                aiFeedback: result.feedback
            }
        });
    });

    await Promise.all(gradingPromises);

    // 3. Recalculate Final Score
    // We fetch the attempt again to get ALL answers (both objective and newly graded theory)
    const freshAttempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        include: { userAnswers: true }
    });

    if (!freshAttempt) throw new Error("Failed to reload attempt");

    let totalPoints = 0;
    let correctCount = 0;

    freshAttempt.userAnswers.forEach(ua => {
        // Objective questions: isCorrect=true -> 100pts, false -> 0pts
        // Theory questions: use the 'score' field (0-100)
        let points = 0;
        
        if (ua.score !== null) {
            points = ua.score;
        } else {
            points = ua.isCorrect ? 100 : 0;
        }

        totalPoints += points;
        
        // Count as "correct" if score >= 50 or isCorrect is true
        if (ua.isCorrect) correctCount++;
    });

    // Average percentage score
    const finalPercentage = Math.round(totalPoints / freshAttempt.total);

    // 4. Update Attempt Status & Score
    await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
            score: finalPercentage,
            correct: correctCount,
            status: AttemptStatus.COMPLETED
        }
    });

    return NextResponse.json({ success: true, score: finalPercentage });

  } catch (error) {
    console.error('[GRADE_ATTEMPT_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}