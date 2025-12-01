import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardGuard } from '@/components/DashboardGuard';
import { StudentNav } from '@/components/student/StudentNav';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect('/login');
  }
  
  return (
    <DashboardGuard>
      <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-0">
        <StudentNav />
        <main className="md:pl-64 min-h-[calc(100vh-4rem)] md:min-h-screen transition-all">
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </DashboardGuard>
  );
}