import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';

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

  // 2. Determine Status
  const missingSubscription = !subscription;
  const needsPayment = subscription ? (!subscription.isActive && subscription.plan.price > 0) : false;

  return NextResponse.json({
    authenticated: true,
    role: userRole,
    missingSubscription,
    needsPayment,
    planId: subscription?.planId,
  });
}