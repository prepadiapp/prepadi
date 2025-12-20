'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import { SyncManager } from "./SyncManager";
import { OfflineDetector } from "./OfflineDetector";

interface ProvidersProps {
  children: React.ReactNode;
}


export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <SyncManager />
      <OfflineDetector />
      {children}
    </SessionProvider>
  );
}