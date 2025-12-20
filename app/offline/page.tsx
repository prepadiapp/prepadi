'use client';

import { WifiOff, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-slate-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">You're Offline</h1>
      <p className="text-slate-500 max-w-sm mb-8">
        It looks like you're starting the app without an internet connection. 
        You can still access your downloaded exams.
      </p>
      
      <Button 
        size="lg" 
        onClick={() => window.location.href = '/dashboard/offline'}
        className="w-full max-w-xs"
      >
        Go to Offline Dashboard
      </Button>
      
      <button 
        onClick={() => window.location.reload()} 
        className="mt-6 text-sm text-primary font-medium hover:underline"
      >
        Try Reconnect
      </button>
    </div>
  );
}