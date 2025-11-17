import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { questionService } from '@/lib/question-service/question-service';

// This API route fetches the available years for a given exam and subject
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');

    if (!examId || !subjectId) {
      return new NextResponse('Missing examId or subjectId', { status: 400 });
    }

    // Instead of querying Prisma directly, we call our service.
    // The service will check Prisma *and* all external adapters.
    const years = await questionService.getAvailableYears(examId, subjectId);
    
    return NextResponse.json(years);

  } catch (error) {
    console.error('[YEARS_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}