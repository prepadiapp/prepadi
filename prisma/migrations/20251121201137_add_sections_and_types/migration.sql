-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('OBJECTIVE', 'THEORY');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'OBJECTIVE';

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "passage" TEXT,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
