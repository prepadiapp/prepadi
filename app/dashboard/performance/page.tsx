'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreTrendChart, SubjectPerformanceChart } from '@/components/PerformanceCharts';
import { AttemptHistoryTable } from '@/components/AttemptHistoryTable';
import { AlertCircle, ArrowUp, BarChart2, Check, Clock, Loader2, Target } from 'lucide-react';
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
  subjectPerformance: { name: string; avgScore: number }[];
  history: any[]; // Using 'any' for simplicity, matches AttemptHistoryTable
}


function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
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
      <div className="container mx-auto max-w-5xl p-4 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!data || data.totalAttempts === 0) {
     return (
       <div className="container mx-auto max-w-5xl p-4 md:p-8">
        <Alert>
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
    <div className="container mx-auto max-w-5xl p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Track your progress and identify weak areas.
          </p>
        </div>
        <Tabs value={timeFilter} onValueChange={setTimeFilter} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="week" disabled>Week</TabsTrigger>
            <TabsTrigger value="month" disabled>Month</TabsTrigger>
            <TabsTrigger value="year" disabled>Year</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="space-y-6">
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Average Score" value={`${data.stats.avgScore}%`} icon={<BarChart2 className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Best Score" value={`${data.stats.bestScore}%`} icon={<ArrowUp className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Quizzes Taken" value={data.stats.totalAttempts} icon={<Check className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Avg. Time / Q" value={`${data.stats.avgTimePerQuestion}s`} icon={<Clock className="w-4 h-4 text-muted-foreground" />} />
        </div>

        {/* Charts and History in a grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Score Trend Line Chart */}
            <ScoreTrendChart data={data.scoreTrend} />
            
            {/* "Weak Areas" Bar Chart */}
            <SubjectPerformanceChart data={data.subjectPerformance} />
          </div>
          <div className="lg:col-span-1">
            {/* History Table */}
            <AttemptHistoryTable data={data.history} />
          </div>
        </div>
      </main>
    </div>
  );
}