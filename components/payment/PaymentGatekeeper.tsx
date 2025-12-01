'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function PaymentGatekeeper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      // Don't check on the billing page itself (to prevent infinite loops)
      if (pathname.includes('/dashboard/billing')) {
        setChecking(false);
        return;
      }

      try {
        const res = await fetch('/api/payment/status'); // We'll create this API next
        const data = await res.json();

        if (data.missingSubscription) {
          router.push('/onboarding');
          return;
        }

        if (data.needsPayment) {
          // Trigger payment flow
          const payRes = await fetch('/api/payment/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: data.planId }),
          });
          
          if (payRes.ok) {
            const payData = await payRes.json();
            window.location.href = payData.url; // Redirect to Paystack
            return; // Stop execution
          }
        }
      } catch (error) {
        console.error("Payment check failed", error);
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [pathname]);

  if (checking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}