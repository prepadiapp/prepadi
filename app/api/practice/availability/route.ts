import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import {
  getAvailablePracticeExams,
  getAvailablePracticeSubjects,
  getAvailablePracticeYears,
} from '@/lib/student-practice';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');

    if (!examId) {
      const exams = await getAvailablePracticeExams(session.user.id);
      return NextResponse.json({ exams });
    }

    if (!subjectId) {
      const subjects = await getAvailablePracticeSubjects(session.user.id, examId);
      return NextResponse.json({ subjects });
    }

    const years = await getAvailablePracticeYears(session.user.id, examId, subjectId);
    return NextResponse.json({ years });
  } catch (error) {
    console.error('[PRACTICE_AVAILABILITY_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
