import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
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

    await prisma.orgPlanSeatBand.deleteMany({
      where: { planId: id },
    });

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        description,
        price: Number(price),
        interval,
        type,
        features,
        isActive,
        marketingBullets: marketingBullets || undefined,
        maxBaseExamSelections:
          maxBaseExamSelections === null || maxBaseExamSelections === undefined || maxBaseExamSelections === ''
            ? null
            : Number(maxBaseExamSelections),
        allowsSpecialExams: Boolean(allowsSpecialExams),
        canCreateCustomExams: Boolean(canCreateCustomExams),
        orgPricingEnabled: Boolean(orgPricingEnabled),
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

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('[PLANS_PATCH_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    // NOTE: In a real app, we might want to "archive" instead of delete 
    // if users are subscribed. For now, we allow delete.
    await prisma.plan.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[PLANS_DELETE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
