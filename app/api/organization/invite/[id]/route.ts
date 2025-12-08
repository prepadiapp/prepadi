import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;

  // Ensure this invite belongs to the user's org
  const org = await prisma.organization.findUnique({
    where: { ownerId: session.user.id },
  });

  if (!org) return new NextResponse('Organization not found', { status: 404 });

  const invite = await prisma.orgInvite.findUnique({ where: { id } });

  if (!invite || invite.organizationId !== org.id) {
    return new NextResponse('Invite not found or unauthorized', { status: 403 });
  }

  await prisma.orgInvite.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}