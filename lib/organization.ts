import { prisma } from "@/lib/prisma";

type SessionLike = {
  user?: {
    id?: string;
    organizationId?: string | null;
  } | null;
} | null;

export async function getOrganizationContext(session: SessionLike) {
  const userId = session?.user?.id;
  if (!userId) return null;

  let organizationId = session?.user?.organizationId ?? null;

  if (!organizationId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    organizationId = dbUser?.organizationId ?? null;
  }

  if (!organizationId) {
    const ownedOrganization = await prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { id: true, name: true },
    });

    if (ownedOrganization) {
      return {
        organizationId: ownedOrganization.id,
        organizationName: ownedOrganization.name,
        userId,
      };
    }
  }

  if (!organizationId) return null;

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  if (!organization) return null;

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    userId,
  };
}
