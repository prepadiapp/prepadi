'use client';

import { useState, useEffect } from 'react';
import { X, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface UpgradeBannerProps {
  isPro: boolean;
  isOrgMember?: boolean; // New prop
}

export function UpgradeBanner({ isPro, isOrgMember }: UpgradeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Hide if already Pro OR if user belongs to an organization
    if (isPro || isOrgMember) return;

    const STORAGE_KEY = 'prepadi_upgrade_banner_dismissed';
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    if (!dismissedAt || (now - parseInt(dismissedAt) > THREE_DAYS_MS)) {
      setIsVisible(true);
    }
  }, [isPro, isOrgMember]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('prepadi_upgrade_banner_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="animate-in slide-in-from-top-4 duration-500 mb-6">
      <Card className="relative overflow-hidden rounded-3xl border border-[#E5E9F7] bg-gradient-to-br from-white via-white to-[#F7F8FF] text-slate-950 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        {/* Decorative Background Elements */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#FF6600]/[0.07] blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-[#0000FE]/[0.04] blur-3xl" />

        {/* Mobile Dismiss Button */}
        <button 
            onClick={handleDismiss}
            className="absolute right-3 top-3 z-20 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 md:hidden"
            aria-label="Dismiss banner"
        >
            <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 flex flex-col items-start justify-between gap-5 p-5 sm:p-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4 pr-8 md:pr-0">
            <div className="hidden shrink-0 rounded-2xl border border-orange-100 bg-orange-50 p-3 sm:flex">
              <Crown className="h-6 w-6 text-[#E05224]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                 <Crown className="h-5 w-5 text-[#E05224] sm:hidden" />
                 Unlock Your Full Potential
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-slate-600">
                Get unlimited practice exams, detailed performance insights, and subject mastery tracking with Prepadi Pro.
              </p>
            </div>
          </div>

          <div className="mt-1 flex w-full items-center gap-3 md:mt-0 md:w-auto">
            <Button 
              variant="secondary" 
              className="h-11 w-full whitespace-nowrap rounded-xl bg-[#0000FE] font-bold text-white shadow-sm hover:bg-[#0000CC] md:w-auto"
              asChild
            >
              <Link href="/dashboard/billing">
                Upgrade Now <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            
            {/* Desktop Dismiss Button */}
            <button 
              onClick={handleDismiss}
              className="hidden shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 md:flex"
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
