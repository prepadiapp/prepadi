import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AuthPageShell({
  children,
  contentClassName,
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#F8FAFC] px-4 py-5 sm:px-6 sm:py-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 h-[26rem] w-[52rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#0000FE]/10 via-[#FF6600]/10 to-[#0000FE]/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-32 h-96 w-96 rounded-full bg-[#0000FE]/5 blur-3xl"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FE] focus-visible:ring-offset-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prepadi_logo.png" alt="Prepadi" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
          <span className="min-w-0">
            <span className="block text-base font-extrabold leading-none tracking-tight text-slate-950 sm:text-lg">Prepadi</span>
            <span className="mt-1 hidden text-[11px] font-medium text-slate-500 sm:block">Calmer exam preparation</span>
          </span>
        </Link>
        <span className="shrink-0 rounded-full border border-[#DCE4FF] bg-white/80 px-3 py-1.5 text-[9px] font-bold tracking-[0.12em] text-[#0000CC] shadow-sm sm:text-[10px]">
          WAEC <span className="text-[#FF6600]">•</span> JAMB <span className="text-[#FF6600]">•</span> NECO
        </span>
      </header>

      <main className={cn('relative z-10 mx-auto flex w-full flex-1 flex-col', contentClassName)}>
        {children}
      </main>
    </div>
  );
}
