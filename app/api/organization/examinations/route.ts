import { NextResponse } from "next/server";
import { ContentStatus, ExaminationCategory, UserRole } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrganizationContext } from "@/lib/organization";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse("Organization not found", { status: 404 });

  const examinations = await prisma.organizationExamination.findMany({
    where: { organizationId: org.organizationId },
    include: {
      papers: {
        select: {
          id: true,
          title: true,
          paperLabel: true,
          status: true,
          practiceEnabled: true,
          subject: { select: { name: true } },
          _count: { select: { questions: true } },
        },
        orderBy: [{ createdAt: "asc" }],
      },
      _count: {
        select: {
          papers: true,
          assignments: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json(examinations);
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const org = await getOrganizationContext(session);
  if (!org) return new NextResponse("Organization not found", { status: 404 });

  const body = await request.json();
  const {
    title,
    description,
    category,
    year,
    duration,
    randomizeQuestions,
    allowCustomOrder,
    practiceEnabled,
    paperTitle,
    paperLabel,
    subjectId,
  } = body;

  if (!title?.trim()) {
    return new NextResponse("Examination title is required", { status: 400 });
  }

  if (!subjectId) {
    return new NextResponse("Subject is required", { status: 400 });
  }

  const defaultExam =
    (await prisma.exam.findFirst({ where: { name: "Internal" } })) ??
    (await prisma.exam.findFirst());

  if (!defaultExam) {
    return new NextResponse("No exam body configured", { status: 400 });
  }

  const examination = await prisma.organizationExamination.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      category: (category as ExaminationCategory) ?? ExaminationCategory.CUSTOM,
      year: year ? Number(year) : null,
      duration: duration ? Number(duration) : null,
      randomizeQuestions: Boolean(randomizeQuestions),
      allowCustomOrder: allowCustomOrder !== false,
      practiceEnabled: Boolean(practiceEnabled),
      status: ContentStatus.DRAFT,
      organizationId: org.organizationId,
      authorId: org.userId,
      papers: {
        create: {
          title: paperTitle?.trim() || `${title.trim()} Paper 1`,
          paperLabel: paperLabel?.trim() || "Paper 1",
          year: year ? Number(year) : null,
          subjectId,
          examId: defaultExam.id,
          organizationId: org.organizationId,
          authorId: org.userId,
          isVerified: true,
          isPublic: false,
          status: ContentStatus.DRAFT,
          randomizeQuestions: Boolean(randomizeQuestions),
          allowCustomOrder: allowCustomOrder !== false,
          duration: duration ? Number(duration) : null,
          practiceEnabled: Boolean(practiceEnabled),
        },
      },
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
