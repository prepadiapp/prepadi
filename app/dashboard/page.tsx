import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timer, ArrowRight, TrendingUp, History, Building2, Clock, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { UpgradeBanner } from '@/components/student/UpgradeBanner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function DashboardHome() {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) return null;

  // 1. Fetch Stats & Recent Activity
  const statsQuery = prisma.quizAttempt.aggregate({
    where: { userId },
    _count: { _all: true },
    _avg: { score: true },
    _sum: { timeTaken: true },
  });

  const recentQuery = prisma.quizAttempt.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { subject: true, exam: true }
  });

  // 2. Fetch User & Org Data
  const userQuery = prisma.user.findUnique({
      where: { id: userId },
      include: { 
          subscription: { include: { plan: true } },
          ownedOrganization: { include: { subscription: { include: { plan: true } } } },
          organization: { select: { name: true, subscription: { include: { plan: true } } } }
      }
  });

  // 3. Fetch Pending Requests
  const requestQuery = prisma.joinRequest.findFirst({
      where: { userId, status: 'PENDING' },
      include: { organization: { select: { name: true } } }
  });

  const [stats, recentAttempt, user, pendingRequest] = await prisma.$transaction([statsQuery, recentQuery, userQuery, requestQuery]);

  // 4. Logic
  let activeSub = null;
  if (user?.subscription?.isActive) activeSub = user.subscription;
  else if (user?.ownedOrganization?.subscription?.isActive) activeSub = user.ownedOrganization.subscription;
  else if (user?.organization?.subscription?.isActive) activeSub = user.organization.subscription;
  
  const isPro = (activeSub?.plan?.price || 0) > 0;
  const isOrgMember = !!user?.organization;
  const orgName = user?.organization?.name;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-20 sm:space-y-8">
      <div className="flex flex-col gap-2 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-[#F1F4FF]/70 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Welcome back, {session.user.name?.split(' ')[0]}
            </h1>
            {isOrgMember && orgName && (
                <Badge variant="secondary" className="gap-1.5 rounded-full border border-[#DCE4FF] bg-white px-3 py-1 font-semibold text-[#0000CC] shadow-sm">
                    <Building2 className="w-3 h-3" />
                    {orgName}
                </Badge>
            )}
        </div>
        <p className="text-sm leading-6 text-slate-600 sm:text-base">
          Ready to test your knowledge today?
        </p>
      </div>
      
      {/* --- PENDING REQUEST BANNER --- */}
      {pendingRequest && !isOrgMember && (
          <Alert className="rounded-2xl border-amber-200 bg-amber-50/90 text-amber-950 shadow-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertTitle className="font-bold">Membership Pending</AlertTitle>
              <AlertDescription>
                  Your request to join <strong>{pendingRequest.organization.name}</strong> is waiting for approval. 
                  You can still practice using the free plan in the meantime.
              </AlertDescription>
          </Alert>
      )}
      
      {/* --- UPGRADE BANNER (Hidden for Org Members) --- */}
      <UpgradeBanner isPro={isPro} isOrgMember={isOrgMember} />

      {/* Hero Card for Simulation */}
      <Card className="relative isolate overflow-hidden rounded-3xl border border-[#E5E9F7] bg-gradient-to-br from-white via-white to-[#F7F8FF] text-slate-950 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[#FF6600]/[0.07] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#0000FE]/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute right-4 top-2 hidden p-8 text-[#0000FE]/[0.06] sm:block">
            <Timer className="h-32 w-32" />
        </div>
        <CardHeader className="relative z-10 space-y-3 p-5 sm:p-7">
          <span className="w-fit rounded-full border border-[#DCE4FF] bg-[#F1F4FF] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0000CC]">Your next session</span>
          <CardTitle className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">Choose your next session</CardTitle>
          <CardDescription className="max-w-md text-sm leading-relaxed text-slate-600">
            Practice at your own pace or simulate exam conditions. Choose the study mode that works for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 px-5 pb-5 pt-0 sm:px-7 sm:pb-7">
          <Button asChild size="lg" className="h-12 w-full rounded-xl bg-[#0000FE] font-bold text-white shadow-md shadow-blue-950/10 hover:bg-[#0000CC] sm:w-auto">
            <Link href="/dashboard/practice">
              Choose study mode <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D2D9F2] hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#AAB9FF]" />
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-xs">Average score</CardTitle>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#DCE4FF] bg-white text-[#0000FE] shadow-sm transition-transform group-hover:scale-105"><TrendingUp className="h-4 w-4" /></span>
            </CardHeader>
            <CardContent className="p-4 pt-1 sm:px-5 sm:pb-5">
                <div className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{Math.round(stats._avg.score || 0)}<span className="ml-0.5 text-xl text-[#0000FE]">%</span></div>
                <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">Across all completed quizzes</p>
            </CardContent>
        </Card>
        <Card className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#FFD0AE]" />
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-xs">Quizzes taken</CardTitle>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-white text-[#E05224] shadow-sm transition-transform group-hover:scale-105"><History className="h-4 w-4" /></span>
            </CardHeader>
            <CardContent className="p-4 pt-1 sm:px-5 sm:pb-5">
                <div className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{stats._count._all}</div>
                <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">Your completed practice sessions</p>
            </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentAttempt && (
        <div className="pt-2">
            <h3 className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Recent Activity</h3>
            <Card className="group cursor-pointer overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#AAB9FF] hover:shadow-lg hover:shadow-blue-950/5">
                <Link href={`/quiz/results/${recentAttempt.id}`}>
                    <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F1F4FF] text-[#0000FE] ring-1 ring-[#DCE4FF] sm:h-12 sm:w-12"><BookOpen className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-950 transition-colors group-hover:text-[#0000FE] sm:text-base">
                                {recentAttempt.subject.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                                {recentAttempt.exam.shortName} • {recentAttempt.year}
                            </p>
                        </div>
                        <div className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold ring-1 ${recentAttempt.score >= 50 ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-orange-50 text-orange-700 ring-orange-100'}`}>
                            {recentAttempt.score}%
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0000FE]" />
                    </CardContent>
                </Link>
            </Card>
        </div>
      )}
    </div>
  );
}
