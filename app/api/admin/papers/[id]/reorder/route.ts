import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { updates } = await request.json(); // Expects [{ id: 'q1', order: 1 }, ...]
    
    if (!Array.isArray(updates)) {
        return new NextResponse('Invalid payload', { status: 400 });
    }

    // Use transaction for bulk update to ensure integrity
    await prisma.$transaction(
        updates.map((u: { id: string, order: number }) => 
            prisma.question.update({
                where: { id: u.id },
                data: { order: u.order }
            })
        )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder error:", error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}