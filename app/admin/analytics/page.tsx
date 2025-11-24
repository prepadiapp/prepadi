'use client';

import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/generated/prisma/enums'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Search, CheckCircle, Shield, Users, BarChart, Activity, TrendingUp, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { generatePaginationRange } from '@/lib/pagination';
import { AdminAttemptChart } from '@/components/admin/AdminAttemptChart';
import { AdminUserChart } from '@/components/admin/AdminUserChart';

// --- Updated Types ---
type AnalyticsData = {
  stats: {
    totalStudents: number;
    totalOrgs: number;
    activeUsers24h: number;
    weeklyAvgDailyMinutes: number;
    weeklyActiveUsers: number;
  };
  charts: {
    growth: { name: string; count: number }[];
    activity: { name: string; count: number }[];
  };
};

type UserData = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  verified: boolean;
  joined: Date;
  attempts: number;
};

function StatCard({ title, value, subtitle, icon }: { title: string, value: string | number, subtitle?: string, icon: React.ReactNode }) {
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

export default function UserAnalyticsPage() {
  // Data States
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch Data
  useEffect(() => {
    const fetchPageData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        if (debouncedSearchTerm) params.set('q', debouncedSearchTerm);

        const [analyticsRes, usersRes] = await Promise.all([
          fetch('/api/admin/analytics/overview'),
          fetch(`/api/admin/users?${params.toString()}`),
        ]);

        if (!analyticsRes.ok || !usersRes.ok) throw new Error('Failed to fetch data');

        const analyticsData = await analyticsRes.json();
        const usersData = await usersRes.json();
        
        setAnalytics(analyticsData);
        setUsers(usersData.users);
        setTotalPages(usersData.totalPages);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPageData();
  }, [debouncedSearchTerm, currentPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const paginationRange = generatePaginationRange(currentPage, totalPages);


  // --- Render ---
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Analytics</h1>
        <span className="text-sm text-muted-foreground">User Behavior & Growth</span>
      </div>
      
      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {!loading && !error && analytics && (
        <>
          {/* --- DEEP METRICS ROW --- */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 1. Active Users */}
            <StatCard 
              title="Active Users (24h)" 
              value={analytics.stats.activeUsers24h} 
              subtitle="Unique logins today"
              icon={<Activity className="w-4 h-4 text-blue-500" />} 
            />
            
            {/* 2. Engagement */}
            <StatCard 
              title="Engagement" 
              value={`${analytics.stats.weeklyAvgDailyMinutes}m / day`} 
              subtitle={`${analytics.stats.weeklyActiveUsers} active users (7d)`}
              icon={<TrendingUp className="w-4 h-4 text-green-500" />} 
            />

            {/* 3. Total Students */}
            <StatCard 
              title="Total Students" 
              value={analytics.stats.totalStudents} 
              icon={<Users className="w-4 h-4 text-muted-foreground" />} 
            />

            {/* 4. Total Orgs */}
            <StatCard 
              title="Organizations" 
              value={analytics.stats.totalOrgs} 
              icon={<Shield className="w-4 h-4 text-purple-500" />} 
            />
          </div>

          {/* --- CHARTS ROW --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: User Growth (Line) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  User Growth (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.charts.growth.length > 0 ? (
                  <AdminUserChart data={analytics.charts.growth} />
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Activity/Attempts (Bar) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-muted-foreground" />
                  Quiz Activity (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.charts.activity.length > 0 ? (
                  <AdminAttemptChart data={analytics.charts.activity} />
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* --- USER TABLE --- */}
          <Card>
            <CardHeader>
              <CardTitle>User List</CardTitle>
              <div className="max-w-md pt-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="search"
                    placeholder="Search users..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Attempts</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name || 'User'}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {user.verified ? (
                            <span className="flex items-center text-xs text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center text-xs text-yellow-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono">{user.attempts}</TableCell>
                        <TableCell>{new Date(user.joined).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {/* Pagination (unchanged logic) */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                </PaginationItem>
                {paginationRange.map((page, i) => (
                   page === '...' ? <PaginationItem key={i}><PaginationEllipsis /></PaginationItem> :
                   <PaginationItem key={i}>
                     <PaginationLink href="#" isActive={currentPage === page} onClick={(e) => { e.preventDefault(); handlePageChange(page as number); }}>{page}</PaginationLink>
                   </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </section>
  );
}