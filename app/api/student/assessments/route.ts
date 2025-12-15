import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { organizationId: true }
    });

    if (!user?.organizationId) {
        return NextResponse.json([]); 
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'ACTIVE' 
      },
      include: {
        paper: { select: { title: true, subject: { select: { name: true } } } },
        results: {
            where: { userId: session.user.id },
            select: { 
                id: true, 
                score: true,
                status: true // Now valid with schema update
            }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const now = new Date();
    const formatted = assignments.map(a => {
        const attempt = a.results[0];
        const isTaken = !!attempt;
        // Use strict status check
        const isCompleted = isTaken && attempt.status === 'COMPLETED'; 
        
        const isActive = now >= a.startTime && now <= a.endTime;
        const isMissed = now > a.endTime && !isCompleted;

        let uiStatus = 'UPCOMING';
        if (isCompleted) uiStatus = 'COMPLETED';
        else if (isMissed) uiStatus = 'MISSED';
        else if (isActive) uiStatus = 'ACTIVE';
        // If started but not completed and time passed? Handled by isMissed logic above partially
        // or could add 'IN_PROGRESS' if we want to allow re-entry.

        return {
            ...a,
            uiStatus,
            score: isCompleted ? attempt.score : null
        };
    });

    return NextResponse.json(formatted);

  } catch (error) {
    console.error('[STUDENT_ASSESSMENTS]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}