import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
// Import the Enums directly from the client
import { UserRole, PlanInterval } from '@prisma/client'; 

interface OnboardingBody {
  role: UserRole;
  planId: string;
  orgName?: string;
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
    const { role, planId, orgName } = body;

    console.log("[ONBOARDING] Processing for:", session.user.email, "Role:", role, "Plan ID:", planId);

    if (!role || !planId) {
      return new NextResponse('Missing role or plan', { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return new NextResponse('Invalid Plan', { status: 400 });

    // --- DEBUG LOGS ---
    console.log(`[ONBOARDING] Plan Found: ${plan.name}`);
    console.log(`[ONBOARDING] Plan Price: ${plan.price} (Type: ${typeof plan.price})`);
    
    // Check if price > 0
    const isPaidPlan = plan.price > 0;
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
      const endDate = calculateEndDate(plan.interval);
      
      // Determine keys based on Strict Enum Comparison
      const userIdToLink = role === UserRole.STUDENT ? session.user.id : null;
      const orgIdToLink = role === UserRole.ORGANIZATION ? organizationId : null;

      console.log("[ONBOARDING] Creating Subscription... Active Status:", !isPaidPlan);

      await tx.subscription.create({
        data: {
          planId: plan.id,
          startDate: new Date(),
          endDate: endDate,
          isActive: !isPaidPlan, // Active only if free
          userId: userIdToLink,
          organizationId: orgIdToLink,
        },
      });
    });

    return NextResponse.json({ 
      success: true,
      requiresPayment: plan.price > 0,
      planId: plan.id,
    });

  } catch (error: any) {
    console.error('[ONBOARDING_ERROR]', error);
    return new NextResponse(error.message || 'Server Error', { status: 500 });
  }
}