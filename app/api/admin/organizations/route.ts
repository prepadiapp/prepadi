import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('[ADMIN_ORGANIZATIONS_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
