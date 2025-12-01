'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const loadingMessages = [
  "Loading questions...",
  "Preparing your simulation...",
  "Getting ready...",
  "Almost there...",
  "Get set...",
  "Calibrating exam engine...",
  "Fetching latest syllabus...",
];

export function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle messages every 2 seconds
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    // Fake progress bar for visual feedback
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Stall at 90% until real load finishes
        return prev + 5; // Increment by 5%
      });
    }, 300);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center animate-in fade-in duration-500">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative bg-white p-4 rounded-full shadow-lg border border-slate-100">
           <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </div>
      
      <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 min-h-[2rem] transition-all duration-300">
        {loadingMessages[messageIndex]}
      </h2>
      
      <p className="text-slate-500 text-sm mb-8 max-w-xs">
        Please wait while we set up your secure exam environment.
      </p>

      <div className="w-full max-w-md space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Initializing...</span>
            <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}