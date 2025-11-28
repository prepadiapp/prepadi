import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Paystack } from '@/lib/payment/paystack';
import { PaymentService } from '@/lib/payment/payment-service';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) return new NextResponse('Missing planId', { status: 400 });

    // 1. Get Plan Details
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return new NextResponse('Invalid Plan', { status: 404 });

    // 2. Generate Unique Reference
    const reference = `PREP_${randomUUID()}`;

    // 3. Create Pending Order in DB
    await PaymentService.createOrder(session.user.id, plan.id, plan.price, reference);

    // 4. Initialize Paystack
    // Allow local development callback handling
    const callbackUrl = `${process.env.NEXTAUTH_URL}/dashboard/billing?status=success`;
    
    const paystackResponse = await Paystack.initialize(
      session.user.email!,
      plan.price,
      callbackUrl,
      {
        custom_fields: [
          { display_name: "Plan", variable_name: "plan_name", value: plan.name },
          { display_name: "User ID", variable_name: "user_id", value: session.user.id }
        ]
      }
    );

    if (!paystackResponse.status) {
      return new NextResponse(paystackResponse.message, { status: 400 });
    }

    // 5. Return URL to frontend
    return NextResponse.json({ url: paystackResponse.data.authorization_url });

    return NextResponse.json({ 
      url: paystackResponse.data.authorization_url,
      reference: paystackResponse.data.reference,
      access_code: paystackResponse.data.access_code 
    });

  } catch (error) {
    console.error('[PAYMENT_INIT_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}