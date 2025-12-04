import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) return new NextResponse('Missing Token', { status: 400 });

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } }
  });

  if (!invite) return new NextResponse('Invite not found', { status: 404 });
  if (invite.status !== 'PENDING') return new NextResponse('Invite already used or expired', { status: 410 });
  if (new Date() > invite.expiresAt) return new NextResponse('Invite expired', { status: 410 });

  return NextResponse.json({
    email: invite.email,
    orgName: invite.organization.name,
    orgId: invite.organizationId
  });
}