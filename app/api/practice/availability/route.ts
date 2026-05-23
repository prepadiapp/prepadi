import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import {
  getAvailablePracticeExams,
  getAvailablePracticePaperChoices,
  getAvailablePracticeSubjects,
  getAvailablePracticeTopics,
  getAvailablePracticeYears,
} from '@/lib/student-practice';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    const yearParam = searchParams.get('year');
    const year = yearParam ? Number(yearParam) : undefined;

    if (!examId) {
      const exams = await getAvailablePracticeExams(session.user.id);
      return NextResponse.json({ exams });
    }

    if (!subjectId) {
      const subjects = await getAvailablePracticeSubjects(session.user.id, examId);
      return NextResponse.json({ subjects });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { isYearBased: true } });
    if (exam?.isYearBased === false) {
      const papers = await getAvailablePracticePaperChoices(session.user.id, examId, subjectId);
      const topics = await getAvailablePracticeTopics(session.user.id, examId, subjectId);
      return NextResponse.json({ isYearBased: false, papers, years: [], topics });
    }

    const years = await getAvailablePracticeYears(session.user.id, examId, subjectId);
    const topics = await getAvailablePracticeTopics(session.user.id, examId, subjectId, year);
    return NextResponse.json({ isYearBased: true, years, papers: [], topics });
  } catch (error) {
    console.error('[PRACTICE_AVAILABILITY_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
