import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');

    if (!examId || !subjectId) {
      return NextResponse.json({ years: [] });
    }

    // External year discovery is paused with external question loading. Return
    // only years already represented by platform-owned papers in the database.
    const localPaperYears = await prisma.examPaper.findMany({
      where: {
        examId,
        subjectId,
        organizationId: null,
        year: { not: null },
      },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });

    const years = localPaperYears
      .map((paper) => paper.year)
      .filter((year): year is number => year !== null);

    return NextResponse.json({ years });
  } catch (error) {
    console.error('[ADMIN_AVAILABLE_YEARS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
