'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfflineDashboardView } from './OfflineDashboardView';

export function OfflineDetector() {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [showOfflineDashboard, setShowOfflineDashboard] = useState(false);

  useEffect(() => {
    // Initial check
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
        setIsOffline(false);
        setShowOfflineDashboard(false); // Auto-hide dashboard when back online
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // If already taking an exam or on the offline route, don't interfere
  if (pathname.includes('/offline')) {
      return null;
  }

  // Only show the "Blocked" UI if we are offline AND not already showing the dashboard
  if (isOffline && !showOfflineDashboard) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">You are Offline</h1>
        <p className="text-slate-500 max-w-sm mb-8">
            It looks like you lost your internet connection. You can still access your downloaded exams right now.
        </p>
        <Button 
            size="lg" 
            onClick={() => setShowOfflineDashboard(true)} // Instant UI swap, no network fetch
            className="w-full max-w-xs"
        >
            Access Downloaded Exams
        </Button>
        <p className="mt-8 text-xs text-slate-400 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Waiting for connection...
        </p>
      </div>
    );
  }

  // If user clicked the button while offline, show the dashboard component as a fullscreen overlay
  if (isOffline && showOfflineDashboard) {
      return (
          <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-y-auto">
              <OfflineDashboardView onBack={() => setShowOfflineDashboard(false)} />
          </div>
      );
  }

  return null;
}