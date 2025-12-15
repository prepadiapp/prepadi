import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, QuestionType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { generateTags } from '@/lib/ai';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const examId = searchParams.get('examId');
    const year = searchParams.get('year');
    const q = searchParams.get('q');
    const tagId = searchParams.get('tagId'); 
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || `${PAGE_SIZE}`);
    const skip = (page - 1) * limit;

    const where: any = { organizationId: null };

    if (subjectId && subjectId !== 'all') where.subjectId = subjectId;
    if (examId && examId !== 'all') where.examId = examId;
    if (year) where.year = parseInt(year);
    if (q) {
      where.text = { contains: q, mode: 'insensitive' };
    }
    if (tagId && tagId !== 'all') {
      where.tags = { some: { id: tagId } };
    }

    const [questions, totalCount] = await prisma.$transaction([
      prisma.question.findMany({
        where,
        orderBy: { subject: { name: 'asc' } },
        include: {
          subject: { select: { name: true } },
          exam: { select: { shortName: true } },
          tags: { select: { name: true } },
          options: true
        },
        skip: skip,
        take: limit,
      }),
      prisma.question.count({ where }),
    ]);

    return NextResponse.json({
      questions,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });

  } catch (error) {
    console.error('[QUESTIONS_GET_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

  const isAdmin = session.user.role === UserRole.ADMIN;
  const isOrg = session.user.role === UserRole.ORGANIZATION;

  if (!isAdmin && !isOrg) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      text, explanation, year, options, tags, type, markingGuide, paperId, sectionId, imageUrl
    } = body;
    
    // Mutable variables to hold resolved IDs
    let { subjectId, examId } = body;

    // Resolve Org Context
    let orgId = null;
    if (isOrg) {
        orgId = (session.user as any).organizationId;
        if (!orgId) {
             const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
             orgId = dbUser?.organizationId;
        }
        if (!orgId) {
             const ownerOrg = await prisma.organization.findUnique({ where: { ownerId: session.user.id }, select: { id: true } });
             orgId = ownerOrg?.id;
        }
    }

    // --- FIX: Auto-fill context from Paper BEFORE validation ---
    if (paperId) {
        const paper = await prisma.examPaper.findUnique({ where: { id: paperId } });
        if (paper) {
            if (!subjectId) subjectId = paper.subjectId;
            if (!examId) examId = paper.examId;
        }
    }
    // ---------------------------------------------------------

    // 1. Common Validation
    if (!text || !subjectId || !examId) {
      return new NextResponse('Missing required fields (text, subjectId, examId)', { status: 400 });
    }

    // 2. Type-Specific Validation
    const qType = (type as QuestionType) || QuestionType.OBJECTIVE;

    if (qType === QuestionType.OBJECTIVE && options) {
        if (options.length < 2) {
            return new NextResponse('Objective questions must have at least 2 options', { status: 400 });
        }
    }

    // 3. Auto-Generate Tags if Missing
    let tagNames = tags || [];
    
    if (tagNames.length === 0) {
        try {
            const subject = await prisma.subject.findUnique({
                where: { id: subjectId },
                select: { name: true }
            });
            
            if (subject) {
                const aiTags = await generateTags(text, subject.name);
                if (aiTags && aiTags.length > 0) {
                    tagNames = aiTags;
                }
            }
        } catch (aiError) {
            console.warn("Auto-tag generation failed:", aiError);
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
        // Make year optional, default to current if not provided
        year: year ? parseInt(year) : new Date().getFullYear(),
        subjectId,
        examId,
        paperId, 
        sectionId,
        imageUrl,
        organizationId: orgId, // Set for Org, null for Admin
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
      include: { options: true }
    });

    return NextResponse.json(newQuestion);
  } catch (error) {
    console.error('[QUESTION_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}