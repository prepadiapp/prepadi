'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Calendar, Clock, BookOpenCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fromUtcDateTime } from '@/lib/datetime';

interface Props {
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function CreateAssignmentDialog({ onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [examinations, setExaminations] = useState<any[]>([]);

  const [title, setTitle] = useState('');
  const [examinationId, setExaminationId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (open && examinations.length === 0) {
      fetch('/api/organization/examinations')
        .then((res) => res.json())
        .then((data) => {
          const published = Array.isArray(data)
            ? data.filter((exam: any) => exam.status === 'PUBLISHED' && exam.papers?.length > 0)
            : [];
          setExaminations(published);
        })
        .catch(() => toast.error('Failed to load examinations'));
    }
  }, [open, examinations.length]);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const nextTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    setStartTime((current) => current || fromUtcDateTime(nextHour));
    setEndTime((current) => current || fromUtcDateTime(nextTwoHours));
  }, [open]);

  const handleSubmit = async () => {
    if (!title || !examinationId || !startTime || !endTime) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/organization/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          examinationId,
          startTime,
          endTime,
          duration: duration || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create');

      toast.success('Assignment created!');
      setOpen(false);
      setTitle('');
      setExaminationId('');
      setStartTime('');
      setEndTime('');
      setDuration('');
      onSuccess();
    } catch (e) {
      toast.error('Error creating assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 font-semibold text-white shadow-md hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Create Assignment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Schedule New Assessment</DialogTitle>
          <DialogDescription>
            Create a time-bound examination for your students using one of your published examination sets.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Assignment Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midterm Biology Assessment" />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <BookOpenCheck className="h-3.5 w-3.5" /> Select Examination
            </Label>
            <Select value={examinationId} onValueChange={setExaminationId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a published examination" />
              </SelectTrigger>
              <SelectContent>
                {examinations.length === 0 ? (
                  <div className="p-2 text-center text-xs text-muted-foreground">No published examinations found. Publish one first.</div>
                ) : (
                  examinations.map((exam: any) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title} ({exam._count?.papers || exam.papers?.length || 0} paper{(exam._count?.papers || exam.papers?.length || 0) === 1 ? '' : 's'})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> Start Time
              </Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> End Time
              </Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-xs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Duration (Minutes)
            </Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Optional: Leave blank for untimed" />
            <p className="text-[10px] text-muted-foreground">If set, the exam will auto-submit after this time. Times are saved in a timezone-safe format.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule Exam'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
