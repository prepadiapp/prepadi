import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET: Fetch Paper + Questions
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getAuthSession();
  
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const paper = await prisma.examPaper.findUnique({
      where: { id: resolvedParams.id },
      include: {
        subject: { select: { id: true, name: true } },
        exam: { select: { id: true, name: true } },
        questions: {
          select: { id: true, text: true, type: true, order: true },
          orderBy: { order: 'asc' } // Ensure default sort is by order
        }
      }
    });

    if (!paper) return new NextResponse('Paper not found', { status: 404 });

    return NextResponse.json(paper);
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// PATCH: Update Paper Metadata (e.g. Verify)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getAuthSession();
  
  if (!session?.user || session.user.role !== UserRole.ADMIN) { // Only Admin can verify
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = await prisma.examPaper.update({
        where: { id: resolvedParams.id },
        data: { isVerified: body.isVerified }
    });
    return NextResponse.json(updated);
  } catch(e) {
    return new NextResponse('Update failed', { status: 500 });
  }
}