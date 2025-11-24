'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export function UserActivityTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    // Only run if user is logged in
    if (session?.user) {
      const checkAndTriggerHeartbeat = async () => {
        const now = Date.now();
        const lastHeartbeat = localStorage.getItem('prepadi_last_heartbeat');
        
        // Logic: Only update DB if it's been more than 1 hour (3600000 ms) since last update
        // This drastically reduces DB load while keeping "24h active" stats accurate.
        const ONE_HOUR = 60 * 60 * 1000;

        if (!lastHeartbeat || (now - parseInt(lastHeartbeat) > ONE_HOUR)) {
          try {
            await fetch('/api/user/heartbeat', { method: 'PATCH' });
            // Update local storage timestamp
            localStorage.setItem('prepadi_last_heartbeat', now.toString());
          } catch (e) {
            // Ignore errors, don't annoy the user
          }
        }
      };

      checkAndTriggerHeartbeat();
    }
  }, [session]);

  // This component renders nothing
  return null;
}