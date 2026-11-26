'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreTrendChart, SubjectPerformanceChart } from '@/components/PerformanceCharts';
import { AttemptHistoryTable } from '@/components/AttemptHistoryTable';
import { AlertCircle, ArrowUp, BarChart2, Check, Clock, Loader2, Sparkles, Target } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


interface PerformanceData {
  stats: {
    avgScore: number;
    bestScore: number;
    totalAttempts: number;
    avgTimePerQuestion: number;
  };
  scoreTrend: { name: string; score: number }[];
  subjectPerformance: { name: string; avgScore: number; attempts: number; examSlug: string }[];
  history: any[]; // Using 'any' for simplicity, matches AttemptHistoryTable
}


function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <CardTitle className="text-xs font-semibold text-slate-500 sm:text-sm">{title}</CardTitle>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F4FF] text-[#0000FE]">{icon}</span>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="break-words text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{value}</div>
      </CardContent>
    </Card>
  );
}

type SubjectFocus = { name: string; avgScore: number; attempts: number; examSlug: string };

function SubjectFocusStrip({ data }: { data: SubjectFocus[] }) {
  const doingWell = data
    .filter((s) => (s.attempts ?? 0) >= 3 && s.avgScore >= 70)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 2);
  const needsFocus = data
    .filter((s) => (s.attempts ?? 0) >= 3 && s.avgScore < 50)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 2);
  const warmingUp = data.filter((s) => (s.attempts ?? 0) < 3).slice(0, 3);

  if (doingWell.length === 0 && needsFocus.length === 0 && warmingUp.length === 0) return null;

  const practiceHref = (subject: SubjectFocus) =>
    `/dashboard/practice?mode=practice&exam=${encodeURIComponent(subject.examSlug)}&subject=${encodeURIComponent(subject.name)}`;

  return (
    <section aria-label="Strengths and focus areas" className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
      {doingWell.length > 0 && (
        <Card className="border-green-200/80 bg-green-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-green-800">
              <Check className="h-4 w-4" /> Doing well
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {doingWell.map((subject) => (
              <div key={subject.name} className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{subject.name}</span>
                <span className="shrink-0 text-sm font-extrabold tabular-nums text-green-700">{subject.avgScore}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {needsFocus.length > 0 && (
        <Card className="border-amber-200/80 bg-amber-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
              <Target className="h-4 w-4" /> Needs focus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsFocus.map((subject) => (
              <div key={subject.name} className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{subject.name}</p>
                  <p className="text-xs font-bold tabular-nums text-amber-700">{subject.avgScore}% · {subject.attempts} attempts</p>
                </div>
                <Button asChild size="sm" className="shrink-0 rounded-full bg-[#0000FE] text-xs hover:bg-[#0000CC]">
                  <Link href={practiceHref(subject)}>Practice now</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {warmingUp.length > 0 && (
        <Card className="border-slate-200/80 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <Sparkles className="h-4 w-4 text-[#0000FE]" /> Warming up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs leading-5 text-slate-500">Keep going — a few more attempts unlocks your verdict.</p>
            {warmingUp.map((subject) => (
              <div key={subject.name} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{subject.name}</span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">{subject.attempts}/3</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}


export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/performance');
        if (!response.ok) {
          throw new Error('Failed to fetch performance data.');
        }
        const performanceData: PerformanceData = await response.json();
        setData(performanceData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeFilter]); 

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!data || data.stats.totalAttempts === 0) {
     return (
       <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8">
        <Alert className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <Target className="h-4 w-4" />
          <AlertTitle>No Data Yet!</AlertTitle>
          <AlertDescription>
            You haven't completed any quizzes yet. Once you do, your performance
            analytics will appear here.
            <Button asChild className="mt-4">
              <Link href="/dashboard">Start a Quiz</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
     )
  }


  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 md:py-8">
      <header className="flex min-w-0 flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-[#F1F4FF]/70 p-5 shadow-sm sm:p-7 md:flex-row md:items-center">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0000FE]">Your learning snapshot</span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Performance</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base">
            Track your progress and identify weak areas.
          </p>
        </div>
        <Tabs value={timeFilter} onValueChange={setTimeFilter} className="w-full md:w-auto">
          <TabsList className="grid h-11 w-full grid-cols-1 rounded-xl bg-slate-100 p-1 md:w-36">
            {/* <TabsTrigger value="week" disabled>Week</TabsTrigger> */}
            {/* <TabsTrigger value="month" disabled>Month</TabsTrigger> */}
            {/* <TabsTrigger value="year" disabled>Year</TabsTrigger> */}
            <TabsTrigger value="all" className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0000FE] data-[state=active]:shadow-sm">All time</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="min-w-0 space-y-5 sm:space-y-6">
        <SubjectFocusStrip data={data.subjectPerformance} />
        
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard title="Average Score" value={`${data.stats.avgScore}%`} icon={<BarChart2 className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Best Score" value={`${data.stats.bestScore}%`} icon={<ArrowUp className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Quizzes Taken" value={data.stats.totalAttempts} icon={<Check className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Avg. Time / Q" value={`${data.stats.avgTimePerQuestion}s`} icon={<Clock className="w-4 h-4 text-muted-foreground" />} />
        </div>

        {/* Charts and History in a grid */}
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-2">
            {/* Score Trend Line Chart */}
            <ScoreTrendChart data={data.scoreTrend} />
            
            {/* "Weak Areas" Bar Chart */}
            <SubjectPerformanceChart data={data.subjectPerformance} />
          </div>
          <div className="min-w-0 lg:col-span-1">
            {/* History Table */}
            <AttemptHistoryTable data={data.history} />
          </div>
        </div>
      </main>
    </div>
  );
}
