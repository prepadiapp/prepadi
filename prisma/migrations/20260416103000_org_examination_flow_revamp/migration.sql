-- Create enums
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ExaminationCategory" AS ENUM ('YEARLY', 'PRACTICE', 'MOCK', 'INTERNAL', 'CUSTOM');

-- Create organization examination container
CREATE TABLE "OrganizationExamination" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ExaminationCategory" NOT NULL DEFAULT 'CUSTOM',
    "year" INTEGER,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomOrder" BOOLEAN NOT NULL DEFAULT true,
    "duration" INTEGER,
    "practiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationExamination_pkey" PRIMARY KEY ("id")
);

-- Create review note table
CREATE TABLE "QuestionReviewNote" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionReviewNote_pkey" PRIMARY KEY ("id")
);

-- Alter question moderation fields
ALTER TABLE "Question"
ADD COLUMN "flaggedAt" TIMESTAMP(3),
ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "moderationStatus" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "reviewNotes" JSONB;

-- Alter paper fields
ALTER TABLE "ExamPaper"
ADD COLUMN "allowCustomOrder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "duration" INTEGER,
ADD COLUMN "examinationId" TEXT,
ADD COLUMN "paperLabel" TEXT,
ADD COLUMN "practiceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';

-- Alter assignment fields
ALTER TABLE "Assignment"
ADD COLUMN "examinationId" TEXT;

-- Backfill paper status from old public flag
UPDATE "ExamPaper"
SET "status" = CASE
  WHEN "isPublic" = true THEN 'PUBLISHED'::"ContentStatus"
  ELSE 'DRAFT'::"ContentStatus"
END,
"publishedAt" = CASE
  WHEN "isPublic" = true THEN COALESCE("updatedAt", CURRENT_TIMESTAMP)
  ELSE NULL
END;

-- Backfill question moderation status from public paper
UPDATE "Question" q
SET "moderationStatus" = CASE
  WHEN p."isPublic" = true THEN 'PUBLISHED'::"ContentStatus"
  ELSE 'DRAFT'::"ContentStatus"
END
FROM "ExamPaper" p
WHERE q."paperId" = p."id";

-- Create a default examination container for existing org papers
INSERT INTO "OrganizationExamination" (
  "id", "title", "description", "category", "year", "status", "publishedAt",
  "randomizeQuestions", "allowCustomOrder", "duration", "practiceEnabled",
  "organizationId", "authorId", "createdAt", "updatedAt"
)
SELECT
  concat('legacy_exam_', p."id"),
  p."title",
  NULL,
  CASE WHEN p."year" IS NULL THEN 'CUSTOM'::"ExaminationCategory" ELSE 'YEARLY'::"ExaminationCategory" END,
  p."year",
  p."status",
  p."publishedAt",
  p."randomizeQuestions",
  p."allowCustomOrder",
  p."duration",
  p."practiceEnabled",
  p."organizationId",
  p."authorId",
  p."createdAt",
  p."updatedAt"
FROM "ExamPaper" p
WHERE p."organizationId" IS NOT NULL;

UPDATE "ExamPaper" p
SET "examinationId" = concat('legacy_exam_', p."id")
WHERE p."organizationId" IS NOT NULL;

UPDATE "Assignment" a
SET "examinationId" = p."examinationId"
FROM "ExamPaper" p
WHERE a."paperId" = p."id";

-- Indexes
CREATE INDEX "OrganizationExamination_organizationId_idx" ON "OrganizationExamination"("organizationId");
CREATE INDEX "OrganizationExamination_status_idx" ON "OrganizationExamination"("status");
CREATE INDEX "QuestionReviewNote_questionId_idx" ON "QuestionReviewNote"("questionId");
CREATE INDEX "ExamPaper_examinationId_idx" ON "ExamPaper"("examinationId");
CREATE INDEX "Assignment_examinationId_idx" ON "Assignment"("examinationId");

-- Foreign keys
ALTER TABLE "OrganizationExamination"
ADD CONSTRAINT "OrganizationExamination_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationExamination"
ADD CONSTRAINT "OrganizationExamination_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionReviewNote"
ADD CONSTRAINT "QuestionReviewNote_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionReviewNote"
ADD CONSTRAINT "QuestionReviewNote_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExamPaper"
ADD CONSTRAINT "ExamPaper_examinationId_fkey"
FOREIGN KEY ("examinationId") REFERENCES "OrganizationExamination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_examinationId_fkey"
FOREIGN KEY ("examinationId") REFERENCES "OrganizationExamination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
