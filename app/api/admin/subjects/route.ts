import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const subjects = await prisma.subject.findMany({
      where: { organizationId: null }, // Only fetch global subjects for Admin
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { questions: { where: { organizationId: null } } },
        },
      },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    console.error('[SUBJECTS_GET_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, apiSlugs } = body; // <--- Now accepting apiSlugs

    if (!name) return new NextResponse('Name is required', { status: 400 });

    const newSubject = await prisma.subject.create({
      data: { 
          name,
          apiSlugs: apiSlugs || {}, // Store the JSON
          organizationId: null // Explicitly global
      },
    });
    return NextResponse.json(newSubject);
  } catch (error) {
    console.error('[SUBJECTS_POST_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}