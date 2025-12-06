import { getAuthSession } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { parseQuestionImage } from '@/lib/ai';

export async function POST(request: Request) {
  const session = await getAuthSession();
  // Allow Admins AND Orgs to use this tool
  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.ORGANIZATION)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { image } = await request.json(); // Expects base64 data URL
    if (!image) return new NextResponse('No image provided', { status: 400 });

    const parsedData = await parseQuestionImage(image);
    
    if (!parsedData) return new NextResponse('AI failed to parse image', { status: 500 });

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Image Parse Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}