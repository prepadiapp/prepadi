import { getAuthSession } from '@/lib/auth';
import { questionService } from '@/lib/question-service/question-service';
import { UserRole } from '@/lib/generated/prisma/enums';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const { questions } = body; // Expects StandardizedQuestion[]

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new NextResponse('No questions provided', { status: 400 });
    }

    // Use our service to handle the complex Section/Question creation
    const created = await questionService.bulkCreate(questions);

    return NextResponse.json({ count: created.length });

  } catch (error) {
    console.error('[BULK_CREATE_API_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}