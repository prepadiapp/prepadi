import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/enums'; 
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' }, // Sort by price (Free first)
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error('[PLANS_GET_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, price, interval, type, features } = body;

    if (!name || !interval || !type) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const newPlan = await prisma.plan.create({
      data: {
        name,
        description,
        price: Number(price), // Ensure number
        interval, // e.g. MONTHLY
        type,     // STUDENT or ORGANIZATION
        features: features || {}, // JSON object
        currency: 'NGN', // Default for now
      },
    });

    return NextResponse.json(newPlan);
  } catch (error) {
    console.error('[PLANS_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}