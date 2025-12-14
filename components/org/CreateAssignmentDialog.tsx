'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function CreateAssignmentDialog({ onSuccess, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  
  // Form
  const [title, setTitle] = useState('');
  const [paperId, setPaperId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('');

  // Fetch Papers on Open
  useEffect(() => {
    if (open && papers.length === 0) {
        fetch('/api/organization/papers')
            .then(res => res.json())
            .then(setPapers)
            .catch(() => toast.error("Failed to load papers"));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title || !paperId || !startTime || !endTime) {
        toast.error("Please fill all required fields");
        return;
    }

    setLoading(true);
    try {
        const res = await fetch('/api/organization/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                paperId,
                startTime,
                endTime,
                duration: duration || null
            })
        });

        if (!res.ok) throw new Error("Failed to create");
        
        toast.success("Assignment created!");
        setOpen(false);
        // Reset form
        setTitle(''); setPaperId(''); setStartTime(''); setEndTime(''); setDuration('');
        onSuccess();
    } catch (e) {
        toast.error("Error creating assignment");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
            <Button className="shadow-md font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2"/> Create Assignment
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule New Assessment</DialogTitle>
          <DialogDescription>
            Create a time-bound exam for your students using one of your papers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
                <Label>Assignment Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mock Exam 2025" />
            </div>

            <div className="space-y-1.5">
                <Label>Select Paper</Label>
                <Select value={paperId} onValueChange={setPaperId}>
                    <SelectTrigger><SelectValue placeholder="Choose a paper from library" /></SelectTrigger>
                    <SelectContent>
                        {papers.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground text-center">No papers found. Create one first.</div>
                        ) : (
                            papers.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.title} ({p._count.questions} Qs)
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5"/> Start Time</Label>
                    <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5"/> End Time</Label>
                    <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-xs" />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> Duration (Minutes)</Label>
                <Input 
                    type="number" 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    placeholder="Optional: Leave blank for untimed" 
                />
                <p className="text-[10px] text-muted-foreground">If set, exam will auto-submit after this time.</p>
            </div>
        </div>

        <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Schedule Exam"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}