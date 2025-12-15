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
              include: { options: true, tags: true } // Include all data to copy
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

    // TRANSACTION: Create Paper + Deep Copy Questions
    // We do NOT link to old question IDs. We create NEW ones owned by the Org.
    const newOrgPaper = await prisma.$transaction(async (tx) => {
        const paper = await tx.examPaper.create({
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

        // Bulk create copies of questions
        for (const q of globalPaper.questions) {
            await tx.question.create({
                data: {
                    text: q.text,
                    explanation: q.explanation,
                    imageUrl: q.imageUrl,
                    type: q.type,
                    year: parseInt(year),
                    examId,
                    subjectId,
                    organizationId: orgId, // OWNED BY ORG
                    paperId: paper.id,     // LINKED TO NEW PAPER
                    options: {
                        create: q.options.map(opt => ({
                            text: opt.text,
                            isCorrect: opt.isCorrect
                        }))
                    },
                    tags: {
                        connect: q.tags.map(t => ({ id: t.id })) // Reuse tags
                    }
                }
            });
        }
        return paper;
    });

    return NextResponse.json(newOrgPaper);

  } catch (error) {
    console.error('[ORG_PAPER_FIND_CREATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}