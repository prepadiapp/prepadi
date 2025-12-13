import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, QuestionType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { generateTags } from '@/lib/ai';

const PAGE_SIZE = 20;

// GET: Fetch Questions (Filtered)
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const skip = (page - 1) * limit;

  // Filters
  const subjectId = searchParams.get('subjectId');
  const examId = searchParams.get('examId');
  const year = searchParams.get('year');
  const tagId = searchParams.get('tagId');

  const where: any = {
      organizationId: null, // STRICTLY GLOBAL QUESTIONS ONLY
  };

  if (q) {
    where.text = { contains: q, mode: 'insensitive' };
  }
  if (subjectId && subjectId !== 'all') where.subjectId = subjectId;
  if (examId && examId !== 'all') where.examId = examId;
  if (year) where.year = parseInt(year);
  if (tagId && tagId !== 'all') {
    where.tags = { some: { id: tagId } };
  }

  try {
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          subject: { select: { name: true } },
          exam: { select: { shortName: true } },
          tags: { select: { name: true } },
          options: true // Include options count
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.question.count({ where }),
    ]);

    return NextResponse.json({
      questions: questions.map(q => ({
        ...q,
        tags: q.tags // Flatten tags if needed
      })),
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse('Error fetching questions', { status: 500 });
  }
}


export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      text, explanation, year, subjectId, examId, options, tags, type, markingGuide
    } = body;

    // 1. Common Validation
    if (!text || !year || !subjectId || !examId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // 2. Type-Specific Validation
    const qType = (type as QuestionType) || QuestionType.OBJECTIVE;

    if (qType === QuestionType.OBJECTIVE) {
        if (!options || options.length < 2) {
            return new NextResponse('Objective questions must have at least 2 options', { status: 400 });
        }
        const correctOptions = options.filter((opt: any) => opt.isCorrect).length;
        if (correctOptions !== 1) {
            return new NextResponse('There must be exactly one correct answer', { status: 400 });
        }
    }

    // 3. Auto-Generate Tags if Missing
    let tagNames = tags || [];
    
    if (tagNames.length === 0) {
        try {
            // Fetch subject name for context
            const subject = await prisma.subject.findUnique({
                where: { id: subjectId },
                select: { name: true }
            });
            
            if (subject) {
                console.log(`[AI] Generating tags for: ${text.substring(0, 30)}...`);
                const aiTags = await generateTags(text, subject.name);
                if (aiTags && aiTags.length > 0) {
                    tagNames = aiTags;
                }
            }
        } catch (aiError) {
            console.warn("Auto-tag generation failed:", aiError);
            // Continue without tags if AI fails
        }
    }

    // 4. Handle Tags (Connect/Create)
    let tagIdsToConnect: { id: string }[] = [];
    if (tagNames.length > 0) {
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: tagNames } },
        select: { id: true, name: true },
      });
      const existingTagNames = existingTags.map(t => t.name);
      tagIdsToConnect = existingTags.map(t => ({ id: t.id }));

      const newTagNames = tagNames.filter((tagName: string) => !existingTagNames.includes(tagName));

      if (newTagNames.length > 0) {
        await prisma.tag.createMany({
          data: newTagNames.map((name: string) => ({ name })),
        });
        const newlyCreatedTags = await prisma.tag.findMany({
          where: { name: { in: newTagNames } },
          select: { id: true },
        });
        tagIdsToConnect.push(...newlyCreatedTags.map(t => ({ id: t.id })));
      }
    }

    // 5. Create Question
    const newQuestion = await prisma.question.create({
      data: {
        text,
        explanation,
        year: parseInt(year),
        subjectId,
        examId,
        organizationId: null,
        type: qType,
        markingGuide: qType === QuestionType.THEORY ? markingGuide : null,
        options: qType === QuestionType.OBJECTIVE ? {
          createMany: {
            data: options.map((opt: { text: string, isCorrect: boolean }) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
            })),
          },
        } : undefined,
        tags: {
          connect: tagIdsToConnect,
        },
      },
    });

    return NextResponse.json(newQuestion);
  } catch (error) {
    console.error('[QUESTION_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}