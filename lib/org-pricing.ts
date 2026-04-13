import { Exam, OrgPlanSeatBand, Plan } from "@prisma/client";

export type OrgPlanWithBands = Plan & {
  seatBands: OrgPlanSeatBand[];
};

export type OrgBillingInterval = "MONTHLY" | "YEARLY";

export type OrgPricingExam = Pick<
  Exam,
  | "id"
  | "name"
  | "shortName"
  | "pricingCategory"
  | "monthlyFlatFee"
  | "yearlyFlatFee"
  | "monthlyPerStudentFee"
  | "yearlyPerStudentFee"
>;

export interface OrgPricingSelectionInput {
  planId: string;
  interval: OrgBillingInterval;
  seatCount: number;
  baseExamIds: string[];
  specialExamIds: string[];
}

export interface OrgQuoteLineItem {
  label: string;
  amount: number;
  kind: "base" | "special_flat" | "special_per_student";
  examId?: string;
}

export interface OrgPricingQuote {
  planId: string;
  planName: string;
  interval: OrgBillingInterval;
  seatCount: number;
  selectedBaseExamIds: string[];
  selectedSpecialExamIds: string[];
  selectedExamIds: string[];
  seatBand: {
    minSeats: number;
    maxSeats: number | null;
    perStudent: number;
    isContactSales: boolean;
  };
  lineItems: OrgQuoteLineItem[];
  amount: number;
  contactSales: boolean;
}

const SUPPORTED_INTERVALS = new Set<OrgBillingInterval>(["MONTHLY", "YEARLY"]);

export function isSupportedOrgInterval(interval: string): interval is OrgBillingInterval {
  return SUPPORTED_INTERVALS.has(interval as OrgBillingInterval);
}

export function buildOrgPricingQuote(args: {
  plan: OrgPlanWithBands;
  exams: OrgPricingExam[];
  selection: OrgPricingSelectionInput;
}): OrgPricingQuote {
  const { plan, exams, selection } = args;
  const { interval, seatCount } = selection;

  if (!isSupportedOrgInterval(interval)) {
    throw new Error("Organizations can only be billed monthly or yearly.");
  }

  if (seatCount < 1) {
    throw new Error("Seat count must be at least 1.");
  }

  const baseExamMap = new Map(
    exams.filter((exam) => exam.pricingCategory === "BASE").map((exam) => [exam.id, exam])
  );
  const specialExamMap = new Map(
    exams.filter((exam) => exam.pricingCategory === "SPECIAL").map((exam) => [exam.id, exam])
  );

  const uniqueBaseExamIds = Array.from(new Set(selection.baseExamIds));
  const uniqueSpecialExamIds = Array.from(new Set(selection.specialExamIds));

  if (uniqueBaseExamIds.length + uniqueSpecialExamIds.length === 0) {
    throw new Error("Select at least one exam to continue.");
  }

  for (const examId of uniqueBaseExamIds) {
    if (!baseExamMap.has(examId)) {
      throw new Error("One or more selected base exams are invalid.");
    }
  }

  for (const examId of uniqueSpecialExamIds) {
    if (!specialExamMap.has(examId)) {
      throw new Error("One or more selected special exams are invalid.");
    }
  }

  if (plan.maxBaseExamSelections !== null && plan.maxBaseExamSelections !== undefined) {
    if (uniqueBaseExamIds.length > plan.maxBaseExamSelections) {
      throw new Error(`This plan allows at most ${plan.maxBaseExamSelections} base exams.`);
    }
  }

  if (!plan.allowsSpecialExams && uniqueSpecialExamIds.length > 0) {
    throw new Error("This plan does not allow special exams.");
  }

  const seatBand = plan.seatBands
    .slice()
    .sort((a, b) => a.minSeats - b.minSeats)
    .find((band) => {
      const withinMin = seatCount >= band.minSeats;
      const withinMax = band.maxSeats === null || seatCount <= band.maxSeats;
      return withinMin && withinMax;
    });

  if (!seatBand) {
    throw new Error("No pricing band is configured for the selected number of students.");
  }

  const perStudent = interval === "MONTHLY" ? seatBand.monthlyPerStudent : seatBand.yearlyPerStudent;

  const lineItems: OrgQuoteLineItem[] = [
    {
      label: `${plan.name} tier (${seatCount} students x N${perStudent.toLocaleString()})`,
      amount: seatCount * perStudent,
      kind: "base",
    },
  ];

  for (const examId of uniqueSpecialExamIds) {
    const exam = specialExamMap.get(examId)!;
    const flatFee = interval === "MONTHLY" ? exam.monthlyFlatFee : exam.yearlyFlatFee;
    const perStudentFee =
      interval === "MONTHLY" ? exam.monthlyPerStudentFee : exam.yearlyPerStudentFee;

    if (flatFee > 0) {
      lineItems.push({
        label: `${exam.name} premium access`,
        amount: flatFee,
        kind: "special_flat",
        examId,
      });
    }

    if (perStudentFee > 0) {
      lineItems.push({
        label: `${exam.name} (${seatCount} students x N${perStudentFee.toLocaleString()})`,
        amount: seatCount * perStudentFee,
        kind: "special_per_student",
        examId,
      });
    }
  }

  const amount = lineItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    planId: plan.id,
    planName: plan.name,
    interval,
    seatCount,
    selectedBaseExamIds: uniqueBaseExamIds,
    selectedSpecialExamIds: uniqueSpecialExamIds,
    selectedExamIds: [...uniqueBaseExamIds, ...uniqueSpecialExamIds],
    seatBand: {
      minSeats: seatBand.minSeats,
      maxSeats: seatBand.maxSeats,
      perStudent,
      isContactSales: seatBand.isContactSales,
    },
    lineItems,
    amount,
    contactSales: seatBand.isContactSales,
  };
}
