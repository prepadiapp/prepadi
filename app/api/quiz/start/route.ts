import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { resolveStudentPracticePaperByIds } from '@/lib/student-practice';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { examId, subjectId, year } = body;

    if (!examId || !subjectId || !year) {
      return new NextResponse('Missing practice selection', { status: 400 });
    }

    const paper = await resolveStudentPracticePaperByIds(
      session.user.id,
      examId,
      subjectId,
      parseInt(year, 10)
    );

    if (!paper || paper.questions.length === 0) {
      return new NextResponse('No questions found matching criteria', { status: 404 });
    }

    const sanitizedQuestions = paper.questions.map((q: any) => ({
      id: q.id,
      text: q.text,
      year: q.year || new Date().getFullYear(),
      type: q.type,
      imageUrl: q.imageUrl,
      sectionId: q.sectionId,
      section: q.section
        ? {
            instruction: q.section.instruction,
            passage: q.section.passage,
          }
        : undefined,
      options: q.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
      })),
    }));

    return NextResponse.json({ questions: sanitizedQuestions });
  } catch (error) {
    console.error('[QUIZ_START_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
