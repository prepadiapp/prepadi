import { prisma } from '@/lib/prisma';
import { OrderStatus, PlanInterval, PlanType } from '@prisma/client';

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
    console.log(`[PaymentService] Fulfilling order for ref: ${reference}`);
    
    // 1. Find the pending order
    const order = await prisma.order.findUnique({
      where: { reference },
      include: { plan: true, user: true },
    });

    if (!order) {
      console.error(`[PaymentService] Order not found for ref: ${reference}`);
      throw new Error(`Order not found for reference: ${reference}`);
    }
    
    console.log(`[PaymentService] Order found: ${order.id}, Status: ${order.status}`);

    // If already successful, stop (Idempotency check)
    if (order.status === OrderStatus.SUCCESSFUL) {
      console.log(`[PaymentService] Order already successful. Skipping.`);
      return;
    }

    // 2. Verify amounts (Security check)
    // Paystack returns amount in Kobo, we store in Naira.
    const expectedKobo = order.amount * 100;
    console.log(`[PaymentService] Verifying amount. Expected (Kobo): ${expectedKobo}, Received: ${paystackData.amount}`);

    if (expectedKobo !== paystackData.amount) {
      console.error(`[PaymentService] Amount mismatch! Marking order as FAILED.`);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED },
      });
      throw new Error('Payment amount mismatch');
    }

    // 3. Perform Database Updates in a Transaction
    try {
      await prisma.$transaction(async (tx) => {
        console.log(`[PaymentService] Starting transaction...`);

        // A. Update Order
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.SUCCESSFUL },
        });
        console.log(`[PaymentService] Order status updated to SUCCESSFUL`);

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
        console.log(`[PaymentService] Transaction record created`);

        // C. Create/Update Subscription
        const endDate = calculateEndDate(order.plan.interval);
        console.log(`[PaymentService] Calculated End Date: ${endDate}`);
        
        if (order.plan.type === PlanType.ORGANIZATION) {
          console.log(`[PaymentService] Processing ORGANIZATION plan`);
          // It's an Organization Plan. We need to find the Org owned by this user.
          const org = await tx.organization.findUnique({
            where: { ownerId: order.userId },
          });
          
          if (org) {
            console.log(`[PaymentService] Organization found: ${org.id}. Upserting subscription...`);
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
          } else {
             console.error(`[PaymentService] Organization NOT found for owner: ${order.userId}`);
             throw new Error('Organization not found for user');
          }
        } else {
          console.log(`[PaymentService] Processing STUDENT plan for user: ${order.userId}`);
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
        console.log(`[PaymentService] Subscription updated successfully`);
      });
      console.log(`[PaymentService] Transaction committed successfully`);
    } catch (txError) {
      console.error(`[PaymentService] Transaction FAILED:`, txError);
      throw txError; // Re-throw to propagate error to caller
    }
  },

  async checkPendingPayment(userId: string): Promise<{ needsPayment: boolean; planId?: string }> {
    const sub = await prisma.subscription.findFirst({
      where: { userId },
      include: { plan: true },
    });

    if (sub && !sub.isActive && sub.plan.price > 0) {
      return { needsPayment: true, planId: sub.planId };
    }

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