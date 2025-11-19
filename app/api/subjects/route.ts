import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@/lib/generated/prisma'; // Corrected path

/**
 * GET: Fetch all subjects
 * Subjects are universal, so we just return all of them.
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Notice: We no longer care about the examId
    const allSubjects = await prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(allSubjects);
    
  } catch (error) {
    console.error('[SUBJECTS_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}