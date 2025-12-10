'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  BarChart,
  Upload,
  CreditCard,
  Layers,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SignOutButton } from '@/components/SignOutButton';

const sidebarLinks = [
  {
    title: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Curriculum', // Renamed from Subjects & Exams
    href: '/admin/subjects',
    icon: BookOpen,
  },
  {
    title: 'Papers & Questions',
    href: '/admin/papers',
    icon: FileText,
  },
  {
    title: 'Plans',
    href: '/admin/plans',
    icon: CreditCard,
  },
  {
    title: 'Bulk Upload',
    href: '/admin/bulk-upload',
    icon: Upload,
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); 

  const isActive = (href: string) => {
    return pathname === href || (href !== '/admin' && pathname.startsWith(href));
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-sm">
      <div className="flex h-[60px] items-center border-b px-6">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-xl text-primary" onClick={() => setOpen(false)}>
          <Layers className="h-6 w-6" />
          <span>Prepadi Admin</span>
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
                    ? "bg-primary text-primary-foreground shadow-md font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4 transition-colors", active ? "text-white" : "text-slate-500 group-hover:text-slate-900")} />
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
      {/* --- DESKTOP SIDEBAR (Fixed) --- */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-white fixed inset-y-0 left-0 z-50 h-full shadow-sm">
        <NavContent />
      </aside>

      {/* --- MOBILE TRIGGER (Floating FAB) --- */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full shadow-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r-0">
             {/* Accessibility: Hidden Title using Tailwind sr-only */}
             <div className="sr-only">
               <SheetTitle>Navigation Menu</SheetTitle>
               <SheetDescription>Main application navigation links</SheetDescription>
             </div>
             
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}