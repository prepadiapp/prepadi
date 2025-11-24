import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/enums';
import { NextResponse } from 'next/server';

// Helper: Process data for charts
function processChartData(data: { createdAt: Date }[], days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const dailyCounts = new Map<string, number>();

  // Initialize map
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyCounts.set(day, 0);
  }

  // Fill map
  for (const item of data) {
    if (item.createdAt >= cutoffDate) {
      const day = item.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    }
  }

  return Array.from(dailyCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .reverse();
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // --- Date Windows ---
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // --- Parallel Data Fetching ---
    const [
      totalStudents,
      totalOrgs,
      logins24h, // Active Users (24h)
      recentEngagement, // For Weekly Engagement Calc
      recentSignups, // For User Growth Chart
      recentAttempts // For Attempts Chart
    ] = await prisma.$transaction([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'ORGANIZATION' } }),
      prisma.user.count({ where: { lastLogin: { gte: twentyFourHoursAgo } } }),
      
      // Engagement: Attempts in last 7 days
      prisma.quizAttempt.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { userId: true, timeTaken: true }
      }),

      // Growth: Signups in last 30 days
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true }
      }),

      // Activity: Attempts in last 30 days
      prisma.quizAttempt.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true }
      }),
    ]);

    // --- Calculations ---
    
    // 1. Weekly Engagement
    const uniqueActiveUsers = new Set(recentEngagement.map(a => a.userId)).size;
    const totalTimeSeconds = recentEngagement.reduce((sum, a) => sum + a.timeTaken, 0);
    const avgDailyMinutes = uniqueActiveUsers > 0
      ? Math.round((totalTimeSeconds / 60) / (uniqueActiveUsers * 7))
      : 0;

    // 2. Process Charts
    const growthChart = processChartData(recentSignups);
    const attemptsChart = processChartData(recentAttempts);

    return NextResponse.json({
      stats: {
        totalStudents,
        totalOrgs,
        activeUsers24h: logins24h,
        weeklyAvgDailyMinutes: avgDailyMinutes,
        weeklyActiveUsers: uniqueActiveUsers,
      },
      charts: {
        growth: growthChart,
        activity: attemptsChart,
      }
    });

  } catch (error) {
    console.error('[ANALYTICS_OVERVIEW_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}