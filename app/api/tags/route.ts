import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getAuthSession();
  // Allow any authenticated user (Student, Org, Admin)
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });
    return NextResponse.json(tags);
  } catch (error) {
    console.error('[TAGS_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}