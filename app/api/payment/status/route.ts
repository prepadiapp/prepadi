import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { UserRole, OrderStatus } from '@prisma/client';

export async function GET(request: Request) {
  const session = await getAuthSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false });
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  // 1. Fetch User details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
        organization: { include: { subscription: { include: { plan: true } } } }
    }
  });

  // 2. Determine Subscription Source
  let subscription = null;
  let isOrgMember = false;

  if (userRole === UserRole.ORGANIZATION) {
    const org = await prisma.organization.findUnique({ where: { ownerId: userId } });
    if (org) {
      subscription = await prisma.subscription.findUnique({
        where: { organizationId: org.id },
        include: { plan: true },
      });
    }
  } else {
    if (user?.organization?.subscription) {
        subscription = user.organization.subscription;
        isOrgMember = true;
    } else {
        subscription = await prisma.subscription.findUnique({
            where: { userId: userId },
            include: { plan: true },
        });
    }
  }

  // 3. Check for Pending Join Request
  // If user has a pending request, we DON'T consider them "missing subscription" 
  // because they are in a waiting state, not a "needs to pay" state.
  const pendingRequest = await prisma.joinRequest.findFirst({
      where: { userId, status: 'PENDING' }
  });

  // 4. Determine Payment Status
  let missingSubscription = !subscription;
  
  // If pending request exists, we override missingSubscription to FALSE to allow dashboard access (where they see the alert)
  if (pendingRequest && missingSubscription) {
      missingSubscription = false;
  }
  
  let needsPayment = false;
  let statusMessage = "";

  if (subscription) {
    const isPaidPlan = subscription.plan.price > 0;
    const hasExpired = subscription.endDate ? new Date(subscription.endDate) < new Date() : false;
    
    if (isPaidPlan && (!subscription.isActive || hasExpired)) {
       needsPayment = true;
       if (isOrgMember) {
           statusMessage = "Your organization's subscription has expired. Please contact your administrator.";
       } else {
           statusMessage = "Your subscription has expired.";
       }
    }
  }

  // 5. Check Payment History for "New User" logic
  const successfulOrders = await prisma.order.count({
    where: { userId: userId, status: OrderStatus.SUCCESSFUL }
  });
  const isNewUser = successfulOrders === 0;

  return NextResponse.json({
    authenticated: true,
    role: userRole,
    missingSubscription,
    needsPayment,
    planId: subscription?.planId,
    isNewUser,
    isOrgMember,
    statusMessage 
  });
}