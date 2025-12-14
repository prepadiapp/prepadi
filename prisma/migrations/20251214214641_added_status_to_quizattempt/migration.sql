-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS';
