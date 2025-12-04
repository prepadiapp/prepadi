import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ORGANIZATION) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const { action } = await request.json(); // 'approve' | 'reject'

  try {
    const org = await prisma.organization.findUnique({ where: { ownerId: session.user.id } });
    if (!org) return new NextResponse('Org not found', { status: 404 });

    const joinReq = await prisma.joinRequest.findUnique({
        where: { id },
        include: { user: true }
    });

    if (!joinReq || joinReq.organizationId !== org.id) {
        return new NextResponse('Request not found', { status: 404 });
    }

    if (action === 'approve') {
        await prisma.$transaction([
            // Add user to Org
            prisma.user.update({
                where: { id: joinReq.userId },
                data: { organizationId: org.id }
            }),
            // Delete request (it's processed)
            prisma.joinRequest.delete({ where: { id } })
        ]);
    } else {
        // Reject: Just delete the request for now
        await prisma.joinRequest.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
      console.error('[JOIN_REQUEST_ACTION_ERROR]', error);
      return new NextResponse('Error processing request', { status: 500 });
  }
}