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

    if (!orgId) return new NextResponse('Org ID missing', { status: 403 });
    // --------------------------------

    const body = await req.json();
    const { text, type, paperId, options, imageUrl, explanation, section } = body; 

    if (!paperId) return new NextResponse('Paper ID required for manual creation', { status: 400 });

    const paper = await prisma.examPaper.findUnique({ where: { id: paperId } });
    if (!paper) return new NextResponse('Paper not found', { status: 404 });

    // Handle Section (Instruction/Passage)
    let sectionId = null;
    if (section && section.trim() !== '') {
        const sectionText = section.trim();
        let dbSection = await prisma.section.findFirst({ where: { instruction: sectionText } });
        if (!dbSection) {
            dbSection = await prisma.section.create({ data: { instruction: sectionText } });
        }
        sectionId = dbSection.id;
    }

    const question = await prisma.question.create({
        data: {
            text,
            type,
            paperId,
            // FIX: If paper.year is null, default to current year.
            // If year is not needed for Org logic, we just use a placeholder year (current).
            year: paper.year ?? new Date().getFullYear(),
            subjectId: paper.subjectId!, 
            examId: paper.examId, 
            organizationId: orgId,
            imageUrl,
            explanation,
            sectionId,
            options: {
                create: options
            }
        },
        include: { options: true }
    });

    return NextResponse.json(question);

  } catch (error) {
    console.error('[ORG_CREATE_QUESTION]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}