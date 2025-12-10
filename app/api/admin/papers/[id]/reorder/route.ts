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
    // Await params for Next.js 15+ compatibility
    const resolvedParams = await params;

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { order } = body; // Expecting [{ id: string, order: number }]

    if (!Array.isArray(order)) {
      return new NextResponse('Invalid data format', { status: 400 });
    }

    // Execute updates in a transaction for data integrity
    await prisma.$transaction(
      order.map((item) =>
        prisma.question.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PAPER_REORDER]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}