import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserRole, PlanInterval } from '@prisma/client';

// Helper for date calculation
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

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { 
        name, 
        email, 
        password, 
        role, 
        organizationId, 
        newOrgName,
        planId // NEW: Optional Plan ID to assign
    } = body;

    if (!email || !password || !role) {
        return new NextResponse("Missing required fields", { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return new NextResponse("User already exists with this email", { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
        // 1. Create User
        const user = await tx.user.create({
            data: {
                name,
                email,
                hashedPassword,
                role: role as UserRole,
                emailVerified: new Date(),
                organizationId: (role === 'STUDENT' && organizationId) ? organizationId : undefined
            }
        });

        // 2. Handle Org Owner
        if (role === 'ORGANIZATION' && newOrgName) {
            const org = await tx.organization.create({
                data: {
                    name: newOrgName,
                    ownerId: user.id
                }
            });
            await tx.user.update({
                where: { id: user.id },
                data: { ownedOrganization: { connect: { id: org.id } } }
            });
        }

        // 3. Handle Plan Assignment (If selected)
        if (planId && planId !== 'none') {
            const plan = await tx.plan.findUnique({ where: { id: planId } });
            if (plan) {
                // Determine who gets the subscription
                // If it's an Org Owner, usually the subscription is attached to the Organization entity
                // If Student, attached to User.
                
                let orgIdForSub = null;
                let userIdForSub = null;

                if (role === 'ORGANIZATION') {
                    // Fetch the org we just created or linked
                    // Since we are inside a transaction, if we just created an org above, we can query it?
                    // Actually, for simplicity in this flow, if it's an org owner, we attach to their *Owned Organization*.
                    const ownedOrg = await tx.organization.findUnique({ where: { ownerId: user.id } });
                    if (ownedOrg) orgIdForSub = ownedOrg.id;
                } else {
                    userIdForSub = user.id;
                }

                if (orgIdForSub || userIdForSub) {
                    await tx.subscription.create({
                        data: {
                            planId: plan.id,
                            startDate: new Date(),
                            endDate: calculateEndDate(plan.interval),
                            isActive: true, // Admin created = Paid/Active
                            userId: userIdForSub,
                            organizationId: orgIdForSub
                        }
                    });
                }
            }
        }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[ADMIN_CREATE_USER]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}