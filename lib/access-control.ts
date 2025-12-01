import { prisma } from './prisma';

export async function verifyUserAccess(userId: string, resource: {
  examId?: string;
  subjectId?: string;
  year?: number;
}) {
  // 1. Get User Subscription & Plan
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: { include: { plan: true } },
      ownedOrganization: { include: { subscription: { include: { plan: true } } } }
    }
  });

  if (!user) return { allowed: false, reason: "User not found" };

  // Determine active subscription (Direct > Org)
  let activeSub = null;
  
  if (user.subscription && user.subscription.isActive) {
     activeSub = user.subscription;
  } else if (user.ownedOrganization?.subscription?.isActive) {
     activeSub = user.ownedOrganization.subscription;
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

  // 2. Check Exam Access
  if (resource.examId) {
    const allowedExams = features.allowedExamIds as string[] | undefined;
    if (allowedExams && allowedExams.length > 0) {
        if (!allowedExams.includes(resource.examId)) {
            return { allowed: false, reason: "Exam not included in your current plan." };
        }
    }
  }

  // 3. Check Subject Access
  if (resource.subjectId) {
    const allowedSubjects = features.allowedSubjectIds as string[] | undefined;
    if (allowedSubjects && allowedSubjects.length > 0) {
        if (!allowedSubjects.includes(resource.subjectId)) {
            return { allowed: false, reason: "Subject not included in your current plan." };
        }
    }
  }

  // 4. Check Year Access
  if (resource.year) {
    const allowedYears = features.allowedYears as string[] | undefined;
    if (allowedYears && allowedYears.length > 0) {
        if (!allowedYears.includes(String(resource.year))) {
            return { allowed: false, reason: `Year ${resource.year} is not available on your plan.` };
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
      ownedOrganization: { include: { subscription: { include: { plan: true } } } }
    }
  });

  let activeSub = null;
  if (user?.subscription?.isActive) activeSub = user.subscription;
  else if (user?.ownedOrganization?.subscription?.isActive) activeSub = user.ownedOrganization.subscription;

  if (!activeSub) return { allowedExamIds: [], allowedSubjectIds: [], allowedYears: [] }; // Block all

  const features = activeSub.plan.features as any;
  
  return {
    allowedExamIds: (features?.allowedExamIds as string[] | undefined),
    allowedSubjectIds: (features?.allowedSubjectIds as string[] | undefined),
    allowedYears: (features?.allowedYears as string[] | undefined)
  };
}