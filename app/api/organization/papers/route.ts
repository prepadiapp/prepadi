import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    
    // 1. Auth Check
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // --- ROBUST ORG ID RESOLUTION ---
    // Try getting from session first
    let orgId = (session.user as any).organizationId;
    
    if (!orgId) {
        // Fallback: Check if user is an OWNER (most common for Org accounts)
        const ownerOrg = await prisma.organization.findUnique({
            where: { ownerId: session.user.id },
            select: { id: true }
        });
        
        if (ownerOrg) {
            orgId = ownerOrg.id;
        } else {
            // Fallback: Check if user is a MEMBER via DB lookup
            const dbUser = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { organizationId: true }
            });
            orgId = dbUser?.organizationId;
        }
    }
    
    if (!orgId) return new NextResponse('Organization ID missing', { status: 403 });
    // --------------------------------

    // 2. Fetch Papers for this Org
    const papers = await prisma.examPaper.findMany({
      where: {
        organizationId: orgId
      },
      include: {
        exam: true,
        subject: true,
        questions: { select: { id: true } }, // Count questions
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    // 3. Format Response
    const formattedPapers = papers.map(paper => ({
      ...paper,
      _count: { questions: paper.questions.length }
    }));

    return NextResponse.json(formattedPapers);

  } catch (error) {
    console.error('[ORG_PAPERS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}