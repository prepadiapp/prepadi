'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaperEditor } from '@/components/admin/PaperEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Calendar, Plus, Trash2, FolderKanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EditPaperDialog } from '@/components/admin/EditPaperDialog';
import { Toaster, toast } from 'sonner';

export function AdminPaperManagerClient({ paper }: { paper: any }) {
  const editorRef = useRef<any>(null);
  const router = useRouter();

  const handleDeletePaper = async () => {
    if (!confirm('Are you sure? This will delete the entire paper and all its questions.')) return;
    try {
      const res = await fetch(`/api/admin/papers/${paper.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Paper deleted');
        router.push('/admin/papers');
      } else {
        const data = await res.json().catch(() => ({ error: 'Failed to delete' }));
        toast.error(data.error || 'Failed to delete');
      }
    } catch (e) {
      toast.error('Error deleting paper');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      <Toaster richColors position="top-center" />

      <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur-md shadow-sm transition-all">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full items-start gap-2 md:w-auto md:gap-3">
            <Link href="/admin/papers" className="mt-0.5 shrink-0 md:mt-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:h-8 md:w-8">
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="max-w-[220px] truncate text-base font-bold leading-tight tracking-tight text-slate-900 md:max-w-none md:text-xl">
                  {paper.paperLabel || paper.title}
                </h1>
                <EditPaperDialog paper={paper} onSuccess={() => router.refresh()} />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-500 md:text-xs">
                <div className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5">
                  <BookOpen className="h-3 w-3 text-slate-400" />
                  <span className="truncate max-w-[100px]">{paper.subject?.name || 'No subject'}</span>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span>{paper.year ?? 'Flexible'}</span>
                </div>
                {paper.examination && (
                  <div className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5">
                    <FolderKanban className="h-3 w-3 text-slate-400" />
                    <span className="truncate max-w-[140px]">{paper.examination.title}</span>
                  </div>
                )}
                <Badge variant={paper.status === 'PUBLISHED' ? 'default' : 'secondary'} className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wide md:text-[10px]">
                  {paper.status}
                </Badge>
                {paper.isVerified && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wide md:text-[10px]">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-1 flex w-full items-center justify-end gap-2 border-t border-slate-100 pt-2 md:mt-0 md:w-auto md:border-0 md:pt-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
              onClick={handleDeletePaper}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
            <Button
              size="sm"
              className="h-8 w-full bg-primary text-[10px] font-semibold shadow-md hover:bg-primary/90 sm:w-auto md:h-9 md:text-xs"
              onClick={() => editorRef.current?.addQuestion()}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Question
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-8">
        <PaperEditor ref={editorRef} paperId={paper.id} initialQuestions={paper.questions} apiPrefix="/api/admin" />
      </main>
    </div>
  );
}
