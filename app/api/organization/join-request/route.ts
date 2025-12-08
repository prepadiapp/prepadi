import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

// POST: Create a new join request (Called by Student)
export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { token } = await request.json();

    // 1. Find the General Invite to get the Org ID
    const invite = await prisma.orgInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.email !== 'GENERAL_LINK') {
      return new NextResponse('Invalid link', { status: 400 });
    }

    // 2. Check if user is already in ANY org
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.organizationId) {
        return new NextResponse('You are already a member of an organization.', { status: 409 });
    }

    // 3. Create Join Request
    await prisma.joinRequest.create({
      data: {
        userId: session.user.id,
        organizationId: invite.organizationId,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
      if (error.code === 'P2002') {
          return NextResponse.json({ success: true, message: 'Request already sent' });
      }
      console.error('[JOIN_REQUEST_POST_ERROR]', error);
      return new NextResponse(error.message, { status: 500 });
  }
}

// GET: List requests for the organization (Called by Org Admin)
export async function GET(request: Request) {
    const session = await getAuthSession();
    if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  
    const org = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
    });
  
    if (!org) return new NextResponse('Org not found', { status: 404 });
  
    const requests = await prisma.joinRequest.findMany({
        where: { organizationId: org.id, status: 'PENDING' },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
    });
  
    return NextResponse.json(requests);
}