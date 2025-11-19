import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/enums';
import { NextResponse } from 'next/server';

/**
 * GET: Fetch all tags
 */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(tags);
  } catch (error) {
    console.error('[TAGS_GET_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}