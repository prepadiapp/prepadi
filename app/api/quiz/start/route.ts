import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { questionService } from '@/lib/question-service/question-service';
import { Question, Option, Section } from '@prisma/client';
import { NextResponse } from 'next/server';

type SanitizedOption = Omit<Option, 'isCorrect' | 'questionId' | 'userAnswers'>;

type QuestionWithRelations = Question & {
    options: Option[];
    section: Section | null; 
};

type SanitizedQuestion = {
  id: string;
  text: string;
  year: number;
  type: string; 
  imageUrl: string | null;
  sectionId: string | null;
  section?: { instruction: string; passage: string | null } | null;
  options: SanitizedOption[];
};

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { examId, subjectId, year, tags, limit } = body;

    if (!examId) {
      return new NextResponse('Missing examId', { status: 400 });
    }

    // Call service with flexible params
    const fullQuestions = (await questionService.getQuestions({
        examId,
        subjectId: subjectId === 'all' ? undefined : subjectId,
        year: year === 'random' ? undefined : Number(year),
        tags: tags ? tags.split(',') : undefined,
        limit: limit ? Number(limit) : undefined
    })) as QuestionWithRelations[];

    if (fullQuestions.length === 0) {
      return new NextResponse('No questions found for this selection.', {
        status: 404,
      });
    }

    const sanitizedQuestions: SanitizedQuestion[] = fullQuestions.map((q) => {
      const sanitizedQuestion: SanitizedQuestion = {
        id: q.id,
        text: q.text,
        year: q.year,
        type: q.type,           
        imageUrl: q.imageUrl,   
        sectionId: q.sectionId, 
        
        section: q.section ? {
          instruction: q.section.instruction,
          passage: q.section.passage,
        } : null,

        options: q.options.map((opt: Option) => ({
          id: opt.id,
          text: opt.text,
        })),
      };
      
      return sanitizedQuestion;
    });

    return NextResponse.json(sanitizedQuestions);
    
  } catch (error) {
    console.error('[QUIZ_START_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}