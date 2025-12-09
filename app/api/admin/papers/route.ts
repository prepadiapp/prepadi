import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const where: any = {};
    if (session.user.role === UserRole.ORGANIZATION && session.user.organizationId) {
        where.organizationId = session.user.organizationId;
    } else {
        where.isPublic = true; // Admin sees public papers
    }

    const papers = await prisma.examPaper.findMany({
      where,
      take: 6, // Limit to recent
      orderBy: { updatedAt: 'desc' },
      include: {
        questions: { select: { id: true } } // Just for count
      }
    });

    return NextResponse.json(papers);
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}