'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, FolderKanban, CalendarDays, Layers3 } from 'lucide-react';
import { AdminSubjectsDirectory } from '@/components/admin/AdminSubjectsDirectory';
import { Toaster, toast } from 'sonner';

interface SimpleOption {
  id: string;
  name: string;
  shortName?: string;
  description?: string | null;
  isYearBased?: boolean;
}

export default function CurriculumPage() {
  const searchParams = useSearchParams();
  const [examOptions, setExamOptions] = useState<SimpleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<SimpleOption | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandShortName, setBrandShortName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [brandSaving, setBrandSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'subjects' ? 'subjects' : 'exams');

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/exams');
      if (!response.ok) throw new Error('Failed to fetch exam brands');
      setExamOptions(await response.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load exam brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchExams();
  }, []);

  useEffect(() => {
    setActiveTab(searchParams.get('tab') === 'subjects' ? 'subjects' : 'exams');
  }, [searchParams]);

  const openCreateBrandDialog = () => {
    setSelectedBrand(null);
    setBrandName('');
    setBrandShortName('');
    setBrandDescription('');
    setBrandDialogOpen(true);
  };

  const openEditBrandDialog = (exam: SimpleOption) => {
    setSelectedBrand(exam);
    setBrandName(exam.name);
    setBrandShortName(exam.shortName || '');
    setBrandDescription(exam.description || '');
    setBrandDialogOpen(true);
  };

  const handleExamYearModeToggle = async (exam: SimpleOption, isYearBased: boolean) => {
    try {
      const response = await fetch(`/api/admin/exams/${exam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exam,
          shortName: exam.shortName || exam.name,
          isYearBased,
        }),
      });

      if (!response.ok) throw new Error('Failed to update exam brand');
      toast.success(`${exam.name} is now ${isYearBased ? 'year-based' : 'flexible'}`);
      setExamOptions((current) =>
        current.map((item) => (item.id === exam.id ? { ...item, isYearBased } : item))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update exam brand');
    }
  };

  const handleSaveBrand = async () => {
    if (!brandName.trim() || !brandShortName.trim()) {
      toast.error('Exam name and short code are required');
      return;
    }

    setBrandSaving(true);
    try {
      const response = await fetch(
        selectedBrand ? `/api/admin/exams/${selectedBrand.id}` : '/api/admin/exams',
        {
          method: selectedBrand ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: brandName.trim(),
            shortName: brandShortName.trim(),
            description: brandDescription.trim() || null,
            isYearBased: selectedBrand?.isYearBased === false ? false : true,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to save exam brand');

      toast.success(`Exam brand ${selectedBrand ? 'updated' : 'created'}`);
      setBrandDialogOpen(false);
      await fetchExams();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save exam brand');
    } finally {
      setBrandSaving(false);
    }
  };

  const handleDeleteBrand = async (exam: SimpleOption) => {
    if (!confirm(`Delete ${exam.name}?`)) return;

    try {
      const response = await fetch(`/api/admin/exams/${exam.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete exam brand');
      toast.success('Exam brand deleted');
      await fetchExams();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete exam brand');
    }
  };

  return (
    <>
      <Toaster richColors />

      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{selectedBrand ? 'Edit Exam Brand' : 'Create Exam Brand'}</DialogTitle>
            <DialogDescription>
              Manage the exam brands that appear across curriculum, upload, and student selection flows.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Exam name</Label>
              <Input id="brand-name" value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="WAEC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-short-name">Short code</Label>
              <Input id="brand-short-name" value={brandShortName} onChange={(event) => setBrandShortName(event.target.value)} placeholder="WAEC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-description">Description</Label>
              <Input id="brand-description" value={brandDescription} onChange={(event) => setBrandDescription(event.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBrand} disabled={brandSaving}>
              {brandSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selectedBrand ? 'Save Changes' : 'Create Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="space-y-6 pb-20">
        <div className="rounded-[2rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,255,0.92))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--primary-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <FolderKanban className="h-3.5 w-3.5" />
              Curriculum Control
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Manage curriculum</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Keep exam brands and subjects together in one calm admin surface.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto rounded-2xl border border-[color:var(--primary-border)] bg-white p-1">
            <TabsTrigger value="exams" className="rounded-xl px-4 py-2.5">Exams</TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-xl px-4 py-2.5">Subjects</TabsTrigger>
          </TabsList>

          <TabsContent value="exams" className="space-y-6">
            <Card className="border-[color:var(--primary-border)]">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-primary" />
                      Exam brands
                    </CardTitle>
                    <CardDescription>
                      Add, edit, remove, and control whether an exam brand uses yearly papers.
                    </CardDescription>
                  </div>
                  <Button onClick={openCreateBrandDialog} variant="outline" className="rounded-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Exam Brand
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-[color:var(--primary-border)] bg-white">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {examOptions.map((exam) => (
                      <div key={exam.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{exam.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{exam.shortName || 'No code'} curriculum pattern</p>
                          </div>
                          <Badge variant={exam.isYearBased === false ? 'secondary' : 'outline'} className="gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {exam.isYearBased === false ? 'No year' : 'Yearly'}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-slate-800">Uses yearly papers</p>
                            <p className="text-[11px] text-slate-500">
                              {exam.isYearBased === false ? 'Students choose paper/test instead.' : 'Students choose a year.'}
                            </p>
                          </div>
                          <Switch
                            checked={exam.isYearBased !== false}
                            onCheckedChange={(checked) => void handleExamYearModeToggle(exam, checked)}
                          />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Button variant="outline" size="sm" className="rounded-full" onClick={() => openEditBrandDialog(exam)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="rounded-full text-red-600 hover:text-red-700" onClick={() => void handleDeleteBrand(exam)}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects">
            <AdminSubjectsDirectory embedded />
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}
