import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
      include: {
        _count: {
          select: {
            members: true,
            questions: true,
            assignments: true,
            examinations: true,
          },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!org) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [activeMembers, draftExaminations, publishedExaminations] = await Promise.all([
      prisma.user.count({
        where: {
          organizationId: org.id,
          lastLogin: { gte: sevenDaysAgo },
        },
      }),
      prisma.organizationExamination.count({
        where: { organizationId: org.id, status: 'DRAFT' },
      }),
      prisma.organizationExamination.count({
        where: { organizationId: org.id, status: 'PUBLISHED' },
      }),
    ]);

    return NextResponse.json({
      totalStudents: org._count.members,
      activeStudents: activeMembers,
      customQuestions: org._count.questions,
      totalAssignments: org._count.assignments,
      totalExaminations: org._count.examinations,
      draftExaminations,
      publishedExaminations,
      planName: org.subscription?.plan.name || 'No Plan',
      subscriptionStatus: org.subscription?.isActive ? 'Active' : 'Inactive',
    });
  } catch (error) {
    console.error('[ORG_STATS_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
