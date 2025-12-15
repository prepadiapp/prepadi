import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { questionService } from '@/lib/question-service/question-service';

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
    // Check ownership if still missing
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
                isPublic: false,
                isVerified: true
            }
        });
        return NextResponse.json(newPaper);
    }

    // --- CASE 2: CLONE / FIND GLOBAL ---
    if (!examId || !subjectId || !year) {
      return new NextResponse('Missing required fields for cloning', { status: 400 });
    }

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

    const globalPaper = await prisma.examPaper.findFirst({
      where: {
        examId,
        subjectId,
        year: parseInt(year),
        isPublic: true,
        organizationId: null 
      },
      include: { questions: true }
    });

    const [exam, subject] = await Promise.all([
      prisma.exam.findUnique({ where: { id: examId } }),
      prisma.subject.findUnique({ where: { id: subjectId } })
    ]);

    const paperTitle = `${exam?.shortName} ${subject?.name} ${year} (Clone)`;

    let questionsToLink: { id: string }[] = [];

    if (globalPaper && globalPaper.questions.length > 0) {
        questionsToLink = globalPaper.questions.map(q => ({ id: q.id }));
    } else {
        const seededQuestions = await questionService.getQuestions({
            examId,
            subjectId,
            year: parseInt(year),
            limit: 60
        });
        questionsToLink = seededQuestions.map(q => ({ id: q.id }));
    }

    const newOrgPaper = await prisma.examPaper.create({
      data: {
        title: paperTitle,
        year: parseInt(year),
        examId,
        subjectId,
        authorId: session.user.id,
        organizationId: orgId, 
        isPublic: false, 
        questions: {
          connect: questionsToLink
        }
      }
    });

    return NextResponse.json(newOrgPaper);

  } catch (error) {
    console.error('[ORG_PAPER_FIND_CREATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}