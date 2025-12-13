import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    // Safe cast for Org logic if needed locally, though main filter is role based
    const orgId = (session.user as any).organizationId;

    const where: any = {};

    if (userRole === UserRole.ORGANIZATION && orgId) {
       // Org: See OWN papers
       where.organizationId = orgId;
    } else if (userRole === UserRole.ADMIN) {
       // Admin: See ONLY Global (Admin-created) papers by default
       // Filter out Organization papers to keep list clean
       where.organizationId = null; 
    } else {
       return new NextResponse('Forbidden', { status: 403 });
    }

    const papers = await prisma.examPaper.findMany({
      where,
      include: {
        exam: true,
        subject: true,
        questions: { select: { id: true } }, 
        author: { select: { name: true, email: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50 
    });

    const formattedPapers = papers.map(paper => ({
      ...paper,
      _count: { questions: paper.questions.length }
    }));

    return NextResponse.json(formattedPapers);

  } catch (error) {
    console.error('[ADMIN_PAPERS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}