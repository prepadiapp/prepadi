ALTER TABLE "ExamPaper"
ADD COLUMN "revisionGroupId" TEXT;

UPDATE "ExamPaper"
SET "revisionGroupId" = "id"
WHERE "revisionGroupId" IS NULL;

ALTER TABLE "ExamPaper"
ALTER COLUMN "revisionGroupId" SET NOT NULL;

CREATE INDEX "ExamPaper_revisionGroupId_idx" ON "ExamPaper"("revisionGroupId");
