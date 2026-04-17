'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Copy, RefreshCw, Check, X, TrendingUp, History, Users, Trophy } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function StudentManagementPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [generalLink, setGeneralLink] = useState('');

  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const studentStats = useMemo(() => {
    const activeStudents = students.filter((student) => student.attempts > 0).length;
    const avgScoreValues = students.map((student) => student.avgScore).filter((score) => typeof score === 'number');
    const orgAverage =
      avgScoreValues.length > 0
        ? Math.round(avgScoreValues.reduce((sum, score) => sum + score, 0) / avgScoreValues.length)
        : 0;

    return {
      total: students.length,
      activeStudents,
      orgAverage,
    };
  }, [students]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, invitesRes, generalRes, requestsRes] = await Promise.all([
        fetch('/api/organization/students'),
        fetch('/api/organization/invite'),
        fetch('/api/organization/invite/general'),
        fetch('/api/organization/join-request'),
      ]);

      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (invitesRes.ok) setInvites(await invitesRes.json());
      if (generalRes.ok) {
        const data = await generalRes.json();
        setGeneralLink(data.link);
      }
      if (requestsRes.ok) setRequests(await requestsRes.json());
    } catch (e) {
      console.error(e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingInvite(true);
    try {
      const res = await fetch('/api/organization/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success('Invite sent successfully!');
      setInviteEmail('');
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!confirm('This will invalidate the old link. Continue?')) return;
    try {
      const res = await fetch('/api/organization/invite/general', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGeneralLink(data.link);
        toast.success('Link regenerated');
      }
    } catch (e) {
      toast.error('Error regenerating link');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generalLink);
    toast.success('Copied to clipboard');
  };

  const handleRequestAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/organization/join-request/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`Request ${action}d`);
        fetchData();
      }
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetch(`/api/organization/invite/${id}`, { method: 'DELETE' });
      toast.success('Invite revoked');
      setInvites((prev) => prev.filter((invite) => invite.id !== id));
    } catch (err) {
      toast.error('Failed to revoke invite');
    }
  };

  return (
    <div className="space-y-6">
      <Toaster richColors />

      <div className="rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_22px_70px_-36px_rgba(37,99,235,0.45)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Students & Performance</span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Manage members and track how they are performing.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Invite students, approve join requests, and review recent attempt history without leaving the organization workspace.
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Invite Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Student</DialogTitle>
                <DialogDescription>Send a direct email invitation.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendInvite}>
                <div className="py-4">
                  <Input placeholder="student@example.com" type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={sendingInvite}>
                    {sendingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invite
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 bg-white/85 shadow-none">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Students</p>
                <p className="text-2xl font-semibold text-slate-950">{studentStats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white/85 shadow-none">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Learners</p>
                <p className="text-2xl font-semibold text-slate-950">{studentStats.activeStudents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white/85 shadow-none">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Average Score</p>
                <p className="text-2xl font-semibold text-slate-950">{studentStats.orgAverage}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">General Invite Link</span>
            <div className="flex gap-2">
              <Input value={generalLink} readOnly className="bg-white font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleRegenerateLink} title="Regenerate">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-w-sm text-xs text-muted-foreground">
            Anyone with this link can request to join your organization. You still approve them before they become active members.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Students ({students.length})</TabsTrigger>
          <TabsTrigger value="requests">Join Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending Invites ({invites.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Student Performance Records</CardTitle>
              <CardDescription>Recent activity, attempt volume, and score trends for your organization members.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Best</TableHead>
                      <TableHead>Recent History</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">No active students.</TableCell>
                      </TableRow>
                    ) : (
                      students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="min-w-[240px]">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-slate-900">{student.name || 'Unnamed'}</span>
                              <span className="text-xs text-slate-500">{student.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{student.attempts}</TableCell>
                          <TableCell>
                            {student.avgScore !== null ? (
                              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{student.avgScore}%</Badge>
                            ) : (
                              <span className="text-xs text-slate-400">No attempts</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.bestScore !== null ? (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{student.bestScore}%</Badge>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[300px]">
                            {student.recentAttempts?.length > 0 ? (
                              <div className="space-y-2">
                                {student.recentAttempts.slice(0, 3).map((attempt: any) => (
                                  <div key={attempt.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-slate-800">{attempt.exam.shortName} • {attempt.subject.name}</span>
                                      <span className="text-slate-500">{new Date(attempt.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <span className="font-semibold text-slate-900">{attempt.score}%</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <History className="h-3.5 w-3.5" /> No recent history
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending requests.</TableCell></TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.user.name}</TableCell>
                        <TableCell>{request.user.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button size="sm" variant="default" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => handleRequestAction(request.id, 'approve')}>
                            <Check className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-red-500 hover:text-red-700" onClick={() => handleRequestAction(request.id, 'reject')}>
                            <X className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending invites.</TableCell></TableRow>
                  ) : (
                    invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>{invite.email}</TableCell>
                        <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(invite.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleRevokeInvite(invite.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
