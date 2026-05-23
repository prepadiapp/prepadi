import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const papers = await prisma.examPaper.findMany({
      where: {
        organizationId: null,
        year: { not: null },
      },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });

    const years = papers
      .map((paper) => paper.year)
      .filter((year): year is number => year !== null);

    return NextResponse.json({ years });
  } catch (error) {
    console.error('[ADMIN_PLAN_AVAILABLE_YEARS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
