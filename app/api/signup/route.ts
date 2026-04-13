import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/lib/mail';
import { randomUUID } from 'crypto';
import { PlanInterval, PlanType, UserRole } from '@prisma/client';
import { buildOrgPricingQuote, isSupportedOrgInterval, OrgBillingInterval } from '@/lib/org-pricing';

interface SignupBody {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  planId: string;
  orgName?: string;
  inviteToken?: string;
  skipPlan?: boolean;
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
    const body: SignupBody = await request.json();
    const { name, email, password, role, planId, orgName, inviteToken, skipPlan, orgPricingSelection } = body;

    // Validation Logic
    if (inviteToken || skipPlan) {
        // Invite/Join Flow: Plan ID not required
        if (!name || !email || !password) return new NextResponse('Missing fields', { status: 400 });
    } else {
        // Standard Flow: Plan ID required
        if (!name || !email || !password || !planId) {
            return new NextResponse('Missing required fields', { status: 400 });
        }
    }

    // Check Plan validity only if standard flow
    let plan = null;
    let orgQuote:
      | ReturnType<typeof buildOrgPricingQuote>
      | null = null;

    if (!inviteToken && !skipPlan && planId) {
        plan = await prisma.plan.findUnique({
          where: { id: planId },
          include: {
            seatBands: {
              orderBy: { minSeats: 'asc' },
            },
          },
        });
        if (!plan) return new NextResponse('Invalid Plan selected', { status: 400 });

        if (role === UserRole.ORGANIZATION) {
          if (!orgPricingSelection) {
            return new NextResponse('Missing organization pricing selection', { status: 400 });
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
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return new NextResponse('User already exists', { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      
      // 1. Invite Handling (Determine Org linkage)
      let organizationId = null;
      let isVerified = false;

      if (inviteToken) {
        const invite = await tx.orgInvite.findUnique({ where: { token: inviteToken } });
        if (!invite || invite.status !== 'PENDING') throw new Error("Invalid or expired invite");
        
        organizationId = invite.organizationId;
        isVerified = true; // Trust the token ownership
        
        // Delete invite to prevent reuse
        await tx.orgInvite.delete({ where: { id: invite.id } });
      }

      // 2. Create User
      const user = await tx.user.create({
        data: {
            name,
            email,
            hashedPassword,
            role: (inviteToken || skipPlan) ? UserRole.STUDENT : role, 
            organizationId, 
            emailVerified: isVerified ? new Date() : null
        },
      });

      // 3. Handle Organization Creation (If standard Org Signup)
      if (!inviteToken && !skipPlan && role === UserRole.ORGANIZATION) {
        if (!orgName) throw new Error('Organization Name is required');
        const org = await tx.organization.create({
          data: { name: orgName, ownerId: user.id },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { ownedOrganization: { connect: { id: org.id } } }
        });
        organizationId = org.id; 
      }

      // 4. Create Subscription (Standard Flow Only)
      if (!inviteToken && !skipPlan && plan) {
          const isPaidPlan = role === UserRole.ORGANIZATION ? (orgQuote?.amount || 0) > 0 : plan.price > 0;
          const effectiveInterval =
            role === UserRole.ORGANIZATION
              ? (orgQuote?.interval ?? PlanInterval.MONTHLY)
              : plan.interval;
          const endDate = calculateEndDate(effectiveInterval);
          
          const userIdToLink = role === UserRole.STUDENT ? user.id : null;
          const orgIdToLink = role === UserRole.ORGANIZATION ? organizationId : null;

          const subscription = await tx.subscription.create({
            data: {
              planId: plan.id,
              startDate: new Date(),
              endDate: endDate,
              isActive: !isPaidPlan,
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
      }

      // 5. Verification Email
      if (!isVerified) {
          const token = randomUUID();
          const expires = new Date(new Date().getTime() + 3600 * 1000);
          await tx.verificationToken.create({
            data: { identifier: email, token, expires },
          });

          await sendVerificationEmail(email, token);
      }
    });

    return NextResponse.json({ 
      success: true,
      requiresPayment:
        !inviteToken &&
        !skipPlan &&
        (role === UserRole.ORGANIZATION ? (orgQuote?.amount || 0) > 0 : (plan?.price || 0) > 0),
      planId: plan?.id,
    });

  } catch (error: any) {
    console.error('[SIGNUP_ERROR]', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
