import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ContentStatus, ExaminationCategory, UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.organizationExamination.findUnique({
      where: { id },
    });

    if (!existing) {
      return new NextResponse('Examination not found', { status: 404 });
    }

    const nextStatus = (body.status as ContentStatus | undefined) ?? existing.status;

    const updated = await prisma.organizationExamination.update({
      where: { id },
      data: {
        title: body.title?.trim() ?? existing.title,
        description:
          body.description !== undefined
            ? body.description?.trim() || null
            : existing.description,
        category:
          (body.category as ExaminationCategory | undefined) ?? existing.category,
        year:
          body.year !== undefined
            ? body.year
              ? Number(body.year)
              : null
            : existing.year,
        status: nextStatus,
        publishedAt:
          nextStatus === ContentStatus.PUBLISHED
            ? existing.publishedAt ?? new Date()
            : nextStatus === ContentStatus.DRAFT
              ? null
              : existing.publishedAt,
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
        organizationId:
          body.organizationId !== undefined
            ? body.organizationId || null
            : existing.organizationId,
      },
      include: {
        organization: { select: { id: true, name: true } },
        papers: {
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[ADMIN_EXAMINATIONS_PATCH]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const examination = await prisma.organizationExamination.findUnique({
      where: { id },
      include: {
        assignments: { select: { id: true } },
        papers: { select: { id: true } },
      },
    });

    if (!examination) {
      return new NextResponse('Examination not found', { status: 404 });
    }

    if (examination.assignments.length > 0) {
      return NextResponse.json(
        { error: 'This examination has assignments and cannot be deleted yet.' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.question.deleteMany({
        where: {
          paperId: { in: examination.papers.map((paper) => paper.id) },
        },
      }),
      prisma.examPaper.deleteMany({
        where: { examinationId: id },
      }),
      prisma.organizationExamination.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_EXAMINATIONS_DELETE]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
