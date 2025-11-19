import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/client';
import { NextResponse } from 'next/server';

/**
 * A helper function to process signups into daily counts
 * for the last 30 days.
 */
function processSignupData(users: { createdAt: Date }[]) {
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

  // Count the signups
  for (const user of users) {
    if (user.createdAt >= thirtyDaysAgo) {
      const day = user.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const count = dailyCounts.get(day) || 0;
      dailyCounts.set(day, count + 1);
    }
  }

  // Convert map to array and reverse to get chronological order
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

    // 1. Fetch stats in parallel
    const [
      totalUsers,
      totalQuestions,
      totalExams,
      totalSubjects,
      totalAttempts,
      recentUsers,
      allSignups // Fetch all user creation dates for the chart
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.question.count(),
      prisma.exam.count(),
      prisma.subject.count(),
      prisma.quizAttempt.count(),
      prisma.user.findMany({ // For "Recent Users" table
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.user.findMany({ // For "Chart Data"
        select: { createdAt: true },
        where: {
          createdAt: {
            // Only fetch signups from the last 30 days
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          }
        }
      })
    ]);

    // 2. Process data
    const stats = {
      totalUsers,
      totalQuestions,
      totalExams,
      totalSubjects,
      totalAttempts,
    };
    
    // Process the signup data for the chart
    const chartData = processSignupData(allSignups);

    // 3. Return response
    return NextResponse.json({
      stats,
      recentUsers,
      chartData, // Send the new chart data
    });

  } catch (error) {
    console.error('[ADMIN_STATS_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}