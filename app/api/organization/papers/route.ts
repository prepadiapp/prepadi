import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getOrganizationContext } from '@/lib/organization';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    
    // 1. Auth Check
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const org = await getOrganizationContext(session);
    if (!org) return new NextResponse('Organization ID missing', { status: 403 });

    // 2. Fetch Papers for this Org
    const papers = await prisma.examPaper.findMany({
      where: {
        organizationId: org.organizationId
      },
      include: {
        exam: true,
        subject: true,
        examination: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            practiceEnabled: true,
          },
        },
        questions: { select: { id: true } }, // Count questions
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 100
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
