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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Search, CheckCircle, Shield, Users, BarChart, Percent, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/useDebounce';
import { generatePaginationRange } from '@/lib/pagination';
import { AdminAttemptChart } from '@/components/admin/AdminAttemptChart'; 

// --- Types ---
type UserData = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  verified: boolean;
  joined: Date;
  attempts: number;
};

type AnalyticsStats = {
  totalStudents: number;
  totalOrgs: number;
  totalAttempts: number;
  avgScore: number;
};
type ChartData = {
  name: string;
  count: number;
};

// Reusable Stat Card
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
export default function UserAnalyticsPage() {
  // State for data
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);


  useEffect(() => {
    const fetchPageData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        if (debouncedSearchTerm) params.set('q', debouncedSearchTerm);

        // Fetch both analytics and the user list
        const [statsRes, usersRes] = await Promise.all([
          fetch('/api/admin/analytics/overview'),
          fetch(`/api/admin/users?${params.toString()}`),
        ]);

        if (!statsRes.ok) throw new Error('Failed to fetch analytics');
        if (!usersRes.ok) throw new Error('Failed to fetch users');

        const statsData = await statsRes.json();
        const usersData = await usersRes.json();
        
        setStats(statsData.stats);
        setChartData(statsData.chartData);
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

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);


  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const paginationRange = generatePaginationRange(currentPage, totalPages);


  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">User Analytics</h1>
      
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      {error && !loading && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content (when not loading) */}
      {!loading && !error && stats && (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Students" value={stats.totalStudents} icon={<Users className="w-4 h-4 text-muted-foreground" />} />
            <StatCard title="Total Orgs" value={stats.totalOrgs} icon={<Building className="w-4 h-4 text-muted-foreground" />} />
            <StatCard title="Total Attempts" value={stats.totalAttempts} icon={<BarChart className="w-4 h-4 text-muted-foreground" />} />
            <StatCard title="Avg. Score" value={`${stats.avgScore}%`} icon={<Percent className="w-4 h-4 text-muted-foreground" />} />
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Quiz Attempts (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <AdminAttemptChart data={chartData} />
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  No quiz activity to display.
                </div>
              )}
            </CardContent>
          </Card>

          {/* User List Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <div className="max-w-md pt-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="search"
                    placeholder="Search by name or email..."
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
                            <div className="font-medium">{user.name || 'N/A'}</div>
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
                        <TableCell className="hidden md:table-cell">{user.attempts}</TableCell>
                        <TableCell>{new Date(user.joined).toLocaleDateString()}</TableCell>
                        </TableRow>
                    ))
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {/* Pagination Controls */}
          {!loading && !error && totalPages > 1 && (
            <Pagination>
                <PaginationContent>
                    
                    <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                        aria-disabled={currentPage === 1}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                    </PaginationItem>
                    
                    
                    {paginationRange.map((page, index) => (
                    page === '...' ? (
                        <PaginationItem key={index}>
                        <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={index}>
                        <PaginationLink
                            href="#"
                            onClick={(e) => { e.preventDefault(); handlePageChange(page as number); }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                        >
                            {page}
                        </PaginationLink>
                        </PaginationItem>
                    )
                    ))}

                  
                    <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                        aria-disabled={currentPage === totalPages}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
            )}
        </>
      )}
    </section>
  );
}