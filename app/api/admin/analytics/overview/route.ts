import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/enums'; 
import { NextResponse } from 'next/server';

/**
 * A helper function to process quiz attempts into daily counts
 * for the last 30 days.
 */
function processAttemptData(attempts: { createdAt: Date }[]) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Initialize a map with 0 counts for the last 30 days
  const dailyCounts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyCounts.set(day, 0);
  }

  // Count the attempts
  for (const attempt of attempts) {
    if (attempt.createdAt >= thirtyDaysAgo) {
      const day = attempt.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = dailyCounts.get(day) || 0;
      dailyCounts.set(day, count + 1);
    }
  }

  // Convert map to array and reverse to get chronological order
  return Array.from(dailyCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .reverse();
}

/**
 * GET: Fetches aggregate analytics for the User Analytics page
 */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Fetch data in parallel
    const [
      totalStudents,
      totalOrgs,
      totalAttempts,
      recentAttempts, // For the main chart
      avgScoreData
    ] = await prisma.$transaction([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'ORGANIZATION' } }),
      prisma.quizAttempt.count(),
      prisma.quizAttempt.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.quizAttempt.aggregate({
        _avg: { score: true },
      }),
    ]);
    
    // 2. Process Stats for Cards
    const stats = {
      totalStudents,
      totalOrgs,
      totalAttempts,
      avgScore: avgScoreData._avg.score ? Math.round(avgScoreData._avg.score) : 0,
    };

    // 3. Process Chart Data
    const chartData = processAttemptData(recentAttempts);

    return NextResponse.json({
      stats,
      chartData,
    });

  } catch (error) {
    console.error('[ANALYTICS_OVERVIEW_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}