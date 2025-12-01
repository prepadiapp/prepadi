'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, BookOpen, User, Menu, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { SignOutButton } from '@/components/SignOutButton';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/practice', label: 'Practice', icon: BookOpen },
  { href: '/dashboard/performance', label: 'Performance', icon: LineChart },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export function StudentNav() {
  const pathname = usePathname();

  // Desktop Sidebar
  const Sidebar = () => (
    <div className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r bg-white z-20">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Prepadi</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.href}
            asChild
            variant={pathname === item.href ? 'secondary' : 'ghost'}
            className={cn(
              "w-full justify-start text-sm font-medium",
              pathname === item.href && "bg-secondary text-primary"
            )}
          >
            <Link href={item.href}>
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="p-4 border-t">
        <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground mb-2">
            <Link href="/dashboard/billing">
                <CreditCard className="w-4 h-4 mr-3"/> Billing
            </Link>
        </Button>
        <SignOutButton />
      </div>
    </div>
  );

  // Mobile Bottom Tab Bar
  const BottomNav = () => (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t h-16 flex items-center justify-around z-50 pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform",
              isActive ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  // Mobile Top Header
  const MobileHeader = () => (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-40">
      <h1 className="text-lg font-bold text-primary tracking-tight">Prepadi</h1>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="-mr-2">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent>
           <SheetHeader>
             <SheetTitle>Menu</SheetTitle>
             <SheetDescription>Account settings</SheetDescription>
           </SheetHeader>
           <div className="flex flex-col h-full mt-6">
             <nav className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/dashboard/billing">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manage Subscription
                    </Link>
                </Button>
             </nav>
             <div className="mt-auto pt-8 border-t mb-8">
               <SignOutButton />
             </div>
           </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <>
      <Sidebar />
      <MobileHeader />
      <BottomNav />
    </>
  );
}