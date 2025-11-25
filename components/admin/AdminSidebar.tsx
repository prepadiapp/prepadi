'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  Menu,
  FileQuestion,
  Users,
  BookCopy,
  Book,
  BarChart2,
  UploadCloud,
  CreditCard,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

// Navigation links
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/plans', label: 'Manage Plans', icon: CreditCard },
  { href: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { href: '/admin/exams', label: 'Manage Exams', icon: BookCopy }, 
  { href: '/admin/subjects', label: 'Manage Subjects', icon: Book },
  { href: '/admin/analytics', label: 'User Analytics', icon: Users },
  { href: '/admin/bulk-upload', label: 'Bulk Upload', icon: UploadCloud },
];

export function AdminSidebar() {
  const pathname = usePathname();

  // The content of the sidebar
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold p-4 border-b">Prepadi Admin</h2>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.label}
            asChild
            variant={pathname === item.href ? 'default' : 'ghost'}
            className="w-full justify-start text-md"
          >
            <Link href={item.href}>
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="p-4 mt-auto border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* --- Mobile View (Sheet) --- */}
      <div className="md:hidden p-4 sticky top-0 bg-background z-10 border-b">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* --- Desktop View (Fixed Panel) --- */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-10 border-r bg-background">
        <SidebarContent />
      </aside>
    </>
  );
}