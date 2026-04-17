import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/organization';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse('Organization not found', { status: 404 });

  const students = await prisma.user.findMany({
    where: { organizationId: org.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      lastLogin: true,
      _count: {
        select: { quizAttempts: true },
      },
      quizAttempts: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          score: true,
          createdAt: true,
          subject: { select: { name: true } },
          exam: { select: { shortName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = students.map((student) => {
    const scores = student.quizAttempts.map((attempt) => attempt.score);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const avgScore = scores.length > 0 ? Math.round(totalScore / scores.length) : null;
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      lastLogin: student.lastLogin,
      avgScore,
      bestScore,
      recentAttempts: student.quizAttempts,
      attempts: student._count.quizAttempts,
    };
  });

  return NextResponse.json(formatted);
}
