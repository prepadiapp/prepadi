'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, BookOpen, User, Menu, CreditCard, Sparkles, Building2, CalendarCheck, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { SignOutButton } from '@/components/SignOutButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InstallPrompt } from '@/components/InstallPrompt'; // Import InstallPrompt

const baseNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/practice', label: 'Practice', icon: BookOpen },
  { href: '/dashboard/offline', label: 'Offline', icon: WifiOff },
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

  const navItems = [
    ...baseNavItems,
  ];

  if (isOrgMember) {
      navItems.splice(1, 0, { href: '/dashboard/assessments', label: 'Assessments', icon: CalendarCheck });
  }

  // Desktop Sidebar
  const Sidebar = () => (
    <div className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r bg-white z-20">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <img src="/prepadi_logo.png" alt="Prepadi" className="h-9 w-9 object-contain" />
          <h1 className="text-2xl font-bold text-primary tracking-tight">Prepadi</h1>
        </div>
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

      <div className="p-4 border-t bg-slate-50/50 space-y-2">
        {/* PWA Install Button (Only shows if installable) */}
        <InstallPrompt />

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

  // Mobile Bottom Tab Bar
  const BottomNav = () => (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t h-16 flex items-center justify-around z-50 pb-safe px-2">
      {navItems.slice(0, 5).map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 active:scale-95 transition-transform min-w-[60px]",
              isActive ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5", isActive && "fill-current/20")} />
            <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  // Mobile Top Header
  const MobileHeader = () => (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-40">
      <div className="flex items-center gap-2">
          <img src="/prepadi_logo.png" alt="Prepadi" className="h-7 w-7 object-contain" />
          <h1 className="text-lg font-bold text-primary tracking-tight">Prepadi</h1>
          {isOrgMember && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-slate-50 border-slate-200">
                  Org
              </Badge>
          )}
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#AAB9FF] hover:bg-[#F1F4FF] hover:text-[#0000FE]">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex w-[min(88vw,360px)] flex-col border-l border-slate-200 bg-[#F8FAFC] p-0">
           <SheetHeader className="border-b border-slate-200 bg-white px-5 pb-4 pt-8 text-left">
             <SheetTitle className="text-lg font-extrabold tracking-tight text-slate-950">Your account</SheetTitle>
             <SheetDescription className="text-sm text-slate-500">Plan and app settings</SheetDescription>
           </SheetHeader>
           <div className="flex min-h-0 flex-1 flex-col px-4 py-5">
             <nav aria-label="Account and plan links" className="space-y-3">
                <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Plan &amp; access</p>
                {!isPro && !isOrgMember && (
                   <Button asChild className="h-auto w-full justify-start rounded-2xl bg-gradient-to-r from-[#0000FE] to-[#4C72FE] px-4 py-3 text-left text-white shadow-md shadow-blue-950/10 hover:from-[#0000CC] hover:to-[#354FE0]">
                        <Link href="/dashboard/billing">
                            <span className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><Sparkles className="h-4 w-4 text-[#FFD08A]" /></span>
                            <span className="min-w-0 flex-1"><span className="block font-bold">Upgrade to Pro</span><span className="mt-0.5 block text-xs font-normal text-white/75">Unlock more practice and insights</span></span>
                            <span aria-hidden="true" className="ml-2 text-lg">›</span>
                        </Link>
                   </Button>
                )}
                {!isOrgMember && (
                    <Button asChild variant="outline" className="h-11 w-full justify-start rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm hover:border-[#AAB9FF] hover:bg-[#F1F4FF] hover:text-[#0000FE]">
                        <Link href="/dashboard/billing">
                            <CreditCard className="mr-3 h-4 w-4 text-[#0000FE]" />
                            Manage subscription
                        </Link>
                    </Button>
                )}
                {isOrgMember && orgName && (
                    <div className="flex items-start gap-3 rounded-2xl border border-[#DCE4FF] bg-white p-4 shadow-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F4FF] text-[#0000FE]"><Building2 className="h-4 w-4" /></span>
                        <span className="min-w-0"><span className="block text-xs font-medium text-slate-500">Organization access</span><span className="mt-0.5 block truncate text-sm font-bold text-slate-900">{orgName}</span></span>
                    </div>
                )}
                <div className="my-5 border-t border-slate-200" />
                <div className="pt-1"><InstallPrompt /></div>
             </nav>
             <div className="mt-auto border-t border-slate-200 pt-4">
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
