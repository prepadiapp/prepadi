import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const resolvedParams = await params;
    
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { order } = body; 

    if (!Array.isArray(order)) {
      return new NextResponse('Invalid data format', { status: 400 });
    }

    // Security Check: Verify paper belongs to Org
    const paper = await prisma.examPaper.findUnique({
        where: { 
            id: resolvedParams.id,
            organizationId: (session.user as any).organizationId
        }
    });

    if (!paper) return new NextResponse('Paper not found', { status: 404 });

    // Execute updates
    await prisma.$transaction(
      order.map((item) =>
        prisma.question.update({
          where: { id: item.id }, // Assume standard question update is fine
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ORG_PAPER_REORDER]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}