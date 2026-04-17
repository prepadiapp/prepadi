import { NextResponse } from "next/server";
import { ContentStatus, UserRole } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrganizationContext } from "@/lib/organization";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse("Organization not found", { status: 404 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.examPaper.findFirst({
    where: {
      id,
      organizationId: org.organizationId,
    },
  });

  if (!existing) return new NextResponse("Paper not found", { status: 404 });

  const nextStatus = body.status as ContentStatus | undefined;
  const randomizeQuestions =
    body.randomizeQuestions !== undefined ? Boolean(body.randomizeQuestions) : existing.randomizeQuestions;
  const allowCustomOrder =
    body.allowCustomOrder !== undefined ? Boolean(body.allowCustomOrder) : existing.allowCustomOrder;
  const duration =
    body.duration !== undefined ? (body.duration ? Number(body.duration) : null) : existing.duration;
  const practiceEnabled =
    body.practiceEnabled !== undefined ? Boolean(body.practiceEnabled) : existing.practiceEnabled;

  const paper = await prisma.examPaper.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      paperLabel: typeof body.paperLabel === "string" ? body.paperLabel.trim() : undefined,
      status: nextStatus,
      randomizeQuestions,
      allowCustomOrder,
      duration,
      practiceEnabled,
      isPublic:
        nextStatus !== undefined ? nextStatus === ContentStatus.PUBLISHED : body.isPublic ?? existing.isPublic,
      publishedAt:
        nextStatus === ContentStatus.PUBLISHED || body.isPublic === true
          ? new Date()
          : nextStatus === ContentStatus.DRAFT || body.isPublic === false
            ? null
            : undefined,
    },
    include: {
      subject: true,
      examination: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  if (paper.examinationId) {
    const publishedPaperCount = await prisma.examPaper.count({
      where: {
        examinationId: paper.examinationId,
        status: ContentStatus.PUBLISHED,
      },
    });

    await prisma.organizationExamination.update({
      where: { id: paper.examinationId },
      data: {
        status: publishedPaperCount > 0 ? ContentStatus.PUBLISHED : ContentStatus.DRAFT,
        publishedAt: publishedPaperCount > 0 ? new Date() : null,
      },
    });
  }

  return NextResponse.json(paper);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse("Organization not found", { status: 404 });

  const { id } = await params;

  const paper = await prisma.examPaper.findFirst({
    where: {
      id,
      organizationId: org.organizationId,
    },
  });

  if (!paper) return new NextResponse("Paper not found", { status: 404 });

  await prisma.$transaction([
    prisma.question.deleteMany({ where: { paperId: id } }),
    prisma.examPaper.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
