-- DropIndex
DROP INDEX "Assignment_examinationId_idx";

-- DropIndex
DROP INDEX "ExamPaper_examinationId_idx";

-- DropIndex
DROP INDEX "OrganizationExamination_organizationId_idx";

-- DropIndex
DROP INDEX "OrganizationExamination_status_idx";

-- DropIndex
DROP INDEX "QuestionReviewNote_questionId_idx";

-- AlterTable
ALTER TABLE "OrganizationExamination" ALTER COLUMN "updatedAt" DROP DEFAULT;
