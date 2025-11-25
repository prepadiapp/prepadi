import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

// This API route updates the user's role
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { role } = body;


    // Validate the role
    if (!role || !Object.values(UserRole).includes(role)) {
      return new NextResponse('Invalid role', { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { role: role as UserRole },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[ROLE_UPDATE_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}