'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Home,
  Menu,
  Users,
  CreditCard,
  FileText,
  LogOut,
  Settings
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const navItems = [
  { href: '/organization', label: 'Dashboard', icon: Home },
  { href: '/organization/students', label: 'Students', icon: Users },
  { href: '/organization/exams', label: 'Custom Exams', icon: FileText },
  { href: '/organization/billing', label: 'Billing', icon: CreditCard },
  { href: '/organization/settings', label: 'Settings', icon: Settings },
];

export function OrgSidebar() {
  const pathname = usePathname();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold p-6 border-b text-primary">Prepadi Org</h2>
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
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
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
      {/* Mobile Trigger */}
      <div className="md:hidden p-4 sticky top-0 bg-background z-10 border-b flex items-center justify-between">
        <span className="font-bold text-lg">Organization Portal</span>
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

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-10 border-r bg-background">
        <SidebarContent />
      </aside>
    </>
  );
}