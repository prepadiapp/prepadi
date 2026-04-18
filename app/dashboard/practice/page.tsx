import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ExamSelector } from '@/components/ExamSelector';
import { getAvailablePracticeExams } from '@/lib/student-practice';

export default async function PracticePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/login');

  const exams = await getAvailablePracticeExams(session.user.id);

  if (exams.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-[color:var(--primary-border)] bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">No practice papers available yet</h2>
        <p className="mt-2 text-sm text-slate-500">
          There are no seeded published papers available for your current plan or organization right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,255,0.92))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Practice Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          Practice with published papers already curated on the platform. Nothing loads from the external source directly anymore.
        </p>
      </div>
      
      <ExamSelector exams={exams} />
    </div>
  );
}
