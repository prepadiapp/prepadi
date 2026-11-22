import { prisma } from '@/lib/prisma';
import { SITE_SETTING_DEFAULTS } from '@/lib/site-settings';
import { NextResponse } from 'next/server';

export async function GET() {
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
    // Table not migrated yet (or DB unreachable): still serve defaults.
    console.error('[SITE_SETTINGS_PUBLIC_GET_ERROR]', error);
    return NextResponse.json({
      contactPhone: SITE_SETTING_DEFAULTS.contactPhone,
      contactEmail: SITE_SETTING_DEFAULTS.contactEmail,
    });
  }
}
