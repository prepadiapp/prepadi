'use client';

import { useEffect } from 'react';
import { getPendingAttempts, removePendingAttempt } from '@/lib/offline-storage';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function SyncManager() {
  const router = useRouter();

  useEffect(() => {
    const syncData = async () => {
      if (!navigator.onLine) return;

      const pending = await getPendingAttempts();
      if (pending.length === 0) return;

      toast.info(`Syncing ${pending.length} offline result(s)...`);

      for (const attempt of pending) {
        try {
          // Use questionIds from the attempt if available (new logic), 
          // otherwise fallback to answers mapping (old/legacy data support)
          const questionIds = (attempt as any).questionIds || attempt.answers.map((a: any) => a[0]);

          const res = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: attempt.answers,
              questionIds: questionIds, 
              timeTaken: attempt.timeTaken,
              assignmentId: (attempt as any).assignmentId, // Also include assignmentId if present
            }),
          });

          if (res.ok) {
            await removePendingAttempt(attempt.id);
            toast.success("Result synced successfully");
          }
        } catch (error) {
          console.error("Sync failed for attempt", attempt.id, error);
        }
      }
      
      router.refresh();
    };

    window.addEventListener('online', syncData);
    
    // Initial check on mount
    syncData();

    return () => window.removeEventListener('online', syncData);
  }, [router]);

  return null; // Renderless component
}