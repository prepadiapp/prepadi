'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExaminationCategory, Exam, Subject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Upload, Plus, Layers3, CheckCircle2, Clock3, BookOpenCheck, Sparkles } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const categories: { value: ExaminationCategory; label: string }[] = [
  { value: 'CUSTOM', label: 'Custom' },
  { value: 'PRACTICE', label: 'Practice Test' },
  { value: 'MOCK', label: 'Mock Exam' },
  { value: 'INTERNAL', label: 'Internal Assessment' },
  { value: 'YEARLY', label: 'Yearly Exam' },
];

export default function OrgPapersPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cloneCatalog, setCloneCatalog] = useState<Array<{
    examId: string;
    subjectId: string;
    year: number;
    examName: string;
    subjectName: string;
  }>>([]);
  const [examinations, setExaminations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [category, setCategory] = useState<ExaminationCategory>('CUSTOM');
  const [year, setYear] = useState('');
  const [duration, setDuration] = useState('');
  const [cloneExamId, setCloneExamId] = useState('');
  const [cloneSubjectId, setCloneSubjectId] = useState('');
  const [cloneYear, setCloneYear] = useState(new Date().getFullYear().toString());

  const groupedStats = useMemo(() => {
    const stats = {
      total: examinations.length,
      published: examinations.filter((exam) => exam.status === 'PUBLISHED').length,
      draft: examinations.filter((exam) => exam.status === 'DRAFT').length,
      practiceEnabled: examinations.filter((exam) => exam.practiceEnabled).length,
    };
    return stats;
  }, [examinations]);

  const cloneableExams = useMemo(() => {
    const ids = new Set(cloneCatalog.map((item) => item.examId));
    return exams.filter((exam) => ids.has(exam.id));
  }, [cloneCatalog, exams]);

  const cloneableSubjects = useMemo(() => {
    if (!cloneExamId) return [];
    const subjectIds = new Set(
      cloneCatalog.filter((item) => item.examId === cloneExamId).map((item) => item.subjectId)
    );
    return subjects.filter((subject) => subjectIds.has(subject.id));
  }, [cloneCatalog, cloneExamId, subjects]);

  const cloneableYears = useMemo(() => {
    if (!cloneExamId || !cloneSubjectId) return [];
    return Array.from(
      new Set(
        cloneCatalog
          .filter((item) => item.examId === cloneExamId && item.subjectId === cloneSubjectId)
          .map((item) => item.year)
      )
    ).sort((a, b) => b - a);
  }, [cloneCatalog, cloneExamId, cloneSubjectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metaRes, examsRes] = await Promise.all([fetch('/api/common/metadata'), fetch('/api/organization/examinations')]);

      if (metaRes.ok) {
        const data = await metaRes.json();
        setExams(data.exams);
        setSubjects(data.subjects);
        setCloneCatalog(data.cloneCatalog || []);
      }

      if (examsRes.ok) {
        setExaminations(await examsRes.json());
      }
    } catch (error) {
      toast.error('Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!cloneCatalog.length || cloneExamId) return;
    setCloneExamId(cloneCatalog[0].examId);
    setCloneSubjectId(cloneCatalog[0].subjectId);
    setCloneYear(String(cloneCatalog[0].year));
  }, [cloneCatalog, cloneExamId]);

  useEffect(() => {
    if (!cloneExamId) {
      setCloneSubjectId('');
      return;
    }

    const validSubject = cloneCatalog.some(
      (item) => item.examId === cloneExamId && item.subjectId === cloneSubjectId
    );

    if (!validSubject) {
      const firstMatch = cloneCatalog.find((item) => item.examId === cloneExamId);
      setCloneSubjectId(firstMatch?.subjectId || '');
    }
  }, [cloneExamId, cloneSubjectId, cloneCatalog]);

  useEffect(() => {
    if (!cloneExamId || !cloneSubjectId) return;

    const validYear = cloneCatalog.some(
      (item) =>
        item.examId === cloneExamId &&
        item.subjectId === cloneSubjectId &&
        String(item.year) === cloneYear
    );

    if (!validYear) {
      const firstMatch = cloneCatalog.find(
        (item) => item.examId === cloneExamId && item.subjectId === cloneSubjectId
      );
      setCloneYear(firstMatch ? String(firstMatch.year) : '');
    }
  }, [cloneExamId, cloneSubjectId, cloneYear, cloneCatalog]);

  const handleTogglePublish = async (examination: any) => {
    try {
      const nextStatus = examination.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      const res = await fetch(`/api/organization/examinations/${examination.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          syncPaperSettings: true,
          practiceEnabled: nextStatus === 'PUBLISHED' ? examination.practiceEnabled : false,
        }),
      });

      if (!res.ok) throw new Error('Failed to update publication status');
      toast.success(nextStatus === 'PUBLISHED' ? 'Examination published' : 'Examination moved to draft');
      fetchData();
    } catch (error) {
      toast.error('Could not update examination status');
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !subjectId) {
      toast.error('Title and subject are required');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/organization/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          year: year ? Number(year) : null,
          duration: duration ? Number(duration) : null,
          subjectId,
        }),
      });

      if (!res.ok) throw new Error('Create failed');
      const examination = await res.json();
      const firstPaper = examination.papers?.[0];
      toast.success('Examination created');
      if (firstPaper?.id) {
        router.push(`/organization/papers/${firstPaper.id}`);
        return;
      }

      fetchData();
    } catch (error) {
      toast.error('Could not create examination');
    } finally {
      setProcessing(false);
    }
  };

  const handleCloneGlobal = async () => {
    if (!cloneExamId || !cloneSubjectId || !cloneYear) {
      toast.error('Exam body, subject, and year are required for global clone');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/organization/papers/find-or-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: cloneExamId,
          subjectId: cloneSubjectId,
          year: Number(cloneYear),
          mode: 'clone',
          category: 'YEARLY',
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Clone failed');
      }

      const paper = await res.json();
      toast.success(
        paper.existingClone
          ? 'You already cloned this global exam. Opening your existing draft.'
          : 'Global exam cloned into your draft library'
      );
      router.push(`/organization/papers/${paper.id}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to clone global content');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen space-y-8 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] p-4 font-sans md:p-8">
      <Toaster richColors position="top-center" />

      <div className="mx-auto max-w-[1500px] space-y-8">
        <section className="rounded-[28px] border border-blue-100 bg-white/90 p-6 shadow-[0_25px_80px_-35px_rgba(37,99,235,0.45)] backdrop-blur md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <Badge className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                Examination Studio
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                  Build reusable examinations for practice, mocks, and school delivery.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Create draft examinations, manage paper sets, preserve question order by default, and publish only when the content is ready for students.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-blue-100 bg-blue-50/70 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Total</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{groupedStats.total}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 bg-emerald-50/80 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Published</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{groupedStats.published}</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-100 bg-amber-50/80 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Drafts</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{groupedStats.draft}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-slate-50/80 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Practice Ready</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{groupedStats.practiceEnabled}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="border-blue-100 bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Create Examination</CardTitle>
                <CardDescription>Start with a clean reusable examination container and edit its first paper immediately.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Examination Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Practice Test 1" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(value: ExaminationCategory) => setCategory(value)}>
                      <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject</Label>
                    <Select value={subjectId} onValueChange={setSubjectId}>
                      <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Year (Optional)</Label>
                    <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (Minutes)</Label>
                    <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={processing} className="h-11 w-full bg-blue-600 font-semibold hover:bg-blue-700">
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Examination
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 bg-white/95">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-slate-900">Your Examinations</CardTitle>
                <CardDescription>Draft, publish, and manage the paper sets that power assignments and practice access.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="text-slate-500 hover:text-slate-900">
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : examinations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
                  <Layers3 className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-base font-medium text-slate-900">No examinations yet</p>
                  <p className="mt-1 text-sm text-slate-500">Create your first reusable examination to begin building your organization library.</p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {examinations.map((examination) => {
                    const firstPaper = examination.papers?.[0];
                    return (
                      <Card key={examination.id} className="border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                        <CardHeader className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn(
                              'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                              examination.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                            )}>
                              {examination.status}
                            </Badge>
                            <Badge variant="outline" className="rounded-full text-[11px]">
                              {examination.category}
                            </Badge>
                            {examination.practiceEnabled && (
                              <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-[11px] text-blue-700">
                                Practice enabled
                              </Badge>
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg text-slate-900">{examination.title}</CardTitle>
                            <CardDescription className="mt-1 text-sm">
                              {examination._count?.papers || examination.papers?.length || 0} paper set | {examination._count?.assignments || 0} assignment{(examination._count?.assignments || 0) === 1 ? '' : 's'}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-2 text-sm text-slate-600">
                            {examination.papers?.slice(0, 2).map((paper: any) => (
                              <div key={paper.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                                <div>
                                  <p className="font-medium text-slate-800">{paper.paperLabel || paper.title}</p>
                                  <p className="text-xs text-slate-500">{paper.subject?.name || 'No subject'} | {paper._count?.questions || 0} questions</p>
                                </div>
                                <Badge variant="secondary" className="text-[11px]">{paper.status}</Badge>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {firstPaper && (
                              <Button onClick={() => router.push(`/organization/papers/${firstPaper.id}`)} className="bg-blue-600 hover:bg-blue-700">
                                <BookOpenCheck className="mr-2 h-4 w-4" />
                                Open Editor
                              </Button>
                            )}
                            <Button
                              variant={examination.status === 'PUBLISHED' ? 'outline' : 'default'}
                              className={cn(
                                examination.status === 'PUBLISHED'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              )}
                              onClick={() => handleTogglePublish(examination)}
                            >
                              {examination.status === 'PUBLISHED' ? 'Move To Draft' : 'Publish Examination'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Link href="/organization/bulk-upload" className="block">
              <Card className="border-blue-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,255,255,1))] transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                    <Upload className="h-5 w-5 text-blue-600" /> Bulk Upload
                  </CardTitle>
                  <CardDescription>Import documents into draft examination content, review the output, and publish when ready.</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Card className="border-slate-200 bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Quick Start Ideas</CardTitle>
                <CardDescription>Use the new examination model for more flexible structures than year-only papers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900">Practice Test Series</p>
                    <p>Create Practice Test 1, 2, and 3 without tying them to a year.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="font-medium text-slate-900">Draft then Publish</p>
                    <p>Keep content private while setting questions, then publish only when the review is complete.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-amber-600" />
                  <div>
                    <p className="font-medium text-slate-900">Schedule Safely</p>
                    <p>Published examinations can be scheduled into assignments with timezone-safe date handling.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white/95">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Clone Global Content</CardTitle>
                <CardDescription>Reuse public yearly content as a draft organization examination before refining it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label>Exam Body</Label>
                    <Select value={cloneExamId} onValueChange={setCloneExamId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose exam body" />
                      </SelectTrigger>
                      <SelectContent>
                        {cloneableExams.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Subject</Label>
                      <Select value={cloneSubjectId} onValueChange={setCloneSubjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {cloneableSubjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Year</Label>
                      <Select value={cloneYear} onValueChange={setCloneYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose year" />
                        </SelectTrigger>
                        <SelectContent>
                          {cloneableYears.map((availableYear) => (
                            <SelectItem key={availableYear} value={String(availableYear)}>
                              {availableYear}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-center border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  disabled={processing || cloneCatalog.length === 0 || !cloneExamId || !cloneSubjectId || !cloneYear}
                  onClick={handleCloneGlobal}
                >
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Clone Into Draft Library
                </Button>
                <p className="text-xs leading-5 text-slate-500">
                  This pulls the selected global paper or question set into your organization as a draft examination, so your team can refine it before publishing.
                </p>
                {cloneCatalog.length === 0 && (
                  <p className="text-xs leading-5 text-amber-600">
                    No global clone content is currently available yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
