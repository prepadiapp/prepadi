'use client';

import { useEffect, useState } from 'react';
import {
  ContentStatus,
  ExaminationCategory,
} from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface OrganizationOption {
  id: string;
  name: string;
}

interface ExaminationRecord {
  id: string;
  title: string;
  description?: string | null;
  category: ExaminationCategory;
  year?: number | null;
  status: ContentStatus;
  duration?: number | null;
  randomizeQuestions: boolean;
  allowCustomOrder: boolean;
  practiceEnabled: boolean;
  organizationId?: string | null;
}

interface ExamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExaminationRecord | null;
  organizations: OrganizationOption[];
  onSave: () => void;
}

export function ExamFormDialog({
  open,
  onOpenChange,
  exam,
  organizations,
  onSave,
}: ExamFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExaminationCategory>(ExaminationCategory.CUSTOM);
  const [year, setYear] = useState('');
  const [status, setStatus] = useState<ContentStatus>(ContentStatus.DRAFT);
  const [duration, setDuration] = useState('');
  const [organizationId, setOrganizationId] = useState<string>('platform');
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [allowCustomOrder, setAllowCustomOrder] = useState(true);
  const [practiceEnabled, setPracticeEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && exam) {
      setTitle(exam.title);
      setDescription(exam.description || '');
      setCategory(exam.category);
      setYear(exam.year ? String(exam.year) : '');
      setStatus(exam.status);
      setDuration(exam.duration ? String(exam.duration) : '');
      setOrganizationId(exam.organizationId || 'platform');
      setRandomizeQuestions(exam.randomizeQuestions);
      setAllowCustomOrder(exam.allowCustomOrder);
      setPracticeEnabled(exam.practiceEnabled);
    } else if (open) {
      setTitle('');
      setDescription('');
      setCategory(ExaminationCategory.CUSTOM);
      setYear('');
      setStatus(ContentStatus.DRAFT);
      setDuration('');
      setOrganizationId('platform');
      setRandomizeQuestions(false);
      setAllowCustomOrder(true);
      setPracticeEnabled(false);
    }
  }, [open, exam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const apiPath = exam ? `/api/admin/examinations/${exam.id}` : '/api/admin/examinations';
    const method = exam ? 'PATCH' : 'POST';

    try {
      const response = await fetch(apiPath, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          year: year || null,
          status,
          duration: duration || null,
          organizationId: organizationId === 'platform' ? null : organizationId,
          randomizeQuestions,
          allowCustomOrder,
          practiceEnabled,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save examination' }));
        throw new Error(errorData.error || 'Failed to save examination');
      }

      toast.success(`Examination ${exam ? 'updated' : 'created'} successfully`);
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save examination');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{exam ? 'Edit Examination' : 'Create Examination'}</DialogTitle>
            <DialogDescription>
              Manage platform-wide and organization-owned examinations from one place.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Practice Test 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as ExaminationCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ExaminationCategory).map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ContentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ContentStatus).map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Optional"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Optional"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Owner</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform</SelectItem>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the examination"
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] p-4">
            <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Allow practice access</p>
                <p className="text-xs text-slate-500">Published content can appear in practice-ready flows.</p>
              </div>
              <Switch checked={practiceEnabled} onCheckedChange={setPracticeEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Randomize questions</p>
                <p className="text-xs text-slate-500">Keep this off unless random order is explicitly needed.</p>
              </div>
              <Switch checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Preserve custom order</p>
                <p className="text-xs text-slate-500">Manual paper ordering stays intact when enabled.</p>
              </div>
              <Switch checked={allowCustomOrder} onCheckedChange={setAllowCustomOrder} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {exam ? 'Save Changes' : 'Create Examination'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
