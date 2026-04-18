import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { questionService } from '@/lib/question-service/question-service';

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

    const years = await questionService.getAvailableYears(examId, subjectId);
    return NextResponse.json({ years });
  } catch (error) {
    console.error('[ADMIN_AVAILABLE_YEARS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
