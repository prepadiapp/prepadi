import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SITE_SETTING_DEFAULTS } from '@/lib/site-settings';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const rows = await prisma.siteSetting.findMany();
    const values = { ...SITE_SETTING_DEFAULTS };
    for (const row of rows) {
      if (row.key in values) values[row.key] = row.value;
    }
    return NextResponse.json({
      contactPhone: values.contactPhone,
      contactEmail: values.contactEmail,
    });
  } catch (error) {
    console.error('[SITE_SETTINGS_ADMIN_GET_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await request.json();
    const contactPhone = String(body?.contactPhone ?? '').trim();
    const contactEmail = String(body?.contactEmail ?? '').trim().toLowerCase();

    if (!contactPhone) {
      return new NextResponse('Contact phone is required', { status: 400 });
    }
    if (!EMAIL_RE.test(contactEmail)) {
      return new NextResponse('Valid contact email is required', { status: 400 });
    }

    await prisma.$transaction([
      prisma.siteSetting.upsert({
        where: { key: 'contactPhone' },
        update: { value: contactPhone },
        create: { key: 'contactPhone', value: contactPhone },
      }),
      prisma.siteSetting.upsert({
        where: { key: 'contactEmail' },
        update: { value: contactEmail },
        create: { key: 'contactEmail', value: contactEmail },
      }),
    ]);

    return NextResponse.json({ contactPhone, contactEmail });
  } catch (error) {
    console.error('[SITE_SETTINGS_ADMIN_PUT_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
