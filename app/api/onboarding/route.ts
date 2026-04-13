import { getAuthSession } from '@/lib/auth';
import { buildOrgPricingQuote, isSupportedOrgInterval, OrgBillingInterval } from '@/lib/org-pricing';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
// Import the Enums directly from the client
import { UserRole, PlanInterval, PlanType } from '@prisma/client'; 

interface OnboardingBody {
  role: UserRole;
  planId: string;
  orgName?: string;
  orgPricingSelection?: {
    planId: string;
    interval: OrgBillingInterval;
    seatCount: number;
    baseExamIds: string[];
    specialExamIds: string[];
  };
}

function calculateEndDate(interval: PlanInterval): Date | null {
  const date = new Date();
  switch (interval) {
    case PlanInterval.MONTHLY: date.setMonth(date.getMonth() + 1); return date;
    case PlanInterval.QUARTERLY: date.setMonth(date.getMonth() + 3); return date;
    case PlanInterval.BIANNUALLY: date.setMonth(date.getMonth() + 6); return date;
    case PlanInterval.YEARLY: date.setFullYear(date.getFullYear() + 1); return date;
    case PlanInterval.LIFETIME: return null;
    default: return new Date();
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body: OnboardingBody = await request.json();
    const { role, planId, orgName, orgPricingSelection } = body;

    console.log("[ONBOARDING] Processing for:", session.user.email, "Role:", role, "Plan ID:", planId);

    if (!role || !planId) {
      return new NextResponse('Missing role or plan', { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        seatBands: {
          orderBy: { minSeats: 'asc' },
        },
      },
    });
    if (!plan) return new NextResponse('Invalid Plan', { status: 400 });

    let orgQuote:
      | ReturnType<typeof buildOrgPricingQuote>
      | null = null;

    if (role === UserRole.ORGANIZATION) {
      if (!orgPricingSelection) {
        return new NextResponse('Missing organization pricing configuration', { status: 400 });
      }

      if (!isSupportedOrgInterval(orgPricingSelection.interval)) {
        return new NextResponse('Unsupported organization billing interval', { status: 400 });
      }

      if (plan.type !== PlanType.ORGANIZATION || !plan.orgPricingEnabled) {
        return new NextResponse('Selected plan is not available for organization pricing', { status: 400 });
      }

      const exams = await prisma.exam.findMany({
        where: { organizationId: null },
      });

      orgQuote = buildOrgPricingQuote({
        plan,
        exams,
        selection: {
          planId: orgPricingSelection.planId,
          interval: orgPricingSelection.interval,
          seatCount: Number(orgPricingSelection.seatCount),
          baseExamIds: orgPricingSelection.baseExamIds || [],
          specialExamIds: orgPricingSelection.specialExamIds || [],
        },
      });

      if (orgQuote.contactSales) {
        return new NextResponse('This seat range requires contacting sales.', { status: 400 });
      }
    }

    // --- DEBUG LOGS ---
    console.log(`[ONBOARDING] Plan Found: ${plan.name}`);
    console.log(`[ONBOARDING] Plan Price: ${plan.price} (Type: ${typeof plan.price})`);
    
    // Check if price > 0
    const isPaidPlan = role === UserRole.ORGANIZATION ? (orgQuote?.amount || 0) > 0 : plan.price > 0;
    console.log(`[ONBOARDING] isPaidPlan calculated as: ${isPaidPlan}`);
    // ------------------

    await prisma.$transaction(async (tx) => {
      // 1. Update User Role
      await tx.user.update({
        where: { id: session.user.id },
        data: { role: role },
      });

      // 2. Handle Org
      let organizationId: string | null = null;
      
      // Use Strict Enum Comparison
      if (role === UserRole.ORGANIZATION) {
        if (!orgName) throw new Error('Organization Name is required');
        const org = await tx.organization.create({
          data: { name: orgName, ownerId: session.user.id },
        });
        await tx.user.update({
          where: { id: session.user.id },
          data: { ownedOrganization: { connect: { id: org.id } } }
        });
        organizationId = org.id;
      }

      // 3. Create Subscription
      const effectiveInterval =
        role === UserRole.ORGANIZATION ? (orgQuote?.interval ?? PlanInterval.MONTHLY) : plan.interval;
      const endDate = calculateEndDate(effectiveInterval);
      
      // Determine keys based on Strict Enum Comparison
      const userIdToLink = role === UserRole.STUDENT ? session.user.id : null;
      const orgIdToLink = role === UserRole.ORGANIZATION ? organizationId : null;

      console.log("[ONBOARDING] Creating Subscription... Active Status:", !isPaidPlan);

      const subscription = await tx.subscription.create({
        data: {
          planId: plan.id,
          startDate: new Date(),
          endDate: endDate,
          isActive: !isPaidPlan, // Active only if free
          userId: userIdToLink,
          organizationId: orgIdToLink,
          pricingInterval: role === UserRole.ORGANIZATION ? effectiveInterval : null,
          seatCount: role === UserRole.ORGANIZATION ? orgQuote?.seatCount : null,
          quoteSnapshot: role === UserRole.ORGANIZATION ? (orgQuote as unknown as object) : undefined,
        },
      });

      if (role === UserRole.ORGANIZATION && orgQuote && orgQuote.selectedExamIds.length > 0) {
        await tx.subscriptionExamAccess.createMany({
          data: orgQuote.selectedExamIds.map((examId) => ({
            subscriptionId: subscription.id,
            examId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json({ 
      success: true,
      requiresPayment: role === UserRole.ORGANIZATION ? (orgQuote?.amount || 0) > 0 : plan.price > 0,
      planId: plan.id,
    });

  } catch (error: any) {
    console.error('[ONBOARDING_ERROR]', error);
    return new NextResponse(error.message || 'Server Error', { status: 500 });
  }
}
