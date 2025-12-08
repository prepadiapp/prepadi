import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { parseQuestionImage } from '@/lib/ai';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { image } = await request.json(); // Expects base64 data URL
    if (!image) return new NextResponse('No image provided', { status: 400 });

    const result = await parseQuestionImage(image);
    
    if (!result || !result.questions) {
        return new NextResponse('AI failed to parse questions from image', { status: 500 });
    }

    return NextResponse.json({ questions: result.questions });
  } catch (error) {
    console.error('Bulk Image Parse Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}