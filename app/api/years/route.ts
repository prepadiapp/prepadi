import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getAvailablePracticeYears } from '@/lib/student-practice';

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

    const years = await getAvailablePracticeYears(session.user.id, examId, subjectId);
    return NextResponse.json(years);

  } catch (error) {
    console.error('[YEARS_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
