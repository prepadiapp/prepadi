import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // --- ROBUST ORG ID RESOLUTION ---
    let orgId = (session.user as any).organizationId;
    if (!orgId) {
        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true }
        });
        orgId = dbUser?.organizationId;
    }
    if (!orgId) {
        const ownerOrg = await prisma.organization.findUnique({
            where: { ownerId: session.user.id },
            select: { id: true }
        });
        orgId = ownerOrg?.id;
    }

    if (!orgId) return new NextResponse('Organization ID missing. Please re-login.', { status: 403 });
    // --------------------------------

    const body = await req.json();
    const { examId, subjectId, year, title, mode } = body; 

    // --- CASE 1: CREATE BLANK PAPER ---
    if (mode === 'create') {
        if (!subjectId || !title) return new NextResponse("Missing title or subject", { status: 400 });
        
        let internalExam = await prisma.exam.findFirst({ where: { name: 'Internal' } });
        if (!internalExam) internalExam = await prisma.exam.findFirst(); 

        const newPaper = await prisma.examPaper.create({
            data: {
                title,
                year: new Date().getFullYear(), 
                subjectId,
                examId: internalExam?.id!, 
                organizationId: orgId,
                authorId: session.user.id,
                isPublic: true, 
                isVerified: true
            }
        });
        return NextResponse.json(newPaper);
    }

    // --- CASE 2: CLONE FROM GLOBAL (STRICT DB FETCH) ---
    if (!examId || !subjectId || !year) {
      return new NextResponse('Missing required fields for cloning', { status: 400 });
    }

    // Check if Org ALREADY HAS this paper
    const existingOrgPaper = await prisma.examPaper.findFirst({
      where: {
        examId,
        subjectId,
        year: parseInt(year),
        organizationId: orgId, 
      }
    });

    if (existingOrgPaper) {
      return NextResponse.json(existingOrgPaper);
    }

    // Find Global Paper to Clone
    const globalPaper = await prisma.examPaper.findFirst({
      where: {
        examId,
        subjectId,
        year: parseInt(year),
        isPublic: true,
        organizationId: null 
      },
      include: { 
          questions: {
              include: { options: true, tags: true },
              take: 60 // Limit to 60 questions
          } 
      }
    });

    if (!globalPaper) {
        return new NextResponse("Global paper not found. Please ask Admin to seed it first.", { status: 404 });
    }

    const [exam, subject] = await Promise.all([
      prisma.exam.findUnique({ where: { id: examId } }),
      prisma.subject.findUnique({ where: { id: subjectId } })
    ]);

    const paperTitle = `${exam?.shortName} ${subject?.name} ${year}`;

    console.log(`[ORG_PAPER_CLONE] Cloning ${globalPaper.questions.length} questions...`);

    // Step 1: Create the paper (quick transaction)
    const newPaper = await prisma.examPaper.create({
        data: {
            title: paperTitle,
            year: parseInt(year),
            examId,
            subjectId,
            authorId: session.user.id,
            organizationId: orgId, 
            isPublic: true, 
            isVerified: true
        }
    });

    // Step 2: Clone questions in small batches (outside transaction)
    const BATCH_SIZE = 10; // Process 10 questions at a time
    let clonedCount = 0;

    for (let i = 0; i < globalPaper.questions.length; i += BATCH_SIZE) {
      const batch = globalPaper.questions.slice(i, i + BATCH_SIZE);
      
      try {
        // Use a short transaction for each batch
        await prisma.$transaction(
          async (tx) => {
            for (const q of batch) {
              await tx.question.create({
                data: {
                  text: q.text,
                  explanation: q.explanation,
                  imageUrl: q.imageUrl,
                  type: q.type,
                  year: parseInt(year),
                  examId,
                  subjectId,
                  organizationId: orgId,
                  paperId: newPaper.id,
                  options: {
                    create: q.options.map(opt => ({
                      text: opt.text,
                      isCorrect: opt.isCorrect
                    }))
                  },
                  tags: {
                    connect: q.tags.map(t => ({ id: t.id }))
                  }
                }
              });
            }
          },
          {
            maxWait: 10000, // 10s to acquire transaction
            timeout: 15000, // 15s transaction timeout
          }
        );

        clonedCount += batch.length;
        console.log(`[ORG_PAPER_CLONE] Progress: ${clonedCount}/${globalPaper.questions.length}`);

      } catch (error) {
        console.error(`[ORG_PAPER_CLONE] Batch ${i / BATCH_SIZE + 1} failed:`, error);
        // Continue with next batch instead of failing entirely
      }
    }

    console.log(`[ORG_PAPER_CLONE] Completed: ${clonedCount} questions cloned`);

    // Return the paper with question count
    const finalPaper = await prisma.examPaper.findUnique({
      where: { id: newPaper.id },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    return NextResponse.json(finalPaper);

  } catch (error: any) {
    console.error('[ORG_PAPER_FIND_CREATE]', error);
    return new NextResponse(
      error.message || 'Internal Error', 
      { status: 500 }
    );
  }
}