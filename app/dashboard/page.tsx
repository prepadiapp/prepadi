import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, ArrowRight, TrendingUp, History } from 'lucide-react';
import Link from 'next/link';
import { UpgradeBanner } from '@/components/student/UpgradeBanner';

export default async function DashboardHome() {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) return null;

  // Fetch Stats
  const stats = await prisma.quizAttempt.aggregate({
    where: { userId },
    _count: { _all: true },
    _avg: { score: true },
    _sum: { timeTaken: true },
  });

  const recentAttempt = await prisma.quizAttempt.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { subject: true, exam: true }
  });

  // Fetch Subscription for Banner Logic
  const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
          subscription: { include: { plan: true } },
          ownedOrganization: { include: { subscription: { include: { plan: true } } } }
      }
  });

  let activeSub = null;
  if (user?.subscription?.isActive) activeSub = user.subscription;
  else if (user?.ownedOrganization?.subscription?.isActive) activeSub = user.ownedOrganization.subscription;
  
  const isPro = (activeSub?.plan?.price || 0) > 0;

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {session.user.name?.split(' ')[0]}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Ready to test your knowledge today?
        </p>
      </div>
      
      {/* --- UPGRADE BANNER (Only shows if free & not dismissed) --- */}
      <UpgradeBanner isPro={isPro} />

      {/* Hero Card for Simulation */}
      <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Timer className="w-32 h-32" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="text-xl md:text-2xl">Exam Simulator</CardTitle>
          <CardDescription className="text-primary-foreground/80 max-w-sm text-sm leading-relaxed">
            Take a real timed exam simulation. Replicates actual conditions for WAEC, JAMB, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pt-0">
          <Button asChild size="lg" variant="secondary" className="font-semibold w-full md:w-auto shadow-sm">
            <Link href="/dashboard/practice?mode=exam">
              Start Mock Exam <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center uppercase tracking-wider">
                    <TrendingUp className="w-3 h-3 mr-2" /> Avg. Score
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-900">{Math.round(stats._avg.score || 0)}%</div>
            </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center uppercase tracking-wider">
                    <History className="w-3 h-3 mr-2" /> Total Tests
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-900">{stats._count._all}</div>
            </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentAttempt && (
        <div className="pt-2">
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider px-1">Recent Activity</h3>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group shadow-sm border-slate-200">
                <Link href={`/quiz/results/${recentAttempt.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-sm md:text-base group-hover:text-primary transition-colors">
                                {recentAttempt.subject.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {recentAttempt.exam.shortName} • {recentAttempt.year}
                            </p>
                        </div>
                        <div className={`text-sm font-bold px-2.5 py-1 rounded-md ${recentAttempt.score >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {recentAttempt.score}%
                        </div>
                    </CardContent>
                </Link>
            </Card>
        </div>
      )}
    </div>
  );
}