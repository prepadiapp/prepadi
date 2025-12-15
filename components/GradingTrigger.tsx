'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface GradingTriggerProps {
  attemptId: string;
}

export default function GradingTrigger({ attemptId }: GradingTriggerProps) {
  const router = useRouter();
  const [isGrading, setIsGrading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const gradeAttempt = async () => {
      try {
        const res = await fetch('/api/quiz/grade-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId }),
        });

        if (res.ok) {
           const data = await res.json();
           if (isMounted) {
               setIsGrading(false);
               if (data.success) {
                  toast.success("Grading Complete", { description: "Your theory answers have been graded by AI." });
                  router.refresh();
               }
           }
        } else {
            if (isMounted) setIsGrading(false);
        }
      } catch (error) {
        console.error("Auto-grading failed", error);
        if (isMounted) setIsGrading(false);
      }
    };

    gradeAttempt();

    return () => { isMounted = false; };
  }, [attemptId, router]);

  if (!isGrading) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="p-2 bg-blue-100 rounded-full shrink-0">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
            AI Grading in Progress <Sparkles className="w-4 h-4 text-amber-500" />
        </h4>
        <p className="text-sm text-blue-700 mt-1">
            We are analyzing your theory answers. The results will update automatically in a few moments.
        </p>
      </div>
    </div>
  );
}