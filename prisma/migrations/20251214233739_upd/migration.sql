-- AlterTable
ALTER TABLE "UserAnswer" ADD COLUMN     "score" INTEGER,
ALTER COLUMN "isCorrect" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "UserAnswer_quizAttemptId_idx" ON "UserAnswer"("quizAttemptId");
