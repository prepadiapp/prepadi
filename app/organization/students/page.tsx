'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Mail, User, Copy, RefreshCw, Check, X } from 'lucide-react';
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, invitesRes, generalRes, requestsRes] = await Promise.all([
        fetch('/api/organization/students'),
        fetch('/api/organization/invite'),
        fetch('/api/organization/invite/general'),
        fetch('/api/organization/join-request')
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
      toast.error("Failed to load data");
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

      toast.success("Invite sent successfully!");
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
      if(!confirm("This will invalidate the old link. Continue?")) return;
      try {
          const res = await fetch('/api/organization/invite/general', { method: 'POST' });
          if(res.ok) {
              const data = await res.json();
              setGeneralLink(data.link);
              toast.success("Link regenerated");
          }
      } catch(e) { toast.error("Error regenerating link"); }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generalLink);
      toast.success("Copied to clipboard");
  };

  const handleRequestAction = async (id: string, action: 'approve' | 'reject') => {
      try {
          const res = await fetch(`/api/organization/join-request/${id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action })
          });
          if(res.ok) {
              toast.success(`Request ${action}d`);
              fetchData();
          }
      } catch(e) { toast.error("Action failed"); }
  };

  const handleRevokeInvite = async (id: string) => {
    if(!confirm("Are you sure?")) return;
    try {
      await fetch(`/api/organization/invite/${id}`, { method: 'DELETE' });
      toast.success("Invite revoked");
      setInvites(prev => prev.filter(i => i.id !== id));
    } catch (err) { toast.error("Failed to revoke invite"); }
  };

  return (
    <div className="space-y-6">
      <Toaster richColors />
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage your organization members.</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Invite Student</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Student</DialogTitle>
              <DialogDescription>Send a direct email invitation.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendInvite}>
              <div className="py-4">
                <Input 
                  placeholder="student@example.com" 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={sendingInvite}>
                  {sendingInvite && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Invite
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- General Link Card --- */}
      <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col gap-1 w-full">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">General Invite Link</span>
                  <div className="flex gap-2">
                    <Input value={generalLink} readOnly className="bg-white font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy">
                        <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleRegenerateLink} title="Regenerate">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
              </div>
              <div className="text-xs text-muted-foreground md:max-w-xs">
                  Anyone with this link can request to join your organization. You must approve them.
              </div>
          </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Students ({students.length})</TabsTrigger>
          <TabsTrigger value="requests">Join Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending Invites ({invites.length})</TabsTrigger>
        </TabsList>

        {/* --- Active Students Tab --- */}
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-24">No active students.</TableCell></TableRow>
                  ) : (
                    students.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {s.name?.[0] || 'U'}
                          </div>
                          {s.name || 'Unnamed'}
                        </TableCell>
                        <TableCell>{s.email}</TableCell>
                        <TableCell>{s._count.quizAttempts} Exams</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Join Requests Tab --- */}
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
                                <TableRow><TableCell colSpan={4} className="text-center h-24">No pending requests.</TableCell></TableRow>
                            ) : (
                                requests.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.user.name}</TableCell>
                                        <TableCell>{r.user.email}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 h-8" onClick={() => handleRequestAction(r.id, 'approve')}>
                                                <Check className="w-4 h-4 mr-1" /> Approve
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 h-8" onClick={() => handleRequestAction(r.id, 'reject')}>
                                                <X className="w-4 h-4 mr-1" /> Reject
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

        {/* --- Pending Invites Tab --- */}
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
                    <TableRow><TableCell colSpan={4} className="text-center h-24">No pending invites.</TableCell></TableRow>
                  ) : (
                    invites.map(i => (
                      <TableRow key={i.id}>
                        <TableCell>{i.email}</TableCell>
                        <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(i.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleRevokeInvite(i.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
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