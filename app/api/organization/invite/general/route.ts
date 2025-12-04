import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// GET: Get the current general invite code (or create one if missing)
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { ownerId: session.user.id },
  });

  if (!org) return new NextResponse('Organization not found', { status: 404 });

  // For simplicity, we'll store a "general invite token" on the Org model or a special Invite record.
  // Since we didn't add a field to Organization, let's use a special OrgInvite record with email="GENERAL_LINK".
  
  let generalInvite = await prisma.orgInvite.findFirst({
    where: { organizationId: org.id, email: 'GENERAL_LINK' }
  });

  if (!generalInvite) {
      // Create one that expires far in the future (e.g., 1 year)
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      generalInvite = await prisma.orgInvite.create({
          data: {
              email: 'GENERAL_LINK',
              token,
              organizationId: org.id,
              expiresAt,
              status: 'PENDING'
          }
      });
  }

  return NextResponse.json({ 
      link: `${process.env.NEXT_PUBLIC_APP_URL}/join/general/${generalInvite.token}`,
      token: generalInvite.token
  });
}

// POST: Regenerate the link (Invalidates old one)
export async function POST(request: Request) {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  
    const org = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
    });
  
    if (!org) return new NextResponse('Organization not found', { status: 404 });

    // Delete old
    await prisma.orgInvite.deleteMany({
        where: { organizationId: org.id, email: 'GENERAL_LINK' }
    });

    // Create new
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const generalInvite = await prisma.orgInvite.create({
        data: {
            email: 'GENERAL_LINK',
            token,
            organizationId: org.id,
            expiresAt,
            status: 'PENDING'
        }
    });

    return NextResponse.json({ 
        link: `${process.env.NEXT_PUBLIC_APP_URL}/join/general/${generalInvite.token}`,
        token: generalInvite.token
    });
}