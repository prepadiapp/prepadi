'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  BarChart, 
  Book, 
  Clock, 
  FileQuestion, 
  Loader2, 
  Users, 
  Activity, 
  Zap, 
  TrendingUp 
} from 'lucide-react';
import { AdminUserChart } from '@/components/admin/AdminUserChart';

// --- Types ---
interface DashboardData {
  insights: {
    logins24h: number;
    avgExamsPerUser: string;
    avgExamTimeMinutes: number;
    weeklyActiveUsers: number;
    weeklyAvgDailyMinutes: number;
  };
  totals: {
    totalUsers: number;
    totalQuestions: number;
    totalExams: number;
    totalSubjects: number;
    totalAttempts: number;
  };
  recentUsers: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
  }[];
  chartData: {
    name: string;
    count: number;
  }[];
}

function StatCard({ title, value, subtitle, icon, trend }: { 
  title: string, 
  value: string | number, 
  subtitle?: string, 
  icon: React.ReactNode,
  trend?: 'neutral' // We can add positive/negative later
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <span className="text-sm text-muted-foreground">Overview & Analytics</span>
      </div>

      {/* --- SECTION 1: PRIORITY INSIGHTS (New Specs) --- */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Engagement Insights
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Active Users 24h */}
          <StatCard 
            title="Active Users (24h)" 
            value={data.insights.logins24h} 
            subtitle="Unique logins today"
            icon={<Users className="w-4 h-4 text-blue-500" />} 
          />

          {/* Weekly Engagement */}
          <StatCard 
            title="Weekly Engagement" 
            value={`${data.insights.weeklyAvgDailyMinutes}m / day`} 
            subtitle={`${data.insights.weeklyActiveUsers} users active this week`}
            icon={<Activity className="w-4 h-4 text-green-500" />} 
          />

          {/* Avg Exams Per User */}
          <StatCard 
            title="Avg. Exams Taken" 
            value={data.insights.avgExamsPerUser} 
            subtitle={`Across ${data.totals.totalUsers} students`}
            icon={<FileQuestion className="w-4 h-4 text-orange-500" />} 
          />

          {/* Avg Duration */}
          <StatCard 
            title="Avg. Exam Duration" 
            value={`${data.insights.avgExamTimeMinutes} min`} 
            subtitle="Average completion time"
            icon={<Clock className="w-4 h-4 text-purple-500" />} 
          />
        </div>
      </div>

      {/* --- SECTION 2: PLATFORM TOTALS (Old Specs) --- */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
          Platform Health
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={data.totals.totalUsers} icon={<Users className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Total Questions" value={data.totals.totalQuestions} icon={<FileQuestion className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Total Exams" value={data.totals.totalExams} icon={<Book className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Total Attempts" value={data.totals.totalAttempts} icon={<BarChart className="w-4 h-4 text-muted-foreground" />} />
        </div>
      </div>

      {/* --- SECTION 3: CHARTS & LISTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Signups (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.chartData.length > 0 ? (
              <AdminUserChart data={data.chartData} />
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                No activity data yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Signups List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name || 'User'}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}