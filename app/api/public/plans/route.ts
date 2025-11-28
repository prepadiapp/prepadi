import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'STUDENT' or 'ORGANIZATION'

    const where: any = {
      isActive: true, // Only show active plans
    };

    if (type) {
      where.type = type;
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: { price: 'asc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('[PUBLIC_PLANS_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}