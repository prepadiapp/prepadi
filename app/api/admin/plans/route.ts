import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const plans = await prisma.plan.findMany({
      include: {
        seatBands: {
          orderBy: { minSeats: 'asc' },
        },
      },
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
    const {
      name,
      description,
      price,
      interval,
      type,
      features,
      isActive,
      marketingBullets,
      maxBaseExamSelections,
      allowsSpecialExams,
      canCreateCustomExams,
      orgPricingEnabled,
      seatBands,
    } = body;

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
        marketingBullets: marketingBullets || undefined,
        maxBaseExamSelections:
          maxBaseExamSelections === null || maxBaseExamSelections === undefined || maxBaseExamSelections === ''
            ? null
            : Number(maxBaseExamSelections),
        allowsSpecialExams: Boolean(allowsSpecialExams),
        canCreateCustomExams: Boolean(canCreateCustomExams),
        orgPricingEnabled: Boolean(orgPricingEnabled),
        isActive: isActive ?? true,
        currency: 'NGN', // Default for now
        seatBands: Array.isArray(seatBands) && seatBands.length > 0
          ? {
              create: seatBands.map((band: any) => ({
                minSeats: Number(band.minSeats),
                maxSeats:
                  band.maxSeats === null || band.maxSeats === undefined || band.maxSeats === ''
                    ? null
                    : Number(band.maxSeats),
                monthlyPerStudent: Number(band.monthlyPerStudent || 0),
                yearlyPerStudent: Number(band.yearlyPerStudent || 0),
                isContactSales: Boolean(band.isContactSales),
              })),
            }
          : undefined,
      },
      include: {
        seatBands: true,
      },
    });

    return NextResponse.json(newPlan);
  } catch (error) {
    console.error('[PLANS_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
