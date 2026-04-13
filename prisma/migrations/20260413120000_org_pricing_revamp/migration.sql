-- CreateEnum
CREATE TYPE "ExamPricingCategory" AS ENUM ('BASE', 'SPECIAL');

-- AlterTable
ALTER TABLE "Plan"
ADD COLUMN "marketingBullets" JSONB,
ADD COLUMN "maxBaseExamSelections" INTEGER,
ADD COLUMN "allowsSpecialExams" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canCreateCustomExams" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "orgPricingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subscription"
ADD COLUMN "pricingInterval" "PlanInterval",
ADD COLUMN "seatCount" INTEGER,
ADD COLUMN "quoteSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "pricingInterval" "PlanInterval",
ADD COLUMN "seatCount" INTEGER,
ADD COLUMN "quoteSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Exam"
ADD COLUMN "pricingCategory" "ExamPricingCategory" NOT NULL DEFAULT 'BASE',
ADD COLUMN "monthlyFlatFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "yearlyFlatFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "monthlyPerStudentFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "yearlyPerStudentFee" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrgPlanSeatBand" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "minSeats" INTEGER NOT NULL,
    "maxSeats" INTEGER,
    "monthlyPerStudent" INTEGER NOT NULL,
    "yearlyPerStudent" INTEGER NOT NULL,
    "isContactSales" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgPlanSeatBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionExamAccess" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionExamAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgPlanSeatBand_planId_idx" ON "OrgPlanSeatBand"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionExamAccess_subscriptionId_examId_key" ON "SubscriptionExamAccess"("subscriptionId", "examId");

-- CreateIndex
CREATE INDEX "SubscriptionExamAccess_examId_idx" ON "SubscriptionExamAccess"("examId");

-- AddForeignKey
ALTER TABLE "OrgPlanSeatBand" ADD CONSTRAINT "OrgPlanSeatBand_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionExamAccess" ADD CONSTRAINT "SubscriptionExamAccess_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionExamAccess" ADD CONSTRAINT "SubscriptionExamAccess_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
