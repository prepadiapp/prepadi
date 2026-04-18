import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { ContentStatus, UserRole } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();

  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const paper = await prisma.examPaper.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        exam: { select: { id: true, name: true, shortName: true } },
        organization: { select: { id: true, name: true } },
        examination: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            year: true,
            organizationId: true,
          },
        },
        questions: {
          include: {
            options: true,
            section: true,
            tags: true,
            questionReviewEntries: {
              include: {
                author: { select: { id: true, name: true, email: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!paper) return new NextResponse('Paper not found', { status: 404 });

    if (session.user.role === UserRole.ORGANIZATION) {
      let orgId = (session.user as { organizationId?: string | null }).organizationId;
      if (!orgId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { organizationId: true },
        });
        orgId = dbUser?.organizationId;
      }
      if (!orgId) {
        const ownerOrg = await prisma.organization.findUnique({
          where: { ownerId: session.user.id },
          select: { id: true },
        });
        orgId = ownerOrg?.id;
      }

      if (paper.organizationId !== orgId) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    return NextResponse.json(paper);
  } catch (error) {
    console.error('[ADMIN_PAPER_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const existing = await prisma.examPaper.findUnique({ where: { id } });

    if (!existing) {
      return new NextResponse('Paper not found', { status: 404 });
    }

    const nextStatus = (body.status as ContentStatus | undefined) ?? existing.status;
    const isPublic =
      body.isPublic !== undefined
        ? Boolean(body.isPublic)
        : nextStatus === ContentStatus.PUBLISHED;

    const updated = await prisma.examPaper.update({
      where: { id },
      data: {
        title: body.title?.trim() ?? existing.title,
        paperLabel:
          body.paperLabel !== undefined ? body.paperLabel?.trim() || null : existing.paperLabel,
        status: nextStatus,
        isPublic,
        isVerified:
          body.isVerified !== undefined ? Boolean(body.isVerified) : existing.isVerified,
        duration:
          body.duration !== undefined
            ? body.duration
              ? Number(body.duration)
              : null
            : existing.duration,
        randomizeQuestions:
          body.randomizeQuestions !== undefined
            ? Boolean(body.randomizeQuestions)
            : existing.randomizeQuestions,
        allowCustomOrder:
          body.allowCustomOrder !== undefined
            ? Boolean(body.allowCustomOrder)
            : existing.allowCustomOrder,
        practiceEnabled:
          body.practiceEnabled !== undefined
            ? Boolean(body.practiceEnabled)
            : existing.practiceEnabled,
        publishedAt:
          nextStatus === ContentStatus.PUBLISHED || isPublic
            ? existing.publishedAt ?? new Date()
            : nextStatus === ContentStatus.DRAFT
              ? null
              : existing.publishedAt,
      },
    });

    if (updated.examinationId) {
      const publishedPaperCount = await prisma.examPaper.count({
        where: {
          examinationId: updated.examinationId,
          status: ContentStatus.PUBLISHED,
        },
      });

      await prisma.organizationExamination.update({
        where: { id: updated.examinationId },
        data: {
          status:
            publishedPaperCount > 0 ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
          publishedAt: publishedPaperCount > 0 ? new Date() : null,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[ADMIN_PAPER_PATCH]', error);
    return new NextResponse('Update failed', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const paper = await prisma.examPaper.findUnique({
      where: { id },
      include: {
        assignments: { select: { id: true } },
      },
    });
    if (!paper) return new NextResponse('Paper not found', { status: 404 });

    if (paper.assignments.length > 0) {
      return NextResponse.json(
        { error: 'This paper has assignments and cannot be deleted yet.' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.question.deleteMany({ where: { paperId: id } }),
      prisma.examPaper.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PAPER_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
