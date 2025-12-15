import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

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
          orderBy: { order: 'asc' } 
        }
      }
    });

    if (!paper) return new NextResponse('Paper not found', { status: 404 });

    // Access Check: Admin sees all, Org sees only own
    if (session.user.role === UserRole.ORGANIZATION) {
        // Robust Org Resolution
        let orgId = (session.user as any).organizationId;
        if (!orgId) {
            const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
            orgId = dbUser?.organizationId;
        }
        if (!orgId) {
            const ownerOrg = await prisma.organization.findUnique({ where: { ownerId: session.user.id }, select: { id: true } });
            orgId = ownerOrg?.id;
        }

        if (paper.organizationId !== orgId) {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return NextResponse.json(paper);
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getAuthSession();
  
  if (!session?.user || session.user.role !== UserRole.ADMIN) { 
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const paper = await prisma.examPaper.findUnique({ where: { id } });
    if (!paper) return new NextResponse('Paper not found', { status: 404 });

    const isAdmin = session.user.role === UserRole.ADMIN;
    
    // Robust Org Check for Delete
    let isOrgOwner = false;
    if (session.user.role === UserRole.ORGANIZATION) {
        let orgId = (session.user as any).organizationId;
        if (!orgId) {
            const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { organizationId: true } });
            orgId = dbUser?.organizationId;
        }
        if (!orgId) {
            const ownerOrg = await prisma.organization.findUnique({ where: { ownerId: session.user.id }, select: { id: true } });
            orgId = ownerOrg?.id;
        }
        isOrgOwner = paper.organizationId === orgId;
    }

    if (!isAdmin && !isOrgOwner) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    if (paper.organizationId) {
        // Org Paper: Delete questions too (they are clones)
        await prisma.$transaction([
            prisma.question.deleteMany({ where: { paperId: id } }),
            prisma.examPaper.delete({ where: { id } })
        ]);
    } else {
        // Admin Paper: Wipe it
        // If questions are attached, we might want to keep them if they are used elsewhere?
        // But in this model, questions belong to a paper or are generic.
        // Assuming Admin delete = cascade delete for simplicity unless "Question Bank" is separate entity.
        // Prisma schema should handle cascade, but let's be safe.
        // Use deleteMany to avoid errors if questions exist.
        await prisma.$transaction([
             prisma.question.deleteMany({ where: { paperId: id } }),
             prisma.examPaper.delete({ where: { id } })
        ]);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[PAPER_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}