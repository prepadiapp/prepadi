import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, ArrowRight, TrendingUp, History } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardHome() {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) return null;

  const stats = await prisma.quizAttempt.aggregate({
    where: { userId },
    _count: { _all: true },
    _avg: { score: true },
  });

  const recentAttempt = await prisma.quizAttempt.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { subject: true, exam: true }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {session.user.name?.split(' ')[0]}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Ready to test your knowledge today?
        </p>
      </div>

      {/* Hero Card for Simulation */}
      <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Timer className="w-32 h-32" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="text-xl md:text-2xl">Exam Simulator</CardTitle>
          <CardDescription className="text-primary-foreground/80 max-w-sm">
            Take a real timed exam simulation. Replicates actual conditions for WAEC, JAMB, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <Button asChild size="lg" variant="secondary" className="font-semibold w-full md:w-auto">
            <Link href="/dashboard/practice?mode=exam">
              Start Mock Exam <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" /> Avg. Score
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{Math.round(stats._avg.score || 0)}%</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                    <History className="w-4 h-4 mr-2" /> Total Tests
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{stats._count._all}</div>
            </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentAttempt && (
        <div className="pt-2">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
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
                        <div className={`text-sm font-bold px-2 py-1 rounded ${recentAttempt.score >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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