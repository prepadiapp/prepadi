'use client';

import { useState } from 'react'; 
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart,
  CreditCard,
  Building2,
  CalendarDays, 
  LogOut,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SignOutButton } from '@/components/SignOutButton';

const sidebarLinks = [
  {
    title: 'Overview',
    href: '/organization',
    icon: LayoutDashboard,
  },
  {
    title: 'Students',
    href: '/organization/students',
    icon: Users,
  },
  {
    title: 'Library (Papers)',
    href: '/organization/papers',
    icon: FileText,
  },
  {
    title: 'Assignments', 
    href: '/organization/assignments',
    icon: CalendarDays,
  },
  {
    title: 'Billing & Plan',
    href: '/organization/billing',
    icon: CreditCard,
  },
];

export function OrgSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    return pathname === href || (href !== '/organization' && pathname.startsWith(href));
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-sm border-r border-slate-200">
      <div className="flex h-[60px] items-center border-b px-6 bg-blue-50/50">
        <Link href="/organization" className="flex items-center gap-2 font-bold text-xl text-blue-700" onClick={() => setOpen(false)}>
          <Building2 className="h-6 w-6" />
          <span>Organization</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-3 text-sm font-medium gap-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)} 
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                  active
                    ? "bg-blue-600 text-white shadow-md font-semibold"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                )}
              >
                <Icon className={cn("h-4 w-4 transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-blue-600")} />
                {link.title}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t bg-slate-50/50 mt-auto">
        <div className="px-2">
           <SignOutButton />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r bg-white fixed inset-y-0 left-0 z-50 h-full shadow-sm">
        <NavContent />
      </aside>

      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full shadow-xl bg-blue-700 hover:bg-blue-800 text-white border-2 border-white/20">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r-0">
             <div className="sr-only">
               <SheetTitle>Org Menu</SheetTitle>
               <SheetDescription>Organization navigation</SheetDescription>
             </div>
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}