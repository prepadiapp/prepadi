/*
  Warnings:

  - You are about to drop the `_ExamSubjects` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ExamSubjects" DROP CONSTRAINT "_ExamSubjects_A_fkey";

-- DropForeignKey
ALTER TABLE "_ExamSubjects" DROP CONSTRAINT "_ExamSubjects_B_fkey";

-- DropTable
DROP TABLE "_ExamSubjects";
