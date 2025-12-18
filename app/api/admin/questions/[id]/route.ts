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
    if (text === '') {
       return new NextResponse('Question text cannot be empty', { status: 400 });
    }

    const qType = (type as QuestionType) || QuestionType.OBJECTIVE;

    if (qType === QuestionType.OBJECTIVE && options) {
      if (Array.isArray(options) && options.length < 2) {
        return new NextResponse('Objective questions must have at least 2 options', { status: 400 });
      }
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
            sectionId = null; 
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

    // --- 5. Build Update Data ---
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
    // We do NOT use the return value of this transaction directly for the response
    // because it won't contain the fully updated relations (especially options changed in parallel ops).
    await prisma.$transaction([
        prisma.question.update({
            where: { id },
            data: updateData,
        }),
        ...deleteOps,
        ...updateOps,
        ...(createOps ? [createOps] : [])
    ]);

    // --- 7. Fetch the Complete Result ---
    // Fetch the fresh question with all relations to return to the frontend.
    // This ensures the Accordion receives the tags as objects { id, name }
    const completeQuestion = await prisma.question.findUnique({
      where: { id },
      include: {
        options: true,
        tags: true, // This returns tags as objects, which PaperEditor expects
        section: true,
      }
    });

    return NextResponse.json(completeQuestion);

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
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) return new NextResponse('Missing Question ID', { status: 400 });

    await prisma.$transaction([
      prisma.userAnswer.deleteMany({
        where: { questionId: id },
      }),
      prisma.question.delete({
        where: { 
          id: id,
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