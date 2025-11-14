import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// This API route fetches the available years for a given exam and subject
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');

    if (!examId || !subjectId) {
      return new NextResponse('Missing examId or subjectId', { status: 400 });
    }

    // Find all distinct years for questions matching the exam and subject
    const distinctYears = await prisma.question.findMany({
      where: {
        examId,
        subjectId,
      },
      select: {
        year: true,
      },
      distinct: ['year'],
      orderBy: {
        year: 'desc',
      },
    });

    // The result is an array of objects like [{ year: 2023 }, { year: 2022 }]
    // Let's map it to a simple array of numbers: [2023, 2022]
    const years = distinctYears.map((q) => q.year);

    return NextResponse.json(years);
  } catch (error) {
    console.error('[YEARS_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}