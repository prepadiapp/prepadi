import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [plans, exams] = await Promise.all([
      prisma.plan.findMany({
        where: {
          isActive: true,
          type: "ORGANIZATION",
          orgPricingEnabled: true,
        },
        include: {
          seatBands: {
            orderBy: { minSeats: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.exam.findMany({
        where: {
          organizationId: null,
        },
        orderBy: [{ pricingCategory: "asc" }, { name: "asc" }],
      }),
    ]);

    return NextResponse.json({
      intervals: ["MONTHLY", "YEARLY"],
      plans,
      baseExams: exams.filter((exam) => exam.pricingCategory === "BASE"),
      specialExams: exams.filter((exam) => exam.pricingCategory === "SPECIAL"),
    });
  } catch (error) {
    console.error("[PUBLIC_ORG_PRICING_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
