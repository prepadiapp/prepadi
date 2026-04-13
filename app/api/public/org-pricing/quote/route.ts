import { NextResponse } from "next/server";

import { buildOrgPricingQuote, isSupportedOrgInterval } from "@/lib/org-pricing";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId, interval, seatCount, baseExamIds, specialExamIds } = body;

    if (!planId || !interval || !seatCount) {
      return new NextResponse("Missing pricing configuration.", { status: 400 });
    }

    if (!isSupportedOrgInterval(interval)) {
      return new NextResponse("Unsupported billing interval.", { status: 400 });
    }

    const [plan, exams] = await Promise.all([
      prisma.plan.findFirst({
        where: {
          id: planId,
          type: "ORGANIZATION",
          isActive: true,
          orgPricingEnabled: true,
        },
        include: {
          seatBands: {
            orderBy: { minSeats: "asc" },
          },
        },
      }),
      prisma.exam.findMany({
        where: {
          organizationId: null,
        },
      }),
    ]);

    if (!plan) {
      return new NextResponse("Invalid organization plan.", { status: 404 });
    }

    const quote = buildOrgPricingQuote({
      plan,
      exams,
      selection: {
        planId,
        interval,
        seatCount: Number(seatCount),
        baseExamIds: Array.isArray(baseExamIds) ? baseExamIds : [],
        specialExamIds: Array.isArray(specialExamIds) ? specialExamIds : [],
      },
    });

    return NextResponse.json(quote);
  } catch (error: any) {
    console.error("[PUBLIC_ORG_PRICING_QUOTE_ERROR]", error);
    return new NextResponse(error.message || "Failed to generate quote.", {
      status: 400,
    });
  }
}
