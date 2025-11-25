import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// We import QuestionType to handle the enum logic
import { UserRole, QuestionType } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * GET: Fetch a single question by ID for editing
 */
export async function GET(
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

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        options: true,
        tags: { select: { name: true } },
        section: true, // --- Include Section to get the instruction text
      },
    });

    if (!question) {
      return new NextResponse('Question not found', { status: 404 });
    }
    
    // Format tags and section for the frontend
    const formattedQuestion = {
      ...question,
      tags: question.tags.map(t => t.name),
      section: question.section?.instruction || '', // Flatten section object to string
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
      text, explanation, year, subjectId, examId, options, tags,
      // --- NEW FIELDS ---
      type, // 'OBJECTIVE' or 'THEORY'
      section, // Instruction text string
    } = body;

    // --- 1. Basic Validation ---
    if (!text || !year || !subjectId || !examId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // --- 2. Conditional Validation based on Type ---
    // Default to OBJECTIVE if not provided
    const qType = (type as QuestionType) || QuestionType.OBJECTIVE;

    if (qType === QuestionType.OBJECTIVE) {
      if (!options || options.length < 2) {
        return new NextResponse('Objective questions must have at least 2 options', { status: 400 });
      }
      const correctOptions = options.filter((opt: any) => opt.isCorrect).length;
      if (correctOptions !== 1) {
        return new NextResponse('Objective questions must have exactly one correct answer', { status: 400 });
      }
    }

    // --- 3. Handle Tags (Existing Logic) ---
    let tagIdsToConnect: { id: string }[] = [];
    if (tags && tags.length > 0) {
      const existingTags = await prisma.tag.findMany({
        where: { name: { in: tags } },
        select: { id: true, name: true },
      });
      const existingTagNames = existingTags.map(t => t.name);
      tagIdsToConnect = existingTags.map(t => ({ id: t.id }));

      const newTagNames = tags.filter((tagName: string) => !existingTagNames.includes(tagName));

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

    // --- 4. Handle Section (NEW LOGIC) ---
    // Find or create the section based on the instruction text
    let sectionId: string | null = null;
    if (section && section.trim() !== '') {
      const sectionText = section.trim();
      let dbSection = await prisma.section.findFirst({
        where: { instruction: sectionText }
      });
      
      if (!dbSection) {
        dbSection = await prisma.section.create({
          data: { instruction: sectionText }
        });
      }
      sectionId = dbSection.id;
    }

    // --- 5. Handle Options (Existing Logic) ---
    // Note: If qType is THEORY, options might be empty. 
    // This logic still works: it will delete existing options if the incoming array is empty.
    const existingOptions = await prisma.option.findMany({
      where: { questionId: id },
      select: { id: true },
    });
    const existingOptionIds = existingOptions.map(o => o.id);
    
    // Safe check in case options is undefined for Theory
    const safeOptions = options || [];
    const incomingOptionIds = safeOptions.map((o: any) => o.id).filter(Boolean);
    
    const optionsToDelete = existingOptionIds.filter(id => !incomingOptionIds.includes(id));
    
    const deleteOps = prisma.option.deleteMany({
      where: { id: { in: optionsToDelete } },
    });
    
    const updateOps = safeOptions.filter((opt: any) => opt.id).map((opt: any) => {
      return prisma.option.update({
        where: { id: opt.id },
        data: { text: opt.text, isCorrect: opt.isCorrect },
      });
    });
    
    const optionsToCreate = safeOptions.filter((opt: any) => !opt.id);
    const createOps = prisma.option.createMany({
      data: optionsToCreate.map((opt: any) => ({
        questionId: id,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
    });

    // --- 6. Update the Question ---
    const [updatedQuestion] = await prisma.$transaction([
      prisma.question.update({
        where: { id },
        data: {
          text,
          explanation,
          year: parseInt(year),
          subjectId,
          examId,
          // --- Update New Fields ---
          type: qType,
          sectionId: sectionId, // Updates or disconnects (if null)
          // -----------------------
          tags: {
            set: tagIdsToConnect,
          },
        },
      }),
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

/**
 * DELETE: Delete a question
 */
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
    console.error('[QUESTION_DELETE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}