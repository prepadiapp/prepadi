import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/generated/prisma/enums';
import { NextResponse } from 'next/server';

const PAGE_SIZE = 20;

/**
 * GET: Fetch all users with pagination and search
 */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q'); // Text search (for name or email)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || `${PAGE_SIZE}`);
    const skip = (page - 1) * limit;

    // Build the dynamic 'where' clause
    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Run queries in parallel
    const [users, totalCount] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          role: true,
          createdAt: true,
          _count: { // Get the count of attempts
            select: { quizAttempts: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Format the data
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: !!user.emailVerified,
      joined: user.createdAt,
      attempts: user._count.quizAttempts,
    }));

    return NextResponse.json({
      users: formattedUsers,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });

  } catch (error) {
    console.error('[USERS_GET_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}