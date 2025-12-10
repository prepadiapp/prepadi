import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, QuestionType } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * GET: Fetch a single question by ID for editing
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) return new NextResponse('Missing Question ID', { status: 400 });

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        options: true,
        tags: { select: { name: true } },
        section: true,
      },
    });

    if (!question) {
      return new NextResponse('Question not found', { status: 404 });
    }
    
    // Format tags and section for the frontend
    const formattedQuestion = {
      ...question,
      tags: question.tags.map(t => t.name),
      section: question.section?.instruction || '',
    };

    return NextResponse.json(formattedQuestion);
  } catch (error) {
    console.error('[QUESTION_GET_ONE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * PATCH: Update an existing question
 * Supports both Full Updates (from Edit Page) and Partial Updates (from Accordion)
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
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) return new NextResponse('Missing Question ID', { status: 400 });

    const body = await request.json();
    const {
      text, explanation, imageUrl, year, subjectId, examId, options, tags,
      type, section, 
    } = body;

    // --- 1. Validation ---
    // We allow partial updates, so we only validate fields if they are present.
    // However, text is usually required for any meaningful update.
    if (text === '') {
       return new NextResponse('Question text cannot be empty', { status: 400 });
    }

    // Determine Question Type (Default to OBJECTIVE if not provided, or fetch existing if needed)
    // For partial updates without 'type', we skip type-specific validation unless 'options' are touched.
    const qType = (type as QuestionType) || QuestionType.OBJECTIVE;

    if (qType === QuestionType.OBJECTIVE && options) {
      if (Array.isArray(options) && options.length < 2) {
        return new NextResponse('Objective questions must have at least 2 options', { status: 400 });
      }
      // Note: We skip the "exactly one correct" check for partial updates to allow flexible editing steps,
      // but you can uncomment this if strictness is required at every save step.
      /*
      const correctOptions = options.filter((opt: any) => opt.isCorrect).length;
      if (correctOptions !== 1) {
        return new NextResponse('Objective questions must have exactly one correct answer', { status: 400 });
      }
      */
    }

    // --- 2. Handle Tags ---
    let tagIdsToConnect: { id: string }[] = [];
    if (tags && Array.isArray(tags)) {
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

    // --- 3. Handle Section ---
    let sectionId: string | null | undefined = undefined;
    if (section !== undefined) {
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
        } else {
            sectionId = null; // Explicitly remove section if empty string sent
        }
    }

    // --- 4. Handle Options ---
    const deleteOps: any[] = [];
    const updateOps: any[] = [];
    let createOps: any = null;

    if (options && Array.isArray(options)) {
        const existingOptions = await prisma.option.findMany({
            where: { questionId: id },
            select: { id: true },
        });
        const existingOptionIds = existingOptions.map(o => o.id);
        
        const safeOptions = options || [];
        // Filter out temp IDs from frontend (e.g. 'temp-123')
        const incomingOptionIds = safeOptions
            .filter((o: any) => o.id && !o.id.toString().startsWith('temp-'))
            .map((o: any) => o.id);
        
        const optionsToDelete = existingOptionIds.filter(optId => !incomingOptionIds.includes(optId));
        
        if (optionsToDelete.length > 0) {
            deleteOps.push(prisma.option.deleteMany({
                where: { id: { in: optionsToDelete } },
            }));
        }
        
        safeOptions.forEach((opt: any) => {
            if (opt.id && !opt.id.toString().startsWith('temp-')) {
                updateOps.push(prisma.option.update({
                    where: { id: opt.id },
                    data: { text: opt.text, isCorrect: opt.isCorrect },
                }));
            }
        });
        
        const optionsToCreate = safeOptions.filter((opt: any) => !opt.id || opt.id.toString().startsWith('temp-'));
        if (optionsToCreate.length > 0) {
             createOps = prisma.option.createMany({
                data: optionsToCreate.map((opt: any) => ({
                    questionId: id,
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                })),
            });
        }
    }

    // --- 5. Build Update Data Object (Partial Support) ---
    const updateData: any = {};
    if (text) updateData.text = text;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (year) updateData.year = parseInt(year);
    if (subjectId) updateData.subjectId = subjectId;
    if (examId) updateData.examId = examId;
    if (type) updateData.type = type;
    if (sectionId !== undefined) updateData.sectionId = sectionId;
    if (tags) updateData.tags = { set: tagIdsToConnect };

    // --- 6. Execute Transaction ---
    const transactionOps = [
        prisma.question.update({
            where: { id },
            data: updateData,
        }),
        ...deleteOps,
        ...updateOps,
    ];
    
    if (createOps) transactionOps.push(createOps);

    const [updatedQuestion] = await prisma.$transaction(transactionOps);

    return NextResponse.json(updatedQuestion);

  } catch (error) {
    console.error('[QUESTION_PATCH_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * DELETE: Delete a question
 * Includes cleanup of UserAnswers and Organization check
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
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) return new NextResponse('Missing Question ID', { status: 400 });

    // Use a transaction to delete safely
    await prisma.$transaction([
      prisma.userAnswer.deleteMany({
        where: { questionId: id },
      }),
      prisma.question.delete({
        where: { 
          id: id,
          // Ensure admin can only delete general questions (optional safeguard)
          // Remove this check if Admin should be able to delete Org questions too
          organizationId: null, 
        },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[QUESTION_DELETE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}