'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ContentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Toaster, toast } from 'sonner';
import { EditPaperDialog } from '@/components/admin/EditPaperDialog';
import { BookCopy, Building2, Filter, Loader2, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';

interface OrganizationOption {
  id: string;
  name: string;
}

interface SimpleOption {
  id: string;
  name: string;
  shortName?: string;
  isYearBased?: boolean;
}

interface PaperRecord {
  id: string;
  title: string;
  paperLabel?: string | null;
  year?: number | null;
  status: ContentStatus;
  isPublic: boolean;
  isVerified: boolean;
  duration?: number | null;
  randomizeQuestions: boolean;
  allowCustomOrder: boolean;
  practiceEnabled: boolean;
  ownerType: 'PLATFORM' | 'ORGANIZATION';
  questionCount: number;
  flaggedQuestionCount: number;
  organization?: { id: string; name: string } | null;
  exam?: { id: string; name: string; shortName: string; isYearBased?: boolean } | null;
  subject?: { id: string; name: string } | null;
  examination?: { id: string; title: string; category: string; status: ContentStatus; year?: number | null } | null;
}

export default function PapersPage() {
  const [papers, setPapers] = useState<PaperRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [exams, setExams] = useState<SimpleOption[]>([]);
  const [subjects, setSubjects] = useState<SimpleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: '',
    ownerType: 'all',
    organizationId: 'all',
    examId: 'all',
    subjectId: 'all',
    status: 'all',
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [papersRes, orgsRes, examsRes, subjectsRes] = await Promise.all([
        fetch(`/api/admin/papers${query ? `?${query}` : ''}`),
        fetch('/api/admin/organizations'),
        fetch('/api/admin/exams'),
        fetch('/api/admin/subjects'),
      ]);

      if (!papersRes.ok) throw new Error('Failed to fetch papers');
      setPapers(await papersRes.json());
      if (orgsRes.ok) setOrganizations(await orgsRes.json());
      if (examsRes.ok) setExams(await examsRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [query]);

  const handleStatusChange = async (paper: PaperRecord, status: ContentStatus) => {
    try {
      const response = await fetch(`/api/admin/papers/${paper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          isPublic: status === 'PUBLISHED',
        }),
      });
      if (!response.ok) throw new Error('Failed to update paper status');
      toast.success(`Paper moved to ${status.toLowerCase()}`);
      void fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update paper status');
    }
  };

  const handleDelete = async (paper: PaperRecord) => {
    if (!confirm(`Delete ${paper.paperLabel || paper.title}?`)) return;
    try {
      const response = await fetch(`/api/admin/papers/${paper.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to delete paper' }));
        throw new Error(data.error || 'Failed to delete paper');
      }
      toast.success('Paper deleted');
      void fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete paper');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <Toaster richColors position="top-center" />

      <div className="rounded-[2rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,255,0.9))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--primary-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            All Papers
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Paper manager</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Every platform-owned and organization-owned paper lives here now, with ownership, publish state, verification, and moderation signals in one view.
          </p>
        </div>
      </div>

      <Card className="border-[color:var(--primary-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Filter papers
          </CardTitle>
          <CardDescription>Search by ownership, exam brand, subject, and status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2 xl:col-span-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search title or label"
                value={filters.q}
                onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={filters.ownerType} onValueChange={(value) => setFilters((current) => ({ ...current, ownerType: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                <SelectItem value="PLATFORM">Platform</SelectItem>
                <SelectItem value="ORGANIZATION">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select value={filters.organizationId} onValueChange={(value) => setFilters((current) => ({ ...current, organizationId: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {organizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Exam brand</Label>
            <Select value={filters.examId} onValueChange={(value) => setFilters((current) => ({ ...current, examId: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All exams</SelectItem>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={filters.subjectId} onValueChange={(value) => setFilters((current) => ({ ...current, subjectId: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.values(ContentStatus).map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-[1.75rem] border border-dashed border-[color:var(--primary-border)] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {papers.map((paper) => (
            <Card key={paper.id} className="overflow-hidden border-[color:var(--primary-border)] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={paper.ownerType === 'PLATFORM' ? 'secondary' : 'default'}>
                        {paper.ownerType === 'PLATFORM' ? 'Platform' : 'Organization'}
                      </Badge>
                      <Badge variant={paper.status === 'PUBLISHED' ? 'default' : 'outline'}>{paper.status}</Badge>
                      {paper.isVerified && (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-950">{paper.paperLabel || paper.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <BookCopy className="h-3.5 w-3.5" />
                        {[paper.exam?.shortName, paper.subject?.name, paper.year ?? 'Flexible'].filter(Boolean).join(' • ')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {paper.organization?.name || 'Platform library'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EditPaperDialog paper={paper} onSuccess={fetchData} />
                    <Button asChild variant="outline" size="sm" className="rounded-full">
                      <Link href={`/admin/papers/${paper.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Questions</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{paper.questionCount}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Flagged</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{paper.flaggedQuestionCount}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Duration</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{paper.duration ? `${paper.duration} mins` : 'Untimed'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ordering</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {paper.randomizeQuestions ? 'Randomized' : 'Author order'}
                    </p>
                  </div>
                </div>

                {paper.examination && (
                  <div className="rounded-2xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Examination</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {paper.examination.title} • {paper.examination.category}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => void handleDelete(paper)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  {paper.status !== 'PUBLISHED' ? (
                    <Button size="sm" className="rounded-full" onClick={() => void handleStatusChange(paper, ContentStatus.PUBLISHED)}>
                      Publish
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => void handleStatusChange(paper, ContentStatus.DRAFT)}>
                      Move to Draft
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
