import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { ContentStatus, ExaminationCategory, UserRole } from '@prisma/client';
import { questionService } from '@/lib/question-service/question-service';
import { Prisma } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { examId, subjectId, year } = body;

    if (!examId || !subjectId || !year) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // 1. Check if Paper already exists
    const existingPaper = await prisma.examPaper.findFirst({
      where: {
        examId,
        subjectId,
        year: parseInt(year),
        // We might want to check for authorId if papers are private to admins, 
        // but typically "Master Papers" are shared. Let's assume global uniqueness for now.
      },
      include: {
        questions: true // Include to check count
      }
    });

    if (existingPaper) {
      return NextResponse.json(existingPaper);
    }

    // 2. Paper doesn't exist -> AUTO-SEEDING SEQUENCE
    
    // A. Fetch Context details for Title generation
    const [exam, subject] = await Promise.all([
      prisma.exam.findUnique({ where: { id: examId } }),
      prisma.subject.findUnique({ where: { id: subjectId } })
    ]);

    if (!exam || !subject) {
      return new NextResponse('Invalid Exam or Subject ID', { status: 400 });
    }

    const paperTitle = `${exam.shortName} ${subject.name} ${year} Paper`;

    // B. Fetch Questions (Local -> External Fallback)
    // This service will check DB first, then hit external APIs, save results to DB, and return them.
    console.log(`[FIND-OR-CREATE] Auto-seeding questions for ${paperTitle}...`);
    
    const seededQuestions = await questionService.getQuestions({
      examId,
      subjectId,
      year: parseInt(year),
    });

    console.log(`[FIND-OR-CREATE] Found ${seededQuestions.length} questions.`);

    // C. Create the Paper and Connect Questions
    const examinationTitle = `${exam.shortName} ${subject.name} ${year}`;
    const existingExamination = await prisma.organizationExamination.findFirst({
      where: {
        organizationId: null,
        title: examinationTitle,
        year: parseInt(year),
      },
    });

    let examinationId: string | undefined;

    if (existingExamination) {
      examinationId = existingExamination.id;
    } else {
      try {
        const examination = await prisma.organizationExamination.create({
          data: {
            title: examinationTitle,
            category: ExaminationCategory.YEARLY,
            year: parseInt(year),
            status: ContentStatus.DRAFT,
            authorId: session.user.id,
            organizationId: null,
          },
        });
        examinationId = examination.id;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2011'
        ) {
          console.warn(
            '[PAPER_FIND_CREATE] Platform examination container could not be created yet; continuing with draft paper only.'
          );
        } else {
          throw error;
        }
      }
    }

    const newPaper = await prisma.examPaper.create({
      data: {
        title: paperTitle,
        year: parseInt(year),
        examId,
        subjectId,
        examinationId: examinationId,
        authorId: session.user.id,
        isPublic: false,
        status: ContentStatus.DRAFT,
        questions: {
          connect: seededQuestions.map(q => ({ id: q.id }))
        }
      }
    });

    return NextResponse.json(newPaper);

  } catch (error) {
    console.error('[PAPER_FIND_CREATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
