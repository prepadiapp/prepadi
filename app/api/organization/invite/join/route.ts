import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { token } = await request.json();

    const invite = await prisma.orgInvite.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invite) {
      return new NextResponse('Invalid invite token', { status: 404 });
    }

    if (new Date() > invite.expiresAt) {
      return new NextResponse('Invite has expired', { status: 410 });
    }

    // Verify email match (Optional security measure)
    if (invite.email.toLowerCase() !== session.user.email?.toLowerCase()) {
       return new NextResponse('This invite was sent to a different email address.', { status: 403 });
    }

    // Execute Join
    await prisma.$transaction([
      // Update User
      prisma.user.update({
        where: { id: session.user.id },
        data: { organizationId: invite.organizationId },
      }),
      // Delete Invite (it's one-time use)
      prisma.orgInvite.delete({ where: { id: invite.id } }),
    ]);

    return NextResponse.json({ 
      success: true, 
      orgName: invite.organization.name 
    });

  } catch (error) {
    console.error('[JOIN_ORG_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}