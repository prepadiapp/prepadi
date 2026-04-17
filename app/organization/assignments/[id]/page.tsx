import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getOrganizationContext } from '@/lib/organization';

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  const { id } = await params;
  const org = await getOrganizationContext(session);

  if (!org) redirect('/login');

  const assignment = await prisma.assignment.findFirst({
    where: {
      id,
      organizationId: org.organizationId,
    },
    include: {
      paper: { select: { title: true, subject: { select: { name: true } } } },
      examination: { select: { title: true } },
      results: {
        include: { user: true },
        orderBy: { score: 'desc' },
      },
      _count: { select: { results: true } },
    },
  });

  if (!assignment) notFound();

  const avgScore =
    assignment.results.length > 0
      ? Math.round(assignment.results.reduce((acc, curr) => acc + curr.score, 0) / assignment.results.length)
      : 0;

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] space-y-6 bg-slate-50/30 p-8">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/organization/assignments">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Assignments
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{assignment.title}</h1>
        <p className="text-slate-500">
          {assignment.examination?.title || assignment.paper.title} • {assignment.paper.subject?.name} • {format(assignment.startTime, 'PPP')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignment._count.results}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignment.results.length > 0 ? `${avgScore}%` : '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={assignment.status === 'ACTIVE' ? 'default' : 'secondary'}>{assignment.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignment.results.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={attempt.user.image || ''} />
                        <AvatarFallback>{attempt.user.name?.[0] || 'S'}</AvatarFallback>
                      </Avatar>
                      {attempt.user.name || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>{attempt.user.email}</TableCell>
                  <TableCell>{format(attempt.createdAt, 'MMM d, h:mm a')}</TableCell>
                  <TableCell>
                    <Badge
                      variant={attempt.score >= 50 ? 'outline' : 'destructive'}
                      className={attempt.score >= 50 ? 'border-green-200 bg-green-50 text-green-600' : ''}
                    >
                      {attempt.score}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {attempt.status === 'IN_PROGRESS' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-600">Grading...</span>
                    ) : (
                      <span className="text-xs text-slate-500">Completed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {assignment.results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    No students have taken this assignment yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
