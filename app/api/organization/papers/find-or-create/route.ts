import { NextResponse } from "next/server";
import { ContentStatus, ExaminationCategory, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { ensureOrganizationExamination } from "@/lib/org-examinations";
import { getOrganizationContext } from "@/lib/organization";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const org = await getOrganizationContext(session);
    if (!org) return new NextResponse("Organization ID missing. Please re-login.", { status: 403 });

    const body = await req.json();
    const {
      examId,
      subjectId,
      year,
      title,
      mode,
      category,
      duration,
      randomizeQuestions,
      allowCustomOrder,
      practiceEnabled,
      paperLabel,
    } = body;

    if (mode === "create") {
      if (!subjectId || !title) return new NextResponse("Missing title or subject", { status: 400 });

      let internalExam = await prisma.exam.findFirst({ where: { name: "Internal" } });
      if (!internalExam) internalExam = await prisma.exam.findFirst();

      if (!internalExam) {
        return new NextResponse("No exam body configured", { status: 400 });
      }

      const examination = await ensureOrganizationExamination({
        organizationId: org.organizationId,
        authorId: session.user.id,
        title,
        category: (category as ExaminationCategory) ?? (year ? ExaminationCategory.YEARLY : ExaminationCategory.CUSTOM),
        year: year ? Number(year) : null,
        duration: duration ? Number(duration) : null,
        randomizeQuestions: Boolean(randomizeQuestions),
        allowCustomOrder: allowCustomOrder !== false,
        practiceEnabled: Boolean(practiceEnabled),
        status: ContentStatus.DRAFT,
      });

      const newPaper = await prisma.examPaper.create({
        data: {
          title,
          paperLabel: paperLabel || "Paper 1",
          year: year ? Number(year) : null,
          subjectId,
          examId: internalExam.id,
          organizationId: org.organizationId,
          authorId: session.user.id,
          examinationId: examination.id,
          isPublic: false,
          isVerified: true,
          status: ContentStatus.DRAFT,
          randomizeQuestions: Boolean(randomizeQuestions),
          allowCustomOrder: allowCustomOrder !== false,
          duration: duration ? Number(duration) : null,
          practiceEnabled: Boolean(practiceEnabled),
        },
      });

      return NextResponse.json(newPaper);
    }

    if (!examId || !subjectId || !year) {
      return new NextResponse("Missing required fields for cloning", { status: 400 });
    }

    const parsedYear = parseInt(String(year), 10);
    if (Number.isNaN(parsedYear)) {
      return new NextResponse("Invalid year for cloning", { status: 400 });
    }

    const existingOrgPaper = await prisma.examPaper.findFirst({
      where: {
        examId,
        subjectId,
        year: parsedYear,
        organizationId: org.organizationId,
      },
    });

    if (existingOrgPaper) {
      return NextResponse.json({
        ...existingOrgPaper,
        existingClone: true,
      });
    }

    let sourceQuestions: any[] = [];

    const globalPaper = await prisma.examPaper.findFirst({
      where: {
        examId,
        subjectId,
        year: parsedYear,
        isPublic: true,
        organizationId: null,
      },
      include: {
        questions: {
          include: { options: true, tags: true },
        },
      },
    });

    if (globalPaper) {
      sourceQuestions = globalPaper.questions;
    } else {
      sourceQuestions = await prisma.question.findMany({
        where: {
          examId,
          subjectId,
          year: parsedYear,
          organizationId: null,
        },
        include: { options: true, tags: true },
        orderBy: { order: "asc" },
      });
    }

    if (sourceQuestions.length === 0) {
      return new NextResponse("This exam, subject, and year combination is not available in the global library.", { status: 404 });
    }

    const [exam, subject] = await Promise.all([
      prisma.exam.findUnique({ where: { id: examId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
    ]);

    const paperTitle = `${exam?.shortName} ${subject?.name} ${year}`;
    const examination = await ensureOrganizationExamination({
      organizationId: org.organizationId,
      authorId: session.user.id,
      title: paperTitle,
      category: ExaminationCategory.YEARLY,
      year: parsedYear,
      duration: duration ? Number(duration) : null,
      randomizeQuestions: Boolean(randomizeQuestions),
      allowCustomOrder: allowCustomOrder !== false,
      practiceEnabled: Boolean(practiceEnabled),
      status: ContentStatus.DRAFT,
    });

    const newOrgPaper = await prisma.examPaper.create({
      data: {
        title: paperTitle,
        paperLabel: paperLabel || "Paper 1",
        year: parsedYear,
        examId,
        subjectId,
        authorId: session.user.id,
        organizationId: org.organizationId,
        examinationId: examination.id,
        isPublic: false,
        isVerified: true,
        status: ContentStatus.DRAFT,
        randomizeQuestions: Boolean(randomizeQuestions),
        allowCustomOrder: allowCustomOrder !== false,
        duration: duration ? Number(duration) : null,
        practiceEnabled: Boolean(practiceEnabled),
      },
    });

    try {
      await Promise.all(
        sourceQuestions.map((q) =>
          prisma.question.create({
            data: {
              text: q.text,
              explanation: q.explanation,
              imageUrl: q.imageUrl,
              type: q.type,
              year: parsedYear,
              examId,
              subjectId,
              organizationId: org.organizationId,
              paperId: newOrgPaper.id,
              moderationStatus: ContentStatus.DRAFT,
              options: {
                create: q.options.map((opt: any) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                })),
              },
              tags: {
                connect: q.tags.map((t: any) => ({ id: t.id })),
              },
            },
          })
        )
      );
    } catch (err) {
      console.error("Error cloning questions, but paper created:", err);
    }

    return NextResponse.json({
      ...newOrgPaper,
      existingClone: false,
    });
  } catch (error) {
    console.error("[ORG_PAPER_FIND_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
