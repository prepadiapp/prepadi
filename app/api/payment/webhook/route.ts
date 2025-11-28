import { PaymentService } from '@/lib/payment/payment-service';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return new NextResponse('Server Error', { status: 500 });

    // 1. Validate Signature
    // Paystack sends a hash in the header. We must match it to verify authenticity.
    const signature = request.headers.get('x-paystack-signature');
    const body = await request.text(); // Get raw body as text for hashing

    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

    if (hash !== signature) {
      return new NextResponse('Invalid Signature', { status: 401 });
    }

    // 2. Process Event
    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
      const { reference } = event.data;
      console.log(`[WEBHOOK] Processing successful payment: ${reference}`);
      
      // Call our service logic
      await PaymentService.fulfillOrder(reference, event.data);
    }

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('[PAYMENT_WEBHOOK_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}