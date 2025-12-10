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
  // 1. Get User with all Subscription & Organization Data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: { include: { plan: true } },
      ownedOrganization: { include: { subscription: { include: { plan: true } } } },
      // Include the organization the user is a MEMBER of
      organization: { include: { subscription: { include: { plan: true } } } }
    }
  });

  if (!user) return { allowed: false, reason: "User not found" };

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

    // Check membership or ownership
    const isMember = user.organizationId === assignment.organizationId;
    const isOwner = user.ownedOrganization?.id === assignment.organizationId;

    if (!isMember && !isOwner) {
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

  // --- 2. Determine Active Subscription (Direct > Owned Org > Member Org) ---
  let activeSub = null;
  
  if (user.subscription && user.subscription.isActive) {
     activeSub = user.subscription;
  } else if (user.ownedOrganization?.subscription?.isActive) {
     activeSub = user.ownedOrganization.subscription;
  } else if (user.organization?.subscription?.isActive) {
     activeSub = user.organization.subscription;
  }

  if (!activeSub) {
      return { allowed: false, reason: "No active subscription found." };
  }
  
  // Check Expiry
  if (activeSub.endDate && new Date(activeSub.endDate) < new Date()) {
      return { allowed: false, reason: "Subscription expired." };
  }

  const features = activeSub.plan.features as any;
  if (!features) return { allowed: true }; // No features defined = unrestricted

  // --- 3. Check Plan Constraints ---

  // Check Exam Access
  if (context.examId) {
    const allowedExams = features.allowedExamIds as string[] | undefined;
    if (allowedExams && allowedExams.length > 0 && !allowedExams.includes('ALL')) {
        if (!allowedExams.includes(context.examId)) {
            return { allowed: false, reason: "Exam not included in your current plan." };
        }
    }
  }

  // Check Subject Access
  if (context.subjectId) {
    const allowedSubjects = features.allowedSubjectIds as string[] | undefined;
    if (allowedSubjects && allowedSubjects.length > 0 && !allowedSubjects.includes('ALL')) {
        if (!allowedSubjects.includes(context.subjectId)) {
            return { allowed: false, reason: "Subject not included in your current plan." };
        }
    }
  }

  // Check Year Access
  if (context.year) {
    const allowedYears = features.allowedYears as string[] | undefined;
    if (allowedYears && allowedYears.length > 0 && !allowedYears.includes('ALL')) {
        if (!allowedYears.includes(String(context.year))) {
            return { allowed: false, reason: `Year ${context.year} is not available on your plan.` };
        }
    }
  }

  return { allowed: true };
}

/**
 * Helper to get allowed IDs for filtering queries.
 * Returns undefined if no restriction (all allowed), or an array of IDs.
 */
export async function getUserPlanFilters(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: { include: { plan: true } },
      ownedOrganization: { include: { subscription: { include: { plan: true } } } },
      organization: { include: { subscription: { include: { plan: true } } } }
    }
  });

  let activeSub = null;
  if (user?.subscription?.isActive) activeSub = user.subscription;
  else if (user?.ownedOrganization?.subscription?.isActive) activeSub = user.ownedOrganization.subscription;
  else if (user?.organization?.subscription?.isActive) activeSub = user.organization.subscription;

  if (!activeSub) return { allowedExamIds: [], allowedSubjectIds: [], allowedYears: [] }; // Block all

  const features = activeSub.plan.features as any;
  
  return {
    allowedExamIds: (features?.allowedExamIds as string[] | undefined),
    allowedSubjectIds: (features?.allowedSubjectIds as string[] | undefined),
    allowedYears: (features?.allowedYears as string[] | undefined)
  };
}