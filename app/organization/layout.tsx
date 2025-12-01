import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardGuard } from '@/components/DashboardGuard';
import { OrgSidebar } from '@/components/org/OrgSidebar';

export default async function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();

  if (!session?.user?.email) {
    redirect('/login');
  }

  return (
    <DashboardGuard userEmail={session.user.email}>
      <div className="min-h-screen bg-muted/20">
        <OrgSidebar />
        <main className="md:pl-64">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </DashboardGuard>
  );
}