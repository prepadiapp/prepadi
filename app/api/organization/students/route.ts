import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { ownerId: session.user.id },
  });

  if (!org) return new NextResponse('Organization not found', { status: 404 });

  const students = await prisma.user.findMany({
    where: { organizationId: org.id },
    select: {
      id: true,
      name: true,
      email: true,
      lastLogin: true,
      _count: {
        select: { quizAttempts: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(students);
}