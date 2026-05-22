import { NextResponse } from 'next/server';

export async function GET() {
  // External provider metadata seeding is intentionally paused while the
  // platform operates from uploaded/admin-managed papers only.
  return NextResponse.json(
    {
      error:
        'External question-provider seeding is disabled. Manage exams, subjects, and papers directly from the admin dashboard.',
    },
    { status: 410 }
  );
}
