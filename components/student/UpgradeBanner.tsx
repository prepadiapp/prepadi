'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UpgradeBannerProps {
  isPro: boolean;
}

export function UpgradeBanner({ isPro }: UpgradeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isPro) return; // Don't show if already Pro

    const STORAGE_KEY = 'prepadi_upgrade_banner_dismissed';
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    // Show if never dismissed OR if 3 days have passed since last dismissal
    if (!dismissedAt || (now - parseInt(dismissedAt) > THREE_DAYS_MS)) {
      setIsVisible(true);
    }
  }, [isPro]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('prepadi_upgrade_banner_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="animate-in slide-in-from-top-4 duration-500 mb-6">
      <Card className="relative overflow-hidden border-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile Dismiss Button (Visible only on small screens, top right) */}
        <button 
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-2 bg-black/10 rounded-full text-white/80 hover:text-white hover:bg-black/20 md:hidden z-20"
            aria-label="Dismiss banner"
        >
            <X className="w-4 h-4" />
        </button>

        <div className="relative p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-10">
          <div className="flex items-start gap-4 pr-8 md:pr-0"> {/* pr-8 on mobile to avoid overlap with dismiss button */}
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0 hidden sm:flex">
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-yellow-300 sm:hidden" /> {/* Icon inline on mobile */}
                 Unlock Your Full Potential
              </h3>
              <p className="text-blue-100 text-sm max-w-md leading-relaxed">
                Get unlimited practice exams, detailed performance insights, and subject mastery tracking with Prepadi Pro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            <Button 
              variant="secondary" 
              className="w-full md:w-auto font-semibold text-blue-600 hover:bg-blue-50 whitespace-nowrap shadow-sm"
              asChild
            >
              <Link href="/dashboard/billing">
                Upgrade Now <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            
            {/* Desktop Dismiss Button (Visible only on medium screens and up) */}
            <button 
              onClick={handleDismiss}
              className="hidden md:flex p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white shrink-0"
              aria-label="Dismiss banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}