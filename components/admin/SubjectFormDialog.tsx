'use client';

import { useEffect, useState } from 'react';
import { Subject } from '@prisma/client';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null; // null for "Add", Subject for "Edit"
  onSave: () => void;
}

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
  onSave,
}: SubjectFormDialogProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Populate form when dialog opens for editing
  useEffect(() => {
    if (open && subject) {
      setName(subject.name);
    } else if (open && !subject) {
      setName('');
    }
  }, [open, subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const apiPath = subject
      ? `/api/admin/subjects/${subject.id}` // Update
      : '/api/admin/subjects'; // Create
      
    const method = subject ? 'PATCH' : 'POST';

    try {
      const response = await fetch(apiPath, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save subject');
      }

      toast.success(`Subject ${subject ? 'updated' : 'created'} successfully!`);
      onSave(); // Refresh the table
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
            <DialogTitle>{subject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              {subject ? 'Update the subject details.' : 'Create a new subject.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mathematics"
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {subject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}