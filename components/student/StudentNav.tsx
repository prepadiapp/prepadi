'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, BookOpen, User, Menu, CreditCard, Sparkles, Building2, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { SignOutButton } from '@/components/SignOutButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const baseNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  // Assessments is now conditional
  { href: '/dashboard/practice', label: 'Practice', icon: BookOpen },
  { href: '/dashboard/performance', label: 'Performance', icon: LineChart },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

interface StudentNavProps {
    isPro: boolean;
    isOrgMember?: boolean;
    orgName?: string;
}

export function StudentNav({ isPro, isOrgMember, orgName }: StudentNavProps) {
  const pathname = usePathname();

  // Conditionally build nav items
  const navItems = [
    ...baseNavItems,
  ];

  // Insert Assessments after Home if user is Org Member
  if (isOrgMember) {
      navItems.splice(1, 0, { href: '/dashboard/assessments', label: 'Assessments', icon: CalendarCheck });
  }

  // Desktop Sidebar
  const Sidebar = () => (
    <div className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r bg-white z-20">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Prepadi</h1>
        {isOrgMember && orgName && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-slate-100 rounded-md text-xs text-slate-700 font-medium border border-slate-200">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span className="truncate">{orgName}</span>
            </div>
        )}
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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

      <div className="p-4 border-t bg-slate-50/50">
        {/* --- UPGRADE CARD (Hide if Pro OR Org Member) --- */}
        {!isPro && !isOrgMember && (
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 border-none shadow-md mb-4 overflow-hidden relative group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all" />
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-white">
                        <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                        <span className="font-bold text-sm">Go Pro</span>
                    </div>
                    <p className="text-xs text-blue-100 mb-3 leading-relaxed">
                        Unlock unlimited access and advanced analytics.
                    </p>
                    <Button asChild size="sm" variant="secondary" className="w-full h-8 text-xs font-bold text-blue-700 hover:bg-blue-50 shadow-sm">
                        <Link href="/dashboard/billing">Upgrade</Link>
                    </Button>
                </CardContent>
            </Card>
        )}

        {/* Hide Billing link for Org Members */}
        {!isOrgMember && (
            <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground mb-2">
                <Link href="/dashboard/billing">
                    <CreditCard className="w-4 h-4 mr-3"/> Billing
                </Link>
            </Button>
        )}
        <SignOutButton />
      </div>
    </div>
  );

  // Mobile Bottom Tab Bar (Unchanged)
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
      <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-primary tracking-tight">Prepadi</h1>
          {isOrgMember && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-slate-50 border-slate-200">
                  Org
              </Badge>
          )}
      </div>
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
                {!isPro && !isOrgMember && (
                   <Button asChild className="w-full justify-start bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-none">
                        <Link href="/dashboard/billing">
                            <Sparkles className="w-4 h-4 mr-2 text-yellow-300 fill-yellow-300" />
                            Upgrade to Pro
                        </Link>
                   </Button>
                )}
                {!isOrgMember && (
                    <Button asChild variant="outline" className="w-full justify-start">
                        <Link href="/dashboard/billing">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Manage Subscription
                        </Link>
                    </Button>
                )}
                {isOrgMember && orgName && (
                    <div className="p-3 bg-muted rounded-lg text-sm text-center text-muted-foreground border border-dashed">
                        Connected to <br/><span className="font-semibold text-foreground">{orgName}</span>
                    </div>
                )}
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