'use client';

import { useEffect, useState, use } from 'react';
import { getOfflineExam } from '@/lib/offline-storage';
import { QuizClient } from '@/components/QuizClient';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function OfflinePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using `use` hook (Next.js 13+ pattern for async params in client components)
  const resolvedParams = use(params);
  const id = resolvedParams.id; // Extract ID safely

  const router = useRouter();
  const [examData, setExamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
        if (!id) return;
        
        console.log("Loading offline exam:", id);
        try {
            // Decode ID if it was URL encoded (though usually not needed for simple IDs)
            const decodedId = decodeURIComponent(id);
            const data = await getOfflineExam(decodedId);
            
            if (!mounted) return;

            if (!data) {
                console.error("Exam not found in IndexedDB:", decodedId);
                throw new Error("Exam not found in local storage.");
            }
            
            console.log("Exam loaded:", data.title);
            setExamData(data);
        } catch (e: any) {
            if (mounted) setError(e.message || "Failed to load exam");
        } finally {
            if (mounted) setLoading(false);
        }
    };

    load();

    return () => { mounted = false; };
  }, [id]);

  if (loading) {
      return (
          <div className="h-screen flex items-center justify-center flex-col gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-slate-500">Loading offline exam...</p>
              <Button variant="ghost" size="sm" onClick={() => router.back()}>Cancel</Button>
          </div>
      );
  }

  if (error || !examData) {
      return (
          <div className="h-screen flex items-center justify-center flex-col gap-4 p-4 text-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <h1 className="text-xl font-bold">Failed to Load</h1>
              <p className="text-slate-500">{error}</p>
              <p className="text-xs text-muted-foreground font-mono bg-slate-100 p-2 rounded">{id}</p>
              <Button onClick={() => router.back()}>Go Back</Button>
          </div>
      );
  }

  return (
    <QuizClient
        initialQuestions={examData.questions}
        quizDetails={{
            examName: examData.examName,
            subjectName: examData.subjectName,
            year: examData.year
        }}
        mode="PRACTICE" 
        initialDuration={examData.duration}
        userId="offline-user" 
        assignmentId={undefined} 
        isOffline={true} 
    />
  );
}