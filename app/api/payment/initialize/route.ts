import { getAuthSession } from '@/lib/auth';
import { buildOrgPricingQuote, isSupportedOrgInterval } from '@/lib/org-pricing';
import { prisma } from '@/lib/prisma';
import { Paystack } from '@/lib/payment/paystack';
import { PaymentService } from '@/lib/payment/payment-service';
import { NextResponse } from 'next/server';
import { PlanInterval, PlanType } from '@prisma/client';


export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { planId, interval, seatCount, baseExamIds, specialExamIds } = body;

    if (!planId) return new NextResponse('Missing planId', { status: 400 });

    // 1. Get Plan Details
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        seatBands: {
          orderBy: { minSeats: 'asc' },
        },
      },
    });
    if (!plan) return new NextResponse('Invalid Plan', { status: 404 });

    let amount = plan.price;
    let pricingInterval: PlanInterval | null = null;
    let resolvedSeatCount: number | null = null;
    let quoteSnapshot: Record<string, unknown> | null = null;

    if (plan.type === PlanType.ORGANIZATION) {
      if (interval && seatCount) {
        if (!isSupportedOrgInterval(interval)) {
          return new NextResponse('Unsupported interval', { status: 400 });
        }

        const exams = await prisma.exam.findMany({
          where: { organizationId: null },
        });

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

        if (quote.contactSales) {
          return new NextResponse('Selected seat range requires contacting sales.', {
            status: 400,
          });
        }

        amount = quote.amount;
        pricingInterval = quote.interval;
        resolvedSeatCount = quote.seatCount;
        quoteSnapshot = quote as unknown as Record<string, unknown>;
      } else {
        const org = await prisma.organization.findUnique({
          where: { ownerId: session.user.id },
          include: {
            subscription: true,
          },
        });

        const pendingQuote = org?.subscription?.quoteSnapshot as Record<string, unknown> | null;

        if (!pendingQuote || typeof pendingQuote.amount !== 'number') {
          return new NextResponse('Organization pricing configuration is missing.', { status: 400 });
        }

        amount = pendingQuote.amount;
        pricingInterval = (org?.subscription?.pricingInterval ?? pendingQuote.interval) as PlanInterval | null;
        resolvedSeatCount =
          org?.subscription?.seatCount ?? (typeof pendingQuote.seatCount === 'number' ? pendingQuote.seatCount : null);
        quoteSnapshot = pendingQuote;
      }
    }

    // 2. Generate Unique Reference using the universal 'crypto' API
    // This uses the global 'crypto' object available in Next.js/Vercel.
    const reference = `PREP_${crypto.randomUUID()}`;

    // 3. Create Pending Order in DB
    // We create the order HERE with 'reference'.
    await PaymentService.createOrder(session.user.id, plan.id, amount, reference, {
      pricingInterval,
      seatCount: resolvedSeatCount,
      quoteSnapshot,
    });

    // 4. Initialize Paystack
    const callbackUrl = `${process.env.NEXTAUTH_URL}/dashboard`; 
    
    const paystackResponse = await Paystack.initialize(
      session.user.email!,
      amount, 
      callbackUrl,
      {
        custom_fields: [
          { display_name: "Plan", variable_name: "plan_name", value: plan.name },
          { display_name: "User ID", variable_name: "user_id", value: session.user.id }
        ]
      },
      reference // <--- IMPORTANT: Pass our generated reference to Paystack
    );

    if (!paystackResponse.status) {
      return new NextResponse(paystackResponse.message, { status: 400 });
    }

    // 5. Return Full Data for Inline Popup
    // The reference returned by Paystack will now match 'PREP_...'
    return NextResponse.json({ 
      url: paystackResponse.data.authorization_url,
      reference: paystackResponse.data.reference,
      access_code: paystackResponse.data.access_code,
      amount: amount * 100 
    });

  } catch (error) {
    console.error('[PAYMENT_INIT_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
