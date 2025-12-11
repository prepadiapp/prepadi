import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    
    // 1. Auth Check
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Determine Filter Context
    // We explicitly cast or check safely because TypeScript might lag behind module augmentation
    const userRole = session.user.role as UserRole;
    const orgId = (session.user as any).organizationId; // Safe cast for immediate fix

    const where: any = {};

    if (userRole === UserRole.ORGANIZATION && orgId) {
       // Organization Admin: See own papers
       where.organizationId = orgId;
    } else if (userRole === UserRole.ADMIN) {
       // Super Admin: See ALL papers (or you can filter if needed)
       // leaving 'where' empty fetches everything
    } else {
       // Regular users/students shouldn't be hitting this admin route usually,
       // but if they do, show public only? Or strict 403?
       // Let's assume strict admin/org access for this route.
       return new NextResponse('Forbidden', { status: 403 });
    }

    // 3. Fetch Papers
    const papers = await prisma.examPaper.findMany({
      where,
      include: {
        exam: true,
        subject: true,
        questions: { select: { id: true } }, // Count questions efficiently
        author: { select: { name: true, email: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50 // Limit for performance
    });

    // 4. Transform for Frontend (e.g. adding counts)
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