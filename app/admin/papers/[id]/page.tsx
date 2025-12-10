import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PaperEditor } from '@/components/admin/PaperEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Calendar, Eye } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EditPaperDialog } from '@/components/admin/EditPaperDialog';
import { Toaster } from 'sonner';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaperManagePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const paper = await prisma.examPaper.findUnique({
    where: { id },
    include: {
      exam: true,
      subject: true,
      questions: {
        include: { options: true },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!paper) notFound();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      <Toaster richColors position="top-center" />
      
      {/* --- Sticky Header --- */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-20 shadow-sm transition-all">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
           
           {/* Left: Back + Title + Meta */}
           <div className="flex items-start gap-2 md:gap-3 w-full md:w-auto">
              <Link href="/admin/papers" className="mt-0.5 md:mt-1 shrink-0">
                 <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                 </Button>
              </Link>
              
              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <h1 className="font-bold text-base md:text-lg lg:text-xl text-slate-900 tracking-tight truncate leading-tight max-w-[200px] sm:max-w-none">
                       {paper.title}
                    </h1>
                    <EditPaperDialog paper={paper} />
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] md:text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        <BookOpen className="w-3 h-3 text-slate-400"/> 
                        <span className="truncate max-w-[100px]">{paper.subject?.name}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        <Calendar className="w-3 h-3 text-slate-400"/> 
                        <span>{paper.year}</span>
                    </div>
                    <Badge variant={paper.isPublic ? "default" : "secondary"} className="h-4 px-1.5 text-[9px] md:text-[10px] font-bold tracking-wide uppercase">
                       {paper.isPublic ? "Published" : "Draft"}
                    </Badge>
                 </div>
              </div>
           </div>
           
           {/* Right: Actions */}
           <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t border-slate-100 md:border-0 pt-2 md:pt-0 mt-1 md:mt-0">
              <Button size="sm" variant="outline" className="text-[10px] md:text-xs h-8 md:h-9 hidden sm:flex items-center gap-1.5 bg-white">
                 <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" /> Preview
              </Button>
              <Button size="sm" className="text-[10px] md:text-xs h-8 md:h-9 font-semibold shadow-md bg-primary hover:bg-primary/90 w-full sm:w-auto">
                 Add Question
              </Button>
           </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-8">
         <PaperEditor 
            paperId={paper.id} 
            initialQuestions={paper.questions as any} 
         />
      </main>
    </div>
  );
}