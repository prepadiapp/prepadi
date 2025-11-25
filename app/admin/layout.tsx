import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client'; 
import { AdminSidebar } from '@/components/admin/AdminSidebar';


export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Get user session
  const session = await getAuthSession();

  // 2. Protect the route
  if (!session?.user) {
    redirect('/login'); // Not logged in
  }
  if (session.user.role !== UserRole.ADMIN) {
    redirect('/dashboard'); // Not an admin
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminSidebar />
      
      <main className="md:pl-64">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}