'use client';

import { useEffect, useState } from 'react';
import { Exam } from '@prisma/client'; 
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

interface ExamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: Exam | null; // null for "Add New", Exam object for "Edit"
  onSave: () => void; // Function to refresh the table
}

export function ExamFormDialog({ open, onOpenChange, exam, onSave }: ExamFormDialogProps) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // When the dialog opens, populate the form if we are editing
  useEffect(() => {
    if (open && exam) {
      setName(exam.name);
      setShortName(exam.shortName);
      setDescription(exam.description || '');
    } else if (open && !exam) {
      // Reset form for "Add New"
      setName('');
      setShortName('');
      setDescription('');
    }
  }, [open, exam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const apiPath = exam
      ? `/api/admin/exams/${exam.id}` // Update
      : '/api/admin/exams'; // Create
      
    const method = exam ? 'PATCH' : 'POST';

    try {
      const response = await fetch(apiPath, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          shortName: shortName.toUpperCase(),
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save exam');
      }

      toast.success(`Exam ${exam ? 'updated' : 'created'} successfully!`);
      onSave(); // Trigger the refresh
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{exam ? 'Edit Exam' : 'Add New Exam'}</DialogTitle>
            <DialogDescription>
              {exam ? 'Update the exam details.' : 'Create a new exam for users to select.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Exam Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., WASSCE (WAEC)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name (Slug)</Label>
              <Input
                id="shortName"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g., WAEC (no spaces)"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short description of the exam."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {exam ? 'Save Changes' : 'Create Exam'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}