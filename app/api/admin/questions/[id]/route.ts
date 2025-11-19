import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/enums';
import { NextResponse } from 'next/server';


/**
 * GET: Fetch a single question by ID for editing
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Fixed for promise
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) return new NextResponse('Missing Question ID', { status: 400 });

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        options: true, // Need options for the form
        tags: { select: { name: true } }, // Need tag names
      },
    });

    if (!question) {
      return new NextResponse('Question not found', { status: 404 });
    }
    
    // Format tags as a simple array of strings
    const formattedQuestion = {
      ...question,
      tags: question.tags.map(t => t.name),
    };

    return NextResponse.json(formattedQuestion);
  } catch (error) {
    console.error('[QUESTION_GET_ONE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * PATCH: Update an existing question
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) return new NextResponse('Missing Question ID', { status: 400 });

    const body = await request.json();
    const {
      text, explanation, year, subjectId, examId, options,
      tags, // Array of strings: e.g., ['algebra', 'trig']
    } = body;

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

    // --- (Option Handling logic is unchanged) ---
    const existingOptions = await prisma.option.findMany({
      where: { questionId: id },
      select: { id: true },
    });
    const existingOptionIds = existingOptions.map(o => o.id);
    const incomingOptionIds = options.map((o: any) => o.id).filter(Boolean);
    const optionsToDelete = existingOptionIds.filter(id => !incomingOptionIds.includes(id));
    const deleteOps = prisma.option.deleteMany({
      where: { id: { in: optionsToDelete } },
    });
    const updateOps = options.filter((opt: any) => opt.id).map((opt: any) => {
      return prisma.option.update({
        where: { id: opt.id },
        data: { text: opt.text, isCorrect: opt.isCorrect },
      });
    });
    const optionsToCreate = options.filter((opt: any) => !opt.id);
    const createOps = prisma.option.createMany({
      data: optionsToCreate.map((opt: any) => ({
        questionId: id,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
    });

    // --- Update the Question (in a transaction with options) ---
    const [updatedQuestion] = await prisma.$transaction([
      prisma.question.update({
        where: { id },
        data: {
          text,
          explanation,
          year: parseInt(year),
          subjectId,
          examId,
          tags: {
            set: tagIdsToConnect, // Use `set` to replace all old tags
          },
        },
      }),
      // Then, run all option operations
      deleteOps,
      ...updateOps,
      createOps,
    ]);

    return NextResponse.json(updatedQuestion);

  } catch (error) {
    console.error('[QUESTION_PATCH_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) return new NextResponse('Missing Question ID', { status: 400 });

    // Use a transaction to delete
    await prisma.$transaction([
      prisma.userAnswer.deleteMany({
        where: { questionId: id },
      }),
      prisma.question.delete({
        where: { 
          id: id,
          organizationId: null, // Ensure admin can only delete general questions
        },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // This will now fail gracefully if the admin tries to delete an org's question
    console.error('[QUESTION_DELETE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}