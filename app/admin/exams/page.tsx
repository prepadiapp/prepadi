'use client';

import { useEffect, useMemo, useState } from 'react';
import { ContentStatus, ExaminationCategory } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Filter, FolderKanban, Building2, BookCopy, Clock3 } from 'lucide-react';
import { ExamFormDialog } from '@/components/admin/ExamFormDialog';
import { Toaster, toast } from 'sonner';

type OwnerType = 'PLATFORM' | 'ORGANIZATION';

interface OrganizationOption {
  id: string;
  name: string;
}

interface SimpleOption {
  id: string;
  name: string;
}

interface ExaminationRecord {
  id: string;
  title: string;
  category: ExaminationCategory;
  status: ContentStatus;
  year?: number | null;
  duration?: number | null;
  practiceEnabled: boolean;
  randomizeQuestions: boolean;
  allowCustomOrder: boolean;
  description?: string | null;
  organizationId?: string | null;
  ownerType: OwnerType;
  questionCount: number;
  updatedAt: string;
  organization?: { id: string; name: string } | null;
  papers: Array<{
    id: string;
    title: string;
    paperLabel?: string | null;
    status: ContentStatus;
    exam?: { name: string; shortName: string } | null;
    subject?: { name: string } | null;
    _count: { questions: number };
  }>;
}

export default function ManageExamsPage() {
  const [items, setItems] = useState<ExaminationRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [examOptions, setExamOptions] = useState<SimpleOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SimpleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExaminationRecord | null>(null);
  const [filters, setFilters] = useState({
    q: '',
    ownerType: 'all',
    organizationId: 'all',
    category: 'all',
    status: 'all',
    examId: 'all',
    subjectId: 'all',
    year: 'all',
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
      const [itemsRes, orgsRes, examsRes, subjectsRes] = await Promise.all([
        fetch(`/api/admin/examinations${query ? `?${query}` : ''}`),
        fetch('/api/admin/organizations'),
        fetch('/api/admin/exams'),
        fetch('/api/admin/subjects'),
      ]);

      if (!itemsRes.ok) throw new Error('Failed to fetch examinations');
      if (!orgsRes.ok) throw new Error('Failed to fetch organizations');

      setItems(await itemsRes.json());
      setOrganizations(await orgsRes.json());
      if (examsRes.ok) setExamOptions(await examsRes.json());
      if (subjectsRes.ok) setSubjectOptions(await subjectsRes.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [query]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this examination and its papers? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/examinations/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to delete examination' }));
        throw new Error(data.error || 'Failed to delete examination');
      }
      toast.success('Examination deleted');
      void fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete examination');
    }
  };

  const handleStatusChange = async (item: ExaminationRecord, status: ContentStatus) => {
    try {
      const response = await fetch(`/api/admin/examinations/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      toast.success(`Examination moved to ${status.toLowerCase()}`);
      void fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  return (
    <>
      <Toaster richColors />
      <ExamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        exam={selectedExam}
        organizations={organizations}
        onSave={() => {
          setDialogOpen(false);
          void fetchData();
        }}
      />
      <section className="space-y-6 pb-20">
        <div className="rounded-[2rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,255,0.92))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--primary-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <FolderKanban className="h-3.5 w-3.5" />
                Global Examination Control
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Manage all examinations</h1>
              <p className="max-w-2xl text-sm text-slate-600">
                Review platform and organization-owned examinations, switch publish states, and keep every content stream visible from one calm admin surface.
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedExam(null);
                setDialogOpen(true);
              }}
              className="h-11 rounded-full px-5 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Examination
            </Button>
          </div>
        </div>

        <Card className="border-[color:var(--primary-border)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filters
            </CardTitle>
            <CardDescription>Slice by owner, organization, category, and status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
            <div className="space-y-2 xl:col-span-2">
              <Label>Search</Label>
              <Input
                value={filters.q}
                onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
                placeholder="Search title or description"
              />
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
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(value) => setFilters((current) => ({ ...current, category: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.values(ExaminationCategory).map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exam brand</Label>
              <Select value={filters.examId} onValueChange={(value) => setFilters((current) => ({ ...current, examId: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All exam brands</SelectItem>
                  {examOptions.map((exam) => (
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
                  {subjectOptions.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                value={filters.year === 'all' ? '' : filters.year}
                onChange={(e) => setFilters((current) => ({ ...current, year: e.target.value || 'all' }))}
                placeholder="Optional year"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[1.75rem] border border-dashed border-[color:var(--primary-border)] bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden border-[color:var(--primary-border)] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.ownerType === 'PLATFORM' ? 'secondary' : 'default'}>
                          {item.ownerType === 'PLATFORM' ? 'Platform' : 'Organization'}
                        </Badge>
                        <Badge variant={item.status === 'PUBLISHED' ? 'default' : item.status === 'ARCHIVED' ? 'destructive' : 'outline'}>
                          {item.status}
                        </Badge>
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {item.organization?.name || 'Platform library'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookCopy className="h-3.5 w-3.5" />
                          {item.papers.length} paper{item.papers.length === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {item.duration ? `${item.duration} mins` : 'Untimed'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedExam(item);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => void handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {item.description && <p className="text-sm leading-6 text-slate-600">{item.description}</p>}

                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Year</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{item.year ?? 'Flexible'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Questions</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{item.questionCount}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Updated</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{new Date(item.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Papers inside</p>
                      <div className="flex gap-2">
                        {item.status !== 'PUBLISHED' ? (
                          <Button size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => void handleStatusChange(item, ContentStatus.PUBLISHED)}>
                            Publish
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs" onClick={() => void handleStatusChange(item, ContentStatus.DRAFT)}>
                            Move to draft
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {item.papers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                          No papers yet. Create or attach papers from the paper manager next.
                        </div>
                      ) : (
                        item.papers.slice(0, 3).map((paper) => (
                          <div key={paper.id} className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{paper.paperLabel || paper.title}</p>
                              <p className="text-xs text-slate-500">
                                {[paper.exam?.shortName, paper.subject?.name].filter(Boolean).join(' • ')} • {paper._count.questions} questions
                              </p>
                            </div>
                            <Badge variant={paper.status === 'PUBLISHED' ? 'default' : 'outline'}>{paper.status}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
