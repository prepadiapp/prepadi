import { prisma } from '@/lib/prisma';

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface AccessContext {
  examId?: string;
  subjectId?: string | null;
  year?: number;
  assignmentId?: string; // For Phase 1 LMS features
}

/**
 * Verifies if a user has access to a resource based on:
 * 1. Specific Assignment (LMS Feature - Highest Priority)
 * 2. Active Subscription (Org or Personal)
 * 3. Plan Limits
 */
export async function verifyUserAccess(
  userId: string,
  context: AccessContext
): Promise<AccessCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        include: {
          subscription: { include: { plan: true } },
        },
      },
      subscription: { include: { plan: true } },
    },
  });

  if (!user) return { allowed: false, reason: 'User not found' };

  // --- 1. Check Assignment Access (Highest Priority) ---
  // If accessing a specific assignment, bypass subscription checks if valid
  if (context.assignmentId) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: context.assignmentId },
      include: { organization: true }
    });

    if (!assignment) {
      return { allowed: false, reason: 'Assignment not found.' };
    }

    if (user.organizationId !== assignment.organizationId) {
      return { allowed: false, reason: 'You are not a member of the organization that assigned this exam.' };
    }

    const now = new Date();
    if (now < assignment.startTime) {
      return { allowed: false, reason: `Exam has not started yet. Starts at ${assignment.startTime.toLocaleString()}` };
    }
    if (now > assignment.endTime) {
      return { allowed: false, reason: 'Exam window has closed.' };
    }
    
    return { allowed: true };
  }

  // --- 2. Determine Active Plan (Org or Personal) ---
  let activePlan: any = null;
  const now = new Date();

  // A. Check Org Subscription
  const orgSub = user.organization?.subscription;
  if (
    orgSub && 
    orgSub.isActive && 
    // If endDate is null, we assume it's active (e.g., lifetime), otherwise check date
    (!orgSub.endDate || orgSub.endDate > now)
  ) {
    activePlan = orgSub.plan;
  } 
  
  // B. Fallback to Personal Subscription
  else if (
    user.subscription && 
    user.subscription.isActive && 
    (!user.subscription.endDate || user.subscription.endDate > now)
  ) {
    activePlan = user.subscription.plan;
  }

  if (!activePlan) {
    return { allowed: false, reason: 'No active subscription found. Please upgrade your plan.' };
  }

  // --- 3. Check Plan Constraints (Allowed Exams) ---
  // Example feature logic: { "allowedExams": ["WAEC", "JAMB"] }
  if (context.examId && activePlan.features) {
    const features = activePlan.features as any;
    
    if (
      features.allowedExams && 
      Array.isArray(features.allowedExams) && 
      !features.allowedExams.includes('ALL')
    ) {
      const exam = await prisma.exam.findUnique({ where: { id: context.examId } });
      
      if (exam && !features.allowedExams.includes(exam.name)) {
        return { 
          allowed: false, 
          reason: `Your ${activePlan.name} plan does not cover ${exam.name} exams.` 
        };
      }
    }
  }

  return { allowed: true };
}