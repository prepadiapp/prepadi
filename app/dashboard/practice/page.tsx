import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { ExamSelector } from '@/components/ExamSelector';
import { getUserPlanFilters } from '@/lib/access-control';

export default async function PracticePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/login');

  // 1. Get Filter Config
  const { allowedExamIds } = await getUserPlanFilters(session.user.id);
  
  const where: any = {};

  if (allowedExamIds && allowedExamIds.length > 0) {
    where.id = { in: allowedExamIds };
  } else if (allowedExamIds && allowedExamIds.length === 0) {
    // No exams allowed
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold">No Exams Available</h2>
            <p className="text-muted-foreground">Your current plan does not include access to any exams.</p>
        </div>
    );
  }

  // 2. Fetch Exams
  const exams = await prisma.exam.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Practice Center</h1>
        <p className="text-sm text-muted-foreground">
          Master topics at your own pace. No pressure, just learning.
        </p>
      </div>
      
      <ExamSelector exams={exams} />
    </div>
  );
}