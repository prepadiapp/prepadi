import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { examId, subjectId, year } = await req.json();

    if (!examId || !subjectId || !year) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // Fetch questions
    const questions = await prisma.question.findMany({
      where: {
        examId,
        subjectId: subjectId === 'all' ? undefined : subjectId,
        year: parseInt(year),
      },
      include: {
        options: {
          select: { id: true, text: true, isCorrect: true } 
        },
        section: true,
      },
      orderBy: { order: 'asc' }
    });

    if (questions.length === 0) {
      return new NextResponse('No questions found for this exam', { status: 404 });
    }

    // Deduplicate by text to handle DB messiness
    const uniqueQuestions = [];
    const seenTexts = new Set();

    for (const q of questions) {
        // Create a unique key based on text and type to be safe
        const key = `${q.text}-${q.type}`;
        if (!seenTexts.has(key)) {
            seenTexts.add(key);
            uniqueQuestions.push(q);
        }
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { name: true } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { name: true } });

    // Format for offline storage
    const offlineData = {
      id: `${examId}-${subjectId}-${year}`,
      title: `${exam?.name} ${subject?.name || 'General'} ${year}`,
      examName: exam?.name,
      subjectName: subject?.name || 'General',
      year: parseInt(year),
      duration: 60, 
      questions: uniqueQuestions.map(q => ({
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