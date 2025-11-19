import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/client'; 
import { NextResponse } from 'next/server';

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

    // Build the dynamic 'where' clause
    const where: any = {
      organizationId: null, // Only show "general" questions
    };

    if (subjectId) where.subjectId = subjectId;
    if (examId) where.examId = examId;
    if (year) where.year = parseInt(year);
    if (q) {
      where.text = {
        contains: q,
        mode: 'insensitive',
      };
    }
    if (tagId) {
      where.tags = {
        some: {
          id: tagId,
        },
      };
    }

    const [questions, totalCount] = await prisma.$transaction([
      prisma.question.findMany({
        where,
        orderBy: { subject: { name: 'asc' } },
        include: {
          subject: { select: { name: true } },
          exam: { select: { shortName: true } },
          tags: { select: { name: true } },
        },
        skip: skip,
        take: limit,
      }),
      prisma.question.count({
        where,
      }),
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
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      text, explanation, year, subjectId, examId, options,
      tags, // This is an array of strings: e.g., ['algebra', 'trig']
    } = body;

    // --- (Validation is unchanged) ---
    if (!text || !year || !subjectId || !examId || !options || options.length < 2) {
      return new NextResponse('Missing required fields', { status: 400 });
    }
    const correctOptions = options.filter((opt: any) => opt.isCorrect).length;
    if (correctOptions !== 1) {
      return new NextResponse('There must be exactly one correct answer', { status: 400 });
    }

    let tagIdsToConnect: { id: string }[] = [];

    if (tags && tags.length > 0) {
      // 1. Find which tags already exist
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: tags } },
        select: { id: true, name: true },
      });
      const existingTagNames = existingTags.map(t => t.name);
      tagIdsToConnect = existingTags.map(t => ({ id: t.id }));

      // 2. Find out which tags are new
      const newTagNames = tags.filter((tagName: string) => !existingTagNames.includes(tagName));

      // 3. Create the new tags
      if (newTagNames.length > 0) {
        await prisma.tag.createMany({
          data: newTagNames.map((name: string) => ({ name })),
        });
        
        // 4. Get the IDs of the tags we just created
        const newlyCreatedTags = await prisma.tag.findMany({
          where: { name: { in: newTagNames } },
          select: { id: true },
        });
        tagIdsToConnect.push(...newlyCreatedTags);
      }
    }

    // --- Create the Question ---
    const newQuestion = await prisma.question.create({
      data: {
        text,
        explanation,
        year: parseInt(year),
        subjectId,
        examId,
        organizationId: null,
        options: {
          createMany: {
            data: options.map((opt: { text: string, isCorrect: boolean }) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
            })),
          },
        },
        tags: {
          connect: tagIdsToConnect, // Use our safe list of IDs
        },
      },
    });

    return NextResponse.json(newQuestion);
  } catch (error) {
    console.error('[QUESTION_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}