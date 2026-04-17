import { NextResponse } from "next/server";
import { ContentStatus, ExaminationCategory, UserRole } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrganizationContext } from "@/lib/organization";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse("Organization not found", { status: 404 });

  const { id } = await params;

  const examination = await prisma.organizationExamination.findFirst({
    where: {
      id,
      organizationId: org.organizationId,
    },
    include: {
      papers: {
        include: {
          subject: true,
          exam: true,
          _count: {
            select: { questions: true },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      },
      _count: {
        select: {
          assignments: true,
        },
      },
    },
  });

  if (!examination) return new NextResponse("Examination not found", { status: 404 });

  return NextResponse.json(examination);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse("Organization not found", { status: 404 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.organizationExamination.findFirst({
    where: { id, organizationId: org.organizationId },
  });

  if (!existing) return new NextResponse("Examination not found", { status: 404 });

  const nextStatus = body.status as ContentStatus | undefined;
  const updateData = {
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    description: body.description !== undefined ? body.description?.trim() || null : undefined,
    category: body.category ? (body.category as ExaminationCategory) : undefined,
    year: body.year !== undefined ? (body.year ? Number(body.year) : null) : undefined,
    duration: body.duration !== undefined ? (body.duration ? Number(body.duration) : null) : undefined,
    randomizeQuestions: body.randomizeQuestions !== undefined ? Boolean(body.randomizeQuestions) : undefined,
    allowCustomOrder: body.allowCustomOrder !== undefined ? Boolean(body.allowCustomOrder) : undefined,
    practiceEnabled: body.practiceEnabled !== undefined ? Boolean(body.practiceEnabled) : undefined,
    status: nextStatus,
    publishedAt:
      nextStatus === ContentStatus.PUBLISHED
        ? new Date()
        : nextStatus === ContentStatus.DRAFT
          ? null
          : undefined,
  };

  const examination = await prisma.organizationExamination.update({
    where: { id },
    data: {
      ...updateData,
      papers:
        body.syncPaperSettings === true
          ? {
              updateMany: {
                where: { examinationId: id },
                data: {
                  randomizeQuestions:
                    body.randomizeQuestions !== undefined ? Boolean(body.randomizeQuestions) : existing.randomizeQuestions,
                  allowCustomOrder:
                    body.allowCustomOrder !== undefined ? Boolean(body.allowCustomOrder) : existing.allowCustomOrder,
                  duration:
                    body.duration !== undefined ? (body.duration ? Number(body.duration) : null) : existing.duration,
                  practiceEnabled:
                    body.practiceEnabled !== undefined ? Boolean(body.practiceEnabled) : existing.practiceEnabled,
                  status: nextStatus ?? existing.status,
                  publishedAt:
                    nextStatus === ContentStatus.PUBLISHED
                      ? new Date()
                      : nextStatus === ContentStatus.DRAFT
                        ? null
                        : undefined,
                  isPublic: nextStatus === ContentStatus.PUBLISHED,
                },
              },
            }
          : undefined,
    },
    include: {
      papers: {
        include: {
          _count: { select: { questions: true } },
        },
      },
    },
  });

  return NextResponse.json(examination);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse("Organization not found", { status: 404 });

  const { id } = await params;

  const examination = await prisma.organizationExamination.findFirst({
    where: {
      id,
      organizationId: org.organizationId,
    },
    include: {
      papers: {
        select: { id: true },
      },
    },
  });

  if (!examination) return new NextResponse("Examination not found", { status: 404 });

  await prisma.$transaction([
    prisma.question.deleteMany({
      where: {
        paperId: { in: examination.papers.map((paper) => paper.id) },
      },
    }),
    prisma.organizationExamination.delete({
      where: { id },
    }),
  ]);

  return NextResponse.json({ success: true });
}
