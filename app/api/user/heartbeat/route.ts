import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession();
    
    // If no user, just ignore (don't throw error, just return)
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 200 });
    }

    // Update the lastLogin field
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastLogin: new Date() },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    // Fail silently so we don't break the user experience
    console.error('Heartbeat failed:', error);
    return new NextResponse(null, { status: 500 });
  }
}