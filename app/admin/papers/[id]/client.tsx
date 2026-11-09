'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaperEditor } from '@/components/admin/PaperEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Calendar, Plus, Trash2, FolderKanban, Globe, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EditPaperDialog } from '@/components/admin/EditPaperDialog';
import { Toaster, toast } from 'sonner';

export function AdminPaperManagerClient({ paper }: { paper: any }) {
  const editorRef = useRef<any>(null);
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/admin/papers/${paper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED', isPublic: true }),
      });

      if (!res.ok) throw new Error('Failed to publish paper');

      toast.success('Paper published and available for practice');
      router.refresh();
    } catch {
      toast.error('Could not publish paper. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

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
    <div className="min-h-screen bg-slate-50/50 pb-28 font-sans md:pb-20">
      <Toaster richColors position="top-center" />

      <div className="relative z-20 border-b bg-white/90 shadow-sm backdrop-blur-md transition-all md:sticky md:top-0 md:bg-white/80">
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

          <div className="mt-1 flex w-full items-center justify-end border-t border-slate-100 pt-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
              onClick={handleDeletePaper}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete Paper
            </Button>
          </div>

          <div className="hidden items-center justify-end gap-2 md:flex">
            {paper.status !== 'PUBLISHED' && (
              <Button
                size="sm"
                className="h-9 bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                {isPublishing ? 'Publishing…' : 'Publish Paper'}
              </Button>
            )}
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
              className="h-9 bg-primary px-4 text-sm font-semibold shadow-md hover:bg-primary/90"
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

      <div className={`fixed inset-x-0 bottom-0 z-40 grid ${paper.status === 'PUBLISHED' ? 'grid-cols-1' : 'grid-cols-2'} gap-3 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden`}>
        {paper.status !== 'PUBLISHED' && (
          <Button
            className="h-11 bg-emerald-600 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
            {isPublishing ? 'Publishing…' : 'Publish Paper'}
          </Button>
        )}
        <Button
          className="h-11 bg-primary text-sm font-semibold shadow-sm hover:bg-primary/90"
          onClick={() => editorRef.current?.addQuestion()}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Question
        </Button>
      </div>
    </div>
  );
}
