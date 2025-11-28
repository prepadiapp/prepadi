import { prisma } from '@/lib/prisma';
import { OrderStatus, PlanInterval, PlanType, Subscription } from '@prisma/client';

/**
 * Calculates the end date based on the plan interval.
 */
function calculateEndDate(interval: PlanInterval): Date | null {
  const date = new Date();
  switch (interval) {
    case 'MONTHLY':
      date.setMonth(date.getMonth() + 1);
      return date;
    case 'QUARTERLY':
      date.setMonth(date.getMonth() + 3);
      return date;
    case 'BIANNUALLY':
      date.setMonth(date.getMonth() + 6);
      return date;
    case 'YEARLY':
      date.setFullYear(date.getFullYear() + 1);
      return date;
    case 'LIFETIME':
      return null; // No expiry
    default:
      return new Date(); // Fallback
  }
}

export const PaymentService = {
  /**
   * Creates a pending order in the database
   */
  createOrder: async (userId: string, planId: string, amount: number, reference: string) => {
    return prisma.order.create({
      data: {
        userId,
        planId,
        amount,
        currency: 'NGN',
        status: OrderStatus.PENDING,
        reference,
      },
    });
  },

  /**
   * Fulfills an order: Updates Order, Creates Transaction, Updates Subscription.
   * This is idempotent (safe to call multiple times).
   */
  fulfillOrder: async (reference: string, paystackData: any) => {
    // 1. Find the pending order
    const order = await prisma.order.findUnique({
      where: { reference },
      include: { plan: true, user: true },
    });

    if (!order) throw new Error(`Order not found for reference: ${reference}`);
    
    // If already successful, stop (Idempotency check)
    if (order.status === OrderStatus.SUCCESSFUL) return;

    // 2. Verify amounts (Security check)
    // Paystack returns amount in Kobo, we store in Naira (or whatever your Plan uses). 
    // Let's assume DB stores Naira for simplicity in UI, so we multiply DB by 100 to compare with Paystack.
    if (order.amount * 100 !== paystackData.amount) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED },
      });
      throw new Error('Payment amount mismatch');
    }

    // 3. Perform Database Updates in a Transaction
    await prisma.$transaction(async (tx) => {
      // A. Update Order
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.SUCCESSFUL },
      });

      // B. Create Transaction Record
      await tx.transaction.create({
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: 'NGN',
          status: 'success',
          provider: 'PAYSTACK',
          providerRef: String(paystackData.id), // Paystack's internal ID
          paymentDate: new Date(),
        },
      });

      // C. Create/Update Subscription
      const endDate = calculateEndDate(order.plan.interval);
      
      // Determine if this is a Student or Org subscription
      // The Plan model tells us who it's for.
      if (order.plan.type === PlanType.ORGANIZATION) {
        // It's an Organization Plan. We need to find the Org owned by this user.
        const org = await tx.organization.findUnique({
          where: { ownerId: order.userId },
        });
        
        if (org) {
          await tx.subscription.upsert({
            where: { organizationId: org.id },
            create: {
              organizationId: org.id,
              planId: order.planId,
              startDate: new Date(),
              endDate: endDate,
              isActive: true,
            },
            update: {
              planId: order.planId,
              startDate: new Date(), // Renew start date
              endDate: endDate,      // Extend end date
              isActive: true,
            },
          });
        }
      } else {
        // It's a Student Plan
        await tx.subscription.upsert({
          where: { userId: order.userId },
          create: {
            userId: order.userId,
            planId: order.planId,
            startDate: new Date(),
            endDate: endDate,
            isActive: true,
          },
          update: {
            planId: order.planId,
            startDate: new Date(),
            endDate: endDate,
            isActive: true,
          },
        });
      }
    });
  },

  async checkPendingPayment(userId: string): Promise<{ needsPayment: boolean; planId?: string }> {
    const sub = await prisma.subscription.findFirst({
      where: { userId },
      include: { plan: true },
    });

    // If user has a subscription, but it's inactive, AND the plan is paid...
    if (sub && !sub.isActive && sub.plan.price > 0) {
      return { needsPayment: true, planId: sub.planId };
    }

    // Also check Organization subscription if they are an Org Owner
    const org = await prisma.organization.findUnique({ where: { ownerId: userId } });
    if (org) {
      const orgSub = await prisma.subscription.findFirst({
        where: { organizationId: org.id },
        include: { plan: true },
      });
      if (orgSub && !orgSub.isActive && orgSub.plan.price > 0) {
        return { needsPayment: true, planId: orgSub.planId };
      }
    }

    return { needsPayment: false };
  },
};