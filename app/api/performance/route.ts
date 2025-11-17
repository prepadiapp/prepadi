import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { UserRole } from '@/lib/generated/prisma';
/**
 * This is our main Performance API. It fetches all data and
 * processes it on the server to send a clean report to the client.
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // --- 1. Fetch all attempts for the user ---
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
        exam: true,
      },
    });

    if (attempts.length === 0) {
      return NextResponse.json({
        stats: {
          avgScore: 0,
          bestScore: 0,
          totalAttempts: 0,
          avgTimePerQuestion: 0,
        },
        scoreTrend: [],
        subjectPerformance: [],
        history: [],
      });
    }

    // --- 2. Calculate Top-Level Stats (for the 4 cards) ---
    const totalAttempts = attempts.length;
    const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
    const avgScore = Math.round(totalScore / totalAttempts);
    const bestScore = Math.max(...attempts.map(a => a.score));
    
    const totalTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0);
    const totalQuestions = attempts.reduce((sum, a) => sum + a.total, 0);
    const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;

    const stats = {
      avgScore,
      bestScore,
      totalAttempts,
      avgTimePerQuestion, // PRD: "Avg. time per question"
    };

    // --- 3. Process Score Trend (for the Line Chart) ---
    const scoreTrend = attempts.map(a => ({
      name: a.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: a.score,
    })).reverse(); // Show oldest to newest

    // --- 4. Process Subject Performance (for the Bar Chart / "Weak Areas") ---
    const subjectMap = new Map<string, { totalScore: number, count: number, name: string }>();
    for (const attempt of attempts) {
      const subject = subjectMap.get(attempt.subject.name) || {
        totalScore: 0,
        count: 0,
        name: attempt.subject.name,
      };
      subject.totalScore += attempt.score;
      subject.count++;
      subjectMap.set(attempt.subject.name, subject);
    }
    
    const subjectPerformance = Array.from(subjectMap.values()).map(s => ({
      name: s.name,
      avgScore: Math.round(s.totalScore / s.count),
    })).sort((a, b) => a.avgScore - b.avgScore); // Show lowest first

    // --- 5. Format History (for the Table) ---
    const history = attempts.map(a => ({
      id: a.id,
      exam: a.exam.shortName,
      subject: a.subject.name,
      score: a.score,
      correct: a.correct,
      total: a.total,
      timeTaken: `${Math.floor(a.timeTaken / 60)}m ${a.timeTaken % 60}s`,
      date: a.createdAt.toISOString(),
    }));

    // --- 6. Send the full report ---
    return NextResponse.json({
      stats,
      scoreTrend,
      subjectPerformance,
      history,
    });

  } catch (error) {
    console.error('[PERFORMANCE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}