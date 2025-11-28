'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@prisma/client'; // Make sure this import works, or use string 'ADMIN' etc.

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      // 1. Skip checks for specific pages to avoid infinite loops
      if (
        pathname.includes('/onboarding') || 
        pathname.includes('/dashboard/billing') ||
        pathname.includes('/organization/billing') // We'll build this later
      ) {
        setChecking(false);
        return;
      }

      try {
        const res = await fetch('/api/payment/status');
        const data = await res.json();

        console.log(data);
        if (!data.authenticated) {
          // Allow NextAuth middleware to handle this, or redirect manually
          // router.push('/login'); 
          setChecking(false);
          return;
        }

        // --- 2. ROLE REDIRECTION ---
        // If I am on /dashboard but I am an ADMIN -> Go to /admin
        if (pathname.startsWith('/dashboard') && data.role === 'ADMIN') {
          router.push('/admin');
          return;
        }
        
        // If I am on /dashboard but I am an ORGANIZATION -> Go to /organization
        if (pathname.startsWith('/dashboard') && data.role === 'ORGANIZATION') {
          router.push('/organization');
          return;
        }

        // If I am on /organization but I am a STUDENT -> Go to /dashboard
        if (pathname.startsWith('/organization') && data.role === 'STUDENT') {
          router.push('/dashboard');
          return;
        }

        // --- 3. ONBOARDING CHECK ---
        if (data.missingSubscription && data.role !== 'ADMIN') {
          router.push('/onboarding');
          return;
        }

        // --- 4. PAYMENT CHECK ---
        if (data.needsPayment) {
          // Initialize Payment
          const payRes = await fetch('/api/payment/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: data.planId }),
          });
          
          if (payRes.ok) {
            const payData = await payRes.json();
            window.location.href = payData.url; // Redirect to Paystack
            return;
          }
        }

        // If we passed all checks, show the page
        setChecking(false);

      } catch (error) {
        console.error("Guard check failed", error);
        setChecking(false); // Let them through on error to avoid locking them out completely? Or show error screen.
      }
    };

    checkUserStatus();
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying account status...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}