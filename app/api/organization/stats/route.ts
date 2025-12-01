import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Find the Organization owned by this user
    const org = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
      include: {
        _count: {
          select: {
            members: true,
            questions: true,
          }
        },
        subscription: {
          include: { plan: true }
        }
      }
    });

    if (!org) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    // 2. Calculate Active Students (e.g. logged in last 7 days)
    // We need to query users who are members of this org
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeMembers = await prisma.user.count({
      where: {
        organizationId: org.id,
        lastLogin: { gte: sevenDaysAgo }
      }
    });

    return NextResponse.json({
      totalStudents: org._count.members,
      activeStudents: activeMembers,
      customQuestions: org._count.questions,
      planName: org.subscription?.plan.name || 'No Plan',
      subscriptionStatus: org.subscription?.isActive ? 'Active' : 'Inactive'
    });

  } catch (error) {
    console.error('[ORG_STATS_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}