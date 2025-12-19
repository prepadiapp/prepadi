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
          const res = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: attempt.answers,
              questionIds: attempt.answers.map((a: any) => a[0]), // Simplified, might need full Q IDs
              timeTaken: attempt.timeTaken,
              // We need to pass context if it was an assignment or practice
              // Ideally store this in attempt object
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