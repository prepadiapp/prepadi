'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WifiOff, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfflineDashboardView } from './OfflineDashboardView';
import { QuizClient } from './QuizClient';

export function OfflineDetector() {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeExamData, setActiveExamData] = useState<any>(null);

  useEffect(() => {
    // Initial check
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
        setIsOffline(false);
        // We don't force hide if they are in the middle of an offline exam
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // If already on the specific offline URL (for when they are online), let that page handle it.
  if (pathname.includes('/offline/play')) {
      return null;
  }

  // --- RENDERING LOGIC ---

  // 1. If an exam is active, show the Quiz Player directly in the overlay
  // Reduced z-index to z-40 so shadcn Dialogs (z-50) can appear on top
  if (isOffline && activeExamData) {
      return (
          <div className="fixed inset-0 z-40 bg-white">
              <div className="absolute top-4 left-4 z-50 md:hidden">
                 <Button variant="ghost" size="icon" onClick={() => setActiveExamData(null)}>
                    <X className="w-5 h-5" />
                 </Button>
              </div>
              <QuizClient 
                  initialQuestions={activeExamData.questions}
                  quizDetails={{
                      examName: activeExamData.examName,
                      subjectName: activeExamData.subjectName,
                      year: activeExamData.year
                  }}
                  mode="PRACTICE"
                  initialDuration={activeExamData.duration}
                  userId="offline-user"
                  assignmentId={undefined}
                  isOffline={true}
              />
          </div>
      );
  }

  // 2. If dashboard is requested, show the list
  if (isOffline && showDashboard) {
      return (
        <div className="fixed inset-0 z-40 bg-slate-50 overflow-y-auto">
            <OfflineDashboardView 
                onBack={() => setShowDashboard(false)} 
                onStartExam={(data) => setActiveExamData(data)}
            />
        </div>
      );
  }

  // 3. Default "You are Offline" blocker
  if (isOffline) {
    return (
      <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Connection Lost</h1>
        <p className="text-slate-500 max-w-sm mb-8">
            You are currently offline. You can still access and take exams you have previously downloaded.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button 
                size="lg" 
                onClick={() => setShowDashboard(true)} 
                className="w-full shadow-md"
            >
                Access Downloaded Exams
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
                Try Reconnect
            </Button>
        </div>
        <p className="mt-12 text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Monitoring Network Status
        </p>
      </div>
    );
  }

  return null;
}