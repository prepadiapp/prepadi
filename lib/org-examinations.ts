import { ExaminationCategory, ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EnsureArgs = {
  organizationId: string;
  authorId: string;
  title: string;
  description?: string | null;
  category?: ExaminationCategory;
  year?: number | null;
  duration?: number | null;
  randomizeQuestions?: boolean;
  allowCustomOrder?: boolean;
  practiceEnabled?: boolean;
  status?: ContentStatus;
};

type ExaminationClient = Pick<Prisma.TransactionClient, "organizationExamination"> | typeof prisma;

export async function ensureOrganizationExamination(args: EnsureArgs, tx: ExaminationClient = prisma) {
  const where: Prisma.OrganizationExaminationWhereInput = {
    organizationId: args.organizationId,
    title: args.title,
    year: args.year ?? null,
  };

  const existing = await tx.organizationExamination.findFirst({
    where,
  });

  if (existing) return existing;

  return tx.organizationExamination.create({
    data: {
      title: args.title,
      description: args.description ?? null,
      category: args.category ?? ExaminationCategory.CUSTOM,
      year: args.year ?? null,
      duration: args.duration ?? null,
      randomizeQuestions: args.randomizeQuestions ?? false,
      allowCustomOrder: args.allowCustomOrder ?? true,
      practiceEnabled: args.practiceEnabled ?? false,
      status: args.status ?? ContentStatus.DRAFT,
      organizationId: args.organizationId,
      authorId: args.authorId,
    },
  });
}
