import { getAuthSession } from '@/lib/auth';
import { extractDocumentContent } from '@/lib/document-extraction';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }

    const extracted = await extractDocumentContent(file);
    return NextResponse.json(extracted);
  } catch (error: any) {
    console.error('[ADMIN_DOCUMENT_EXTRACT_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract document content' },
      { status: 500 }
    );
  }
}
