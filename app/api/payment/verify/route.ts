import { getAuthSession } from '@/lib/auth';
import { Paystack } from '@/lib/payment/paystack';
import { PaymentService } from '@/lib/payment/payment-service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { reference } = await request.json();

    if (!reference) {
      return new NextResponse('Missing reference', { status: 400 });
    }

    console.log(`[VERIFY] Verifying reference: ${reference}`);

    // 1. Verify with Paystack (Server-to-Server check)
    // This ensures the payment actually happened on Paystack's end
    const verification = await Paystack.verify(reference);

    if (!verification.status || verification.data.status !== 'success') {
      console.warn(`[VERIFY] Paystack status: ${verification.data.status}`);
      return new NextResponse('Payment failed or pending', { status: 400 });
    }

    // 2. Fulfill the Order (Update DB)
    // We pass the full Paystack data object to our service to record details
    await PaymentService.fulfillOrder(reference, verification.data);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[PAYMENT_VERIFY_ERROR]', error);
    return new NextResponse(error.message || 'Verification Failed', { status: 500 });
  }
}