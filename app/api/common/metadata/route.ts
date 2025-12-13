import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const orgId = (session.user as any).organizationId;

    const [exams, subjects] = await Promise.all([
      // Exams are usually global standards (WAEC, etc), so fetch all
      prisma.exam.findMany({ orderBy: { name: 'asc' } }),
      
      // Subjects: Fetch Global (null Org) + Private (My Org)
      prisma.subject.findMany({ 
        where: {
            OR: [
                { organizationId: null }, // Global
                ...(orgId ? [{ organizationId: orgId }] : []) // My Org's
            ]
        },
        orderBy: { name: 'asc' } 
      })
    ]);

    return NextResponse.json({ exams, subjects });
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}