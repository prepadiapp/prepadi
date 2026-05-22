import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, PlanInterval, Prisma } from '@prisma/client';
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

async function deleteAttemptsByWhere(tx: Prisma.TransactionClient, where: Prisma.QuizAttemptWhereInput) {
    const attempts = await tx.quizAttempt.findMany({
        where,
        select: { id: true },
    });
    const attemptIds = attempts.map((attempt) => attempt.id);

    if (attemptIds.length === 0) return;

    await tx.userAnswer.deleteMany({ where: { quizAttemptId: { in: attemptIds } } });
    await tx.quizAttempt.deleteMany({ where: { id: { in: attemptIds } } });
}

async function deleteQuestionsByWhere(tx: Prisma.TransactionClient, where: Prisma.QuestionWhereInput) {
    const questions = await tx.question.findMany({
        where,
        select: { id: true },
    });
    const questionIds = questions.map((question) => question.id);

    if (questionIds.length === 0) return;

    await tx.userAnswer.deleteMany({ where: { questionId: { in: questionIds } } });
    await tx.questionReviewNote.deleteMany({ where: { questionId: { in: questionIds } } });
    await tx.option.deleteMany({ where: { questionId: { in: questionIds } } });
    await tx.question.deleteMany({ where: { id: { in: questionIds } } });
}

async function deleteOrganizationTree(tx: Prisma.TransactionClient, organizationId: string) {
    const [orgExams, orgSubjects, orgPapers, orgAssignments, orgSubscriptions] = await Promise.all([
        tx.exam.findMany({ where: { organizationId }, select: { id: true } }),
        tx.subject.findMany({ where: { organizationId }, select: { id: true } }),
        tx.examPaper.findMany({ where: { organizationId }, select: { id: true } }),
        tx.assignment.findMany({ where: { organizationId }, select: { id: true } }),
        tx.subscription.findMany({ where: { organizationId }, select: { id: true } }),
    ]);

    const orgExamIds = orgExams.map((exam) => exam.id);
    const orgSubjectIds = orgSubjects.map((subject) => subject.id);
    const orgPaperIds = orgPapers.map((paper) => paper.id);
    const orgAssignmentIds = orgAssignments.map((assignment) => assignment.id);
    const orgSubscriptionIds = orgSubscriptions.map((subscription) => subscription.id);

    await deleteAttemptsByWhere(tx, {
        OR: [
            ...(orgAssignmentIds.length ? [{ assignmentId: { in: orgAssignmentIds } }] : []),
            ...(orgExamIds.length ? [{ examId: { in: orgExamIds } }] : []),
            ...(orgSubjectIds.length ? [{ subjectId: { in: orgSubjectIds } }] : []),
        ],
    });

    await tx.assignment.deleteMany({ where: { organizationId } });

    await deleteQuestionsByWhere(tx, {
        OR: [
            { organizationId },
            ...(orgPaperIds.length ? [{ paperId: { in: orgPaperIds } }] : []),
            ...(orgExamIds.length ? [{ examId: { in: orgExamIds } }] : []),
            ...(orgSubjectIds.length ? [{ subjectId: { in: orgSubjectIds } }] : []),
        ],
    });

    await tx.examPaper.deleteMany({ where: { organizationId } });
    await tx.organizationExamination.deleteMany({ where: { organizationId } });

    if (orgSubscriptionIds.length) {
        await tx.subscriptionExamAccess.deleteMany({
            where: { subscriptionId: { in: orgSubscriptionIds } },
        });
    }
    await tx.subscription.deleteMany({ where: { organizationId } });

    await tx.orgInvite.deleteMany({ where: { organizationId } });
    await tx.joinRequest.deleteMany({ where: { organizationId } });
    await tx.user.updateMany({
        where: { organizationId },
        data: { organizationId: null },
    });

    if (orgExamIds.length) {
        await tx.subscriptionExamAccess.deleteMany({ where: { examId: { in: orgExamIds } } });
        await tx.exam.deleteMany({ where: { id: { in: orgExamIds } } });
    }

    if (orgSubjectIds.length) {
        await tx.subject.deleteMany({ where: { id: { in: orgSubjectIds } } });
    }

    await tx.organization.delete({ where: { id: organizationId } });
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
    if (id === session.user.id) {
        return new NextResponse("You cannot delete your own admin account", { status: 400 });
    }

    try {
        const targetUser = await prisma.user.findUnique({
            where: { id },
            include: {
                ownedOrganization: { select: { id: true } },
            },
        });

        if (!targetUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            if (targetUser.ownedOrganization) {
                await deleteOrganizationTree(tx, targetUser.ownedOrganization.id);
            }

            await tx.transaction.updateMany({
                where: { userId: id },
                data: { userId: null },
            });

            await tx.questionReviewNote.deleteMany({ where: { authorId: id } });

            const remainingAuthoredPapers = await tx.examPaper.count({ where: { authorId: id } });
            const remainingAuthoredExaminations = await tx.organizationExamination.count({ where: { authorId: id } });
            if (remainingAuthoredPapers > 0 || remainingAuthoredExaminations > 0) {
                throw new Error("This user still owns platform content. Reassign or delete that content before deleting the account.");
            }

            await tx.user.delete({ where: { id } });
        });

        return new NextResponse("User deleted");
    } catch (error) {
        console.error("Delete user error", error);
        const message = error instanceof Error ? error.message : "Failed to delete user";
        const status = message.includes("still owns platform content") ? 409 : 500;
        return new NextResponse(message || "Failed to delete user", { status });
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
