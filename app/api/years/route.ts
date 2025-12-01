import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { questionService } from '@/lib/question-service/question-service';
import { getAuthSession } from '@/lib/auth';
import { getUserPlanFilters } from '@/lib/access-control';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');

    if (!examId || !subjectId) {
      return new NextResponse('Missing examId or subjectId', { status: 400 });
    }

    // 1. Get all available years from Service
    const years = await questionService.getAvailableYears(examId, subjectId);
    
    // 2. Filter based on Plan
    const { allowedYears } = await getUserPlanFilters(session.user.id);
    
    if (allowedYears && allowedYears.length > 0) {
        // Filter the list
        const filteredYears = years.filter(y => allowedYears.includes(String(y)));
        return NextResponse.json(filteredYears);
    } else if (allowedYears && allowedYears.length === 0) {
        // Plan allows NO years
        return NextResponse.json([]);
    }

    // If allowedYears is undefined, return all
    return NextResponse.json(years);

  } catch (error) {
    console.error('[YEARS_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}