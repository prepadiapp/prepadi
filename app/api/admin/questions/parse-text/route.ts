import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { parseBulkTextWithAI } from '@/lib/ai';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { text } = await request.json();
    if (!text) return new NextResponse('No text provided', { status: 400 });

    const result = await parseBulkTextWithAI(text);
    
    if (!result || !result.questions) {
        return new NextResponse('AI failed to parse text', { status: 500 });
    }

    return NextResponse.json({ questions: result.questions });
  } catch (error) {
    console.error('AI Text Parse Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}