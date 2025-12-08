-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "aiContext" JSONB,
ADD COLUMN     "markingGuide" TEXT;

-- AlterTable
ALTER TABLE "UserAnswer" ADD COLUMN     "aiFeedback" TEXT,
ADD COLUMN     "textAnswer" TEXT;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
