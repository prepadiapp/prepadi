import { getAuthSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { resolveStudentPracticePaperByIds, resolveStudentPracticePaperByPaperId } from '@/lib/student-practice';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { examId, subjectId, year, paperId } = await req.json();

    if (paperId) {
      const paper = await resolveStudentPracticePaperByPaperId(session.user.id, paperId);
      if (!paper || paper.questions.length === 0) {
        return new NextResponse('No questions found for this exam', { status: 404 });
      }

      return NextResponse.json({
        id: paper.id,
        title: paper.title,
        examName: paper.exam.name,
        subjectName: paper.subject?.name || 'General',
        year: paper.year || new Date().getFullYear(),
        duration: paper.duration || paper.exam.duration || 60,
        questions: paper.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options,
          section: q.section ? { instruction: q.section.instruction, passage: q.section.passage } : null,
          imageUrl: q.imageUrl
        }))
      });
    }

    if (!examId || !subjectId || !year) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    const paper = await resolveStudentPracticePaperByIds(
      session.user.id,
      examId,
      subjectId,
      parseInt(year)
    );

    if (!paper || paper.questions.length === 0) {
      return new NextResponse('No questions found for this exam', { status: 404 });
    }

    // Format for offline storage
    const offlineData = {
      id: paper.id,
      title: paper.title,
      examName: paper.exam.name,
      subjectName: paper.subject?.name || 'General',
      year: parseInt(year),
      duration: paper.duration || paper.exam.duration || 60,
      questions: paper.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        section: q.section ? { instruction: q.section.instruction, passage: q.section.passage } : null,
        imageUrl: q.imageUrl
      }))
    };

    return NextResponse.json(offlineData);

  } catch (error) {
    console.error('[DOWNLOAD_API_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
