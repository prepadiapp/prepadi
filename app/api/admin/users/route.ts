import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, PlanInterval } from '@prisma/client';
import { NextResponse } from 'next/server';

const PAGE_SIZE = 20;

// Helper to calculate subscription end date
function calculateEndDate(interval: PlanInterval): Date | null {
  const date = new Date();
  switch (interval) {
    case 'MONTHLY': date.setMonth(date.getMonth() + 1); return date;
    case 'QUARTERLY': date.setMonth(date.getMonth() + 3); return date;
    case 'BIANNUALLY': date.setMonth(date.getMonth() + 6); return date;
    case 'YEARLY': date.setFullYear(date.getFullYear() + 1); return date;
    case 'LIFETIME': return null;
    default: return new Date();
  }
}

/**
 * GET: Fetch all users
 */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q'); 
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || `${PAGE_SIZE}`);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, totalCount] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { // Include relations for full details
             organization: { select: { id: true, name: true } },
             ownedOrganization: { select: { id: true, name: true } },
             subscription: { include: { plan: true } },
             _count: { select: { quizAttempts: true } }
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      organizationName: user.organization?.name,
      ownedOrganizationName: user.ownedOrganization?.name,
      planName: user.subscription?.plan?.name,
      verified: !!user.emailVerified,
      joined: user.createdAt,
      attempts: user._count.quizAttempts,
    }));

    return NextResponse.json({
      users: formattedUsers,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });

  } catch (error) {
    console.error('[USERS_GET_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * DELETE: Remove a user
 */
export async function DELETE(request: Request) {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return new NextResponse("User ID required", { status: 400 });

    try {
        await prisma.user.delete({ where: { id } });
        return new NextResponse("User deleted");
    } catch (error) {
        console.error("Delete user error", error);
        return new NextResponse("Failed to delete user", { status: 500 });
    }
}

/**
 * PATCH: Update a user (Org, Role, Plan)
 */
export async function PATCH(request: Request) {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await request.json();
        const { userId, organizationId, planId, role, isActive } = body;

        if (!userId) return new NextResponse("User ID required", { status: 400 });

        // Build update data
        const updateData: any = {};
        if (organizationId !== undefined) updateData.organizationId = organizationId;
        if (role) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);

        await prisma.$transaction(async (tx) => {
            // 1. Update User basic info
            if (Object.keys(updateData).length > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: updateData
                });
            }

            // 2. Handle Plan Change/Assignment
            if (planId) {
                if (planId === 'none') {
                     // Cancel existing subscription
                     await tx.subscription.deleteMany({ where: { userId } });
                } else {
                    const plan = await tx.plan.findUnique({ where: { id: planId } });
                    if (plan) {
                        // Upsert subscription
                        // Note: If user has an org subscription, this overrides user-level sub logic
                        // but schema allows both or checks. We assume user-level sub for now.
                        
                        // We need to check if a sub exists to update or create
                        const existingSub = await tx.subscription.findUnique({ where: { userId } });

                        const subData = {
                            planId: plan.id,
                            startDate: new Date(),
                            endDate: calculateEndDate(plan.interval),
                            isActive: true // Admin granted, so active
                        };

                        if (existingSub) {
                            await tx.subscription.update({
                                where: { id: existingSub.id },
                                data: subData
                            });
                        } else {
                            await tx.subscription.create({
                                data: {
                                    ...subData,
                                    userId: userId
                                }
                            });
                        }
                    }
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update user error", error);
        return new NextResponse("Failed to update user", { status: 500 });
    }
}
