/*
  Warnings:

  - You are about to drop the column `durationMinutes` on the `Assignment` table. All the data in the column will be lost.
  - Added the required column `title` to the `Assignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "durationMinutes",
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "title" TEXT NOT NULL;
