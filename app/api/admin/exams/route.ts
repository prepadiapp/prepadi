import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * GET: Fetch all exams
 */
export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const exams = await prisma.exam.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(exams);
  } catch (error) {
    console.error('[EXAMS_GET_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * POST: Create a new exam
 */
export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, shortName, description } = body;

    if (!name || !shortName) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const newExam = await prisma.exam.create({
      data: {
        name,
        shortName: shortName.toUpperCase(),
        description,
      },
    });
    return NextResponse.json(newExam);
  } catch (error) {
    console.error('[EXAMS_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}