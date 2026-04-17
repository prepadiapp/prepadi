'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, BookOpen, Shapes } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function OrganizationSubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  const stats = useMemo(() => ({
    total: subjects.length,
    inUse: subjects.filter((subject) => (subject._count?.questions || 0) > 0 || (subject._count?.examPapers || 0) > 0).length,
  }), [subjects]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organization/subjects');
      if (!res.ok) throw new Error('Failed to load subjects');
      setSubjects(await res.json());
    } catch (error) {
      toast.error('Could not load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleCreate = async () => {
    const name = newSubject.trim();
    if (!name) {
      toast.error('Enter a subject name');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/organization/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Create failed');
      }

      toast.success('Subject created');
      setNewSubject('');
      fetchSubjects();
    } catch (error: any) {
      toast.error(error?.message || 'Could not create subject');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject? This only works if it has not been used yet.')) return;

    try {
      const res = await fetch(`/api/organization/subjects?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Delete failed');
      }
      toast.success('Subject deleted');
      fetchSubjects();
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete subject');
    }
  };

  return (
    <div className="space-y-8">
      <Toaster richColors />

      <section className="rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_22px_70px_-36px_rgba(37,99,235,0.45)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Organization Subjects
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create private subjects that only your organization and students can use.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                These subjects appear in your organization workflows like examination creation and bulk upload, but they stay private to your institution.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-slate-200 bg-white/85 shadow-none">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                    <Shapes className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Private Subjects</p>
                    <p className="text-2xl font-semibold text-slate-950">{stats.total}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200 bg-white/85 shadow-none">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Already In Use</p>
                    <p className="text-2xl font-semibold text-slate-950">{stats.inUse}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-blue-100 bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Add Subject</CardTitle>
              <CardDescription>Create a subject that is available only to your organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Subject Name</Label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Civic Education Advanced"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full bg-blue-600 hover:bg-blue-700">
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Subject
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-xl text-slate-900">Your Subject Library</CardTitle>
          <CardDescription>Only unused subjects can be deleted. Subjects already linked to papers or questions stay protected.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No private subjects yet. Create your first one to start customizing your organization library.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Papers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => {
                  const inUse = (subject._count?.questions || 0) > 0 || (subject._count?.examPapers || 0) > 0;
                  return (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium text-slate-900">{subject.name}</TableCell>
                      <TableCell>{subject._count?.questions || 0}</TableCell>
                      <TableCell>{subject._count?.examPapers || 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={inUse ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>
                          {inUse ? 'In Use' : 'Unused'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(subject.id)}
                          disabled={inUse}
                          className="text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
