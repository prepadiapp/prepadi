'use client';

import { useEffect, useState } from 'react';
import { Subject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { KeyValueInput } from './KeyValueInput';

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onSave: () => void;
}

export function SubjectFormDialog({
  open, onOpenChange, subject, onSave,
}: SubjectFormDialogProps) {
  const [name, setName] = useState('');
  const [apiSlugs, setApiSlugs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && subject) {
      setName(subject.name);
      // Handle JSON type casting safely
      const slugs = (subject.apiSlugs as Record<string, string>) || {};
      setApiSlugs(slugs);
    } else if (open && !subject) {
      setName('');
      setApiSlugs({});
    }
  }, [open, subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const apiPath = subject ? `/api/admin/subjects/${subject.id}` : '/api/admin/subjects';
    const method = subject ? 'PATCH' : 'POST';

    try {
      const response = await fetch(apiPath, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, apiSlugs }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save subject');
      }

      toast.success(`Subject ${subject ? 'updated' : 'created'} successfully!`);
      onSave();
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
            <DialogDescription>Configure subject details and API mappings.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Mathematics"
                required
              />
            </div>

            <div className="space-y-2">
               <Label>API Mappings</Label>
               <p className="text-xs text-muted-foreground mb-2">Map this subject to external API slugs (e.g., qboard: mathematics).</p>
               <KeyValueInput 
                 value={apiSlugs} 
                 onChange={setApiSlugs} 
                 keyPlaceholder="API Name (e.g. qboard)"
                 valuePlaceholder="Slug (e.g. mathematics)"
               />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}