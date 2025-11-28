import { DashboardGuard } from '@/components/DashboardGuard';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard>
      {/* Existing Student Navbar/Layout */}
      {children}
    </DashboardGuard>
  );
}