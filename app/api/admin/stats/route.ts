import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * Helper: Process daily signup data for the chart
 */
function processSignupChart(users: { createdAt: Date }[]) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyCounts = new Map<string, number>();
  
  // Init map
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyCounts.set(day, 0);
  }

  // Fill map
  for (const user of users) {
    if (user.createdAt >= thirtyDaysAgo) {
      const day = user.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    }
  }

  return Array.from(dailyCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .reverse();
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // --- Date Windows ---
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // --- HUGE PARALLEL QUERY ---
    const [
      // 1. Basic Totals (The "Old" Stats)
      totalUsers,
      totalQuestions,
      totalExams,
      totalSubjects,
      totalAttempts,
      
      // 2. Advanced Metrics Data
      logins24h,      // Users active in last 24h
      examTimeAgg,    // Global average time taken
      
      // 3. Engagement Data (For "X people spent Y minutes")
      recentEngagement,
      
      // 4. Chart & List Data
      recentSignups,  // For the "Recent Users" table
      allSignups30d   // For the "User Activity" chart
    ] = await prisma.$transaction([
      // --- Basic ---
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.question.count(),
      prisma.exam.count(),
      prisma.subject.count(),
      prisma.quizAttempt.count(),

      // --- Advanced ---
      prisma.user.count({
        where: { lastLogin: { gte: twentyFourHoursAgo } }
      }),
      prisma.quizAttempt.aggregate({
        _avg: { timeTaken: true },
      }),
      prisma.quizAttempt.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { userId: true, timeTaken: true }
      }),

      // --- Lists/Charts ---
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    // --- CALCULATIONS ---

    // Metric: Average Exams per User
    const avgExamsPerUser = totalUsers > 0 
      ? (totalAttempts / totalUsers).toFixed(1) 
      : "0";

    // Metric: Average Time Taken per Exam (Global)
    const avgExamTimeMinutes = examTimeAgg._avg.timeTaken 
      ? Math.round(examTimeAgg._avg.timeTaken / 60) 
      : 0;

    // Metric: Engagement (7 Days)
    const uniqueActiveUsers = new Set(recentEngagement.map(a => a.userId)).size;
    const totalTimeSeconds7Days = recentEngagement.reduce((sum, a) => sum + a.timeTaken, 0);
    const avgDailyMinutes = uniqueActiveUsers > 0
      ? Math.round((totalTimeSeconds7Days / 60) / (uniqueActiveUsers * 7))
      : 0;

    // Process Chart
    const chartData = processSignupChart(allSignups30d);

    return NextResponse.json({
      // The New "Priority" Metrics
      insights: {
        logins24h,
        avgExamsPerUser,
        avgExamTimeMinutes,
        weeklyActiveUsers: uniqueActiveUsers,
        weeklyAvgDailyMinutes: avgDailyMinutes,
      },
      // The Old "Platform Health" Metrics
      totals: {
        totalUsers,
        totalQuestions,
        totalExams,
        totalSubjects,
        totalAttempts,
      },
      // Tables and Charts
      recentUsers: recentSignups,
      chartData: chartData,
    });

  } catch (error) {
    console.error('[ADMIN_STATS_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}