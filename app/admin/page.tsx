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
import { AlertCircle, BarChart, Book, FileQuestion, Loader2, Users } from 'lucide-react';
import { AdminUserChart } from '@/components/admin/AdminUserChart';


interface AdminStats {
  totalUsers: number;
  totalQuestions: number;
  totalExams: number;
  totalSubjects: number;
  totalAttempts: number;
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
}
type ChartData = {
  name: string;
  count: number;
};


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

// --- Main Page Component ---
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch admin stats');
        }
        const data = await response.json();
        setStats(data.stats);
        setRecentUsers(data.recentUsers);
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

  if (!stats) {
    return <p>No data available.</p>;
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={<Users className="w-4 h-4 text-muted-foreground" />} />
        <StatCard title="Total Questions" value={stats.totalQuestions} icon={<FileQuestion className="w-4 h-4 text-muted-foreground" />} />
        <StatCard title="Total Exams" value={stats.totalExams} icon={<Book className="w-4 h-4 text-muted-foreground" />} />
        <StatCard title="Total Attempts" value={stats.totalAttempts} icon={<BarChart className="w-4 h-4 text-muted-foreground" />} />
      </div>

      {/* Main content grid (Charts + Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Activity (Chart)</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            {chartData.length > 0 ? (
              <AdminUserChart data={chartData} />
            ) : (
              <div className="flex items-center justify-center h-96 text-muted-foreground">
                No user activity to display.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name || 'N/A'}</div>
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