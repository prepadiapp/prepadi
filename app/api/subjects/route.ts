import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getUserPlanFilters } from '@/lib/access-control';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Get plan restrictions
    const { allowedSubjectIds } = await getUserPlanFilters(session.user.id);
    
    const where: any = {};

    // Only apply filter if the array exists and has items
    // (If it's undefined or empty in the plan features, we might interpret that as "All" or "None".
    // Based on our logic: undefined = All, Empty Array = None.
    // getUserPlanFilters returns undefined if the field is missing in JSON)
    
    if (allowedSubjectIds && allowedSubjectIds.length > 0) {
        where.id = { in: allowedSubjectIds };
    } else if (allowedSubjectIds && allowedSubjectIds.length === 0) {
        // Explicitly empty list means no subjects allowed
        return NextResponse.json([]);
    }

    const allSubjects = await prisma.subject.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(allSubjects);
    
  } catch (error) {
    console.error('[SUBJECTS_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}