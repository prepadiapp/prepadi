'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Pencil, Save, BookOpen, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface EditPaperDialogProps {
  paper: {
    id: string;
    title: string;
    year?: number | null; // Allow null here
    isPublic?: boolean;
    exam?: { shortName: string } | null; // Allow null for safety
    subject?: { name: string } | null; // Allow null for safety
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditPaperDialog({ paper, trigger, onSuccess }: EditPaperDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [title, setTitle] = useState(paper.title);
  const [isPublic, setIsPublic] = useState(paper.isPublic || false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Paper title cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/papers/${paper.id}`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, isPublic })
      });

      if (!res.ok) throw new Error("Failed to update paper");
      
      toast.success("Paper updated successfully");
      setOpen(false);
      router.refresh(); 
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Could not save changes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 hover:bg-slate-100 rounded-full transition-colors">
            <Pencil className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400 hover:text-primary" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-6 gap-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Edit Paper Details</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update the title or visibility of this paper.
          </DialogDescription>
        </DialogHeader>

        {/* --- Context Badges (Read Only) --- */}
        <div className="flex flex-wrap gap-2">
          {paper.exam?.shortName && (
            <Badge variant="secondary" className="bg-slate-100 hover:bg-slate-100 text-slate-600 font-medium border-0">
              {paper.exam.shortName}
            </Badge>
          )}
          {paper.subject?.name && (
            <Badge variant="outline" className="text-slate-500 font-normal">
              <BookOpen className="w-3 h-3 mr-1.5 opacity-70"/>
              {paper.subject.name}
            </Badge>
          )}
          {paper.year && (
             <Badge variant="outline" className="text-slate-500 font-normal">
               <Calendar className="w-3 h-3 mr-1.5 opacity-70"/>
               {paper.year}
             </Badge>
          )}
        </div>

        <div className="grid gap-5">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Paper Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium text-slate-900 focus-visible:ring-primary/20"
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between space-x-2 border border-slate-200 p-3 rounded-lg bg-slate-50/30">
            <div className="space-y-0.5">
              <Label htmlFor="public-mode" className="text-sm font-medium text-slate-900">Public Access</Label>
              <p className="text-xs text-muted-foreground">
                Make this paper visible to all students.
              </p>
            </div>
            <Switch
              id="public-mode"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="text-slate-500 hover:text-slate-900">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !title.trim()} className="font-semibold shadow-sm">
            {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}