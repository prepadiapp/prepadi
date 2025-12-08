import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sendOrgInviteEmail } from '@/lib/mail';

// GET: List pending invites
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { ownerId: session.user.id },
  });

  if (!org) return new NextResponse('Organization not found', { status: 404 });

  const invites = await prisma.orgInvite.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(invites);
}

// POST: Send new invite
export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { email } = await request.json();
    if (!email) return new NextResponse('Email is required', { status: 400 });

    const org = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
    });

    if (!org) return new NextResponse('Organization not found', { status: 404 });

    // Check if user is already a member
    const existingMember = await prisma.user.findFirst({
      where: { email, organizationId: org.id },
    });

    if (existingMember) {
      return new NextResponse('User is already a member', { status: 409 });
    }

    // Check for existing pending invite
    const existingInvite = await prisma.orgInvite.findFirst({
        where: { email, organizationId: org.id, status: 'PENDING' }
    });

    if (existingInvite) {
        return new NextResponse('Invite already sent to this email', { status: 409 });
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); 

    const invite = await prisma.orgInvite.create({
      data: {
        email,
        token,
        organizationId: org.id,
        expiresAt,
        status: 'PENDING',
      },
    });

    await sendOrgInviteEmail(email, token, org.name);

    return NextResponse.json(invite);

  } catch (error: any) {
    console.error('[INVITE_POST_ERROR]', error);
    return new NextResponse(error.message, { status: 500 });
  }
}