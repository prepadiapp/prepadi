import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DashboardGuard } from '@/components/DashboardGuard';
import { StudentNav } from '@/components/student/StudentNav';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  // Fetch Subscription to determine PRO status for UI elements
  // Note: DashboardGuard handles the actual locking/security
  const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
          subscription: { include: { plan: true } },
          ownedOrganization: { include: { subscription: { include: { plan: true } } } }
      }
  });

  let activeSub = null;
  if (user?.subscription?.isActive) activeSub = user.subscription;
  else if (user?.ownedOrganization?.subscription?.isActive) activeSub = user.ownedOrganization.subscription;
  
  const isPro = (activeSub?.plan?.price || 0) > 0;
  
  return (
    <DashboardGuard>
      <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-0">
        <StudentNav isPro={isPro} />
        <main className="md:pl-64 min-h-[calc(100vh-4rem)] md:min-h-screen transition-all">
          <div className="p-4 md:p-8 max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </DashboardGuard>
  );
}