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

  // 1. Fetch Subscription (Student or Org)
  let subscription = null;

  if (userRole === UserRole.ORGANIZATION) {
    // Check Org Subscription
    const org = await prisma.organization.findUnique({ where: { ownerId: userId } });
    if (org) {
      subscription = await prisma.subscription.findUnique({
        where: { organizationId: org.id },
        include: { plan: true },
      });
    }
  } else {
    // Check Student Subscription
    subscription = await prisma.subscription.findUnique({
      where: { userId: userId },
      include: { plan: true },
    });
  }

  // 2. Determine Payment Status
  const missingSubscription = !subscription;
  
  let needsPayment = false;

  if (subscription) {
    const isPaidPlan = subscription.plan.price > 0;
    // Local Date Check: Is the end date in the past?
    const hasExpired = subscription.endDate ? new Date(subscription.endDate) < new Date() : false;
    
    // User needs to pay if:
    // A. Plan is Paid AND (Subscription is marked Inactive OR Date has Expired)
    if (isPaidPlan && (!subscription.isActive || hasExpired)) {
       needsPayment = true;
    }
  }

  // 3. Check for Payment History to differentiate "New" vs "Expired"
  // If the user has NEVER had a successful order, they are a new user pending activation.
  const successfulOrders = await prisma.order.count({
    where: {
      userId: userId,
      status: OrderStatus.SUCCESSFUL
    }
  });

  const isNewUser = successfulOrders === 0;

  return NextResponse.json({
    authenticated: true,
    role: userRole,
    missingSubscription,
    needsPayment,
    planId: subscription?.planId,
    isNewUser, 
  });
}