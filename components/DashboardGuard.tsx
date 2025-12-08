'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, Lock, RefreshCw, LogOut, CreditCard, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession, signOut } from 'next-auth/react';

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const [checking, setChecking] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  
  // State to determine UI text
  const [isNewUser, setIsNewUser] = useState(false);
  const [isOrgMember, setIsOrgMember] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Helper to load Paystack script
  const loadPaystack = async () => {
    const PaystackPop = (await import('@paystack/inline-js')).default;
    return new PaystackPop();
  };

  const checkUserStatus = async () => {
    // Skip checks for public/special pages
    if (pathname.includes('/onboarding')) {
      setChecking(false);
      return;
    }

    try {
      const res = await fetch('/api/payment/status');
      const data = await res.json();

      if (!data.authenticated) {
        setChecking(false); // Let middleware handle auth redirect
        return;
      }

      // 1. ROLE REDIRECTION
      if (pathname.startsWith('/dashboard') && data.role === 'ADMIN') {
        router.push('/admin');
        return;
      }
      if (pathname.startsWith('/dashboard') && data.role === 'ORGANIZATION') {
        router.push('/organization');
        return;
      }
      if (pathname.startsWith('/organization') && data.role === 'STUDENT') {
        router.push('/dashboard');
        return;
      }

      // 2. ONBOARDING CHECK
      if (data.missingSubscription && data.role !== 'ADMIN') {
        router.push('/onboarding');
        return;
      }

      // 3. PAYMENT CHECK
      if (data.needsPayment) {
        setIsLocked(true);
        setPendingPlanId(data.planId);
        setIsNewUser(data.isNewUser); 
        setIsOrgMember(data.isOrgMember);
        setStatusMessage(data.statusMessage);
      } else {
        setIsLocked(false);
      }

      setChecking(false);

    } catch (error) {
      console.error("Guard check failed", error);
      setChecking(false); 
    }
  };

  useEffect(() => {
    checkUserStatus();
  }, [pathname, router]);

  // Handle the Payment Flow
  const handlePayment = async () => {
    if (!pendingPlanId || !session?.user?.email) return;
    
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    
    if (!publicKey) {
      alert("Configuration Error: Missing Paystack Public Key");
      console.error("Missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in environment variables.");
      return;
    }

    setPaymentLoading(true);

    try {
      // 1. Initialize Order
      const initRes = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: pendingPlanId }),
      });

      if (!initRes.ok) throw new Error('Initialization failed');
      
      // Get reference AND amount (in Kobo) from API
      const { reference, amount } = await initRes.json();

      // 2. Open Paystack
      const paystack = await loadPaystack();
      
      paystack.newTransaction({
        key: publicKey, // Use the variable we checked above
        email: session.user.email,
        amount: amount, 
        ref: reference,
        onSuccess: async (transaction: any) => {
          // 3. Verify on Success
          try {
            await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: transaction.reference }),
            });
            // Unlock and Reload
            setIsLocked(false);
            window.location.reload(); 
          } catch (e) {
            alert("Payment successful but verification failed. Please contact support.");
          }
        },
        onCancel: () => {
          setPaymentLoading(false);
        }
      });

    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to start payment.");
      setPaymentLoading(false);
    }
  };

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

  if (isLocked) {
    // Dynamic UI Text based on state
    let title = "Subscription Expired";
    let description = "Your plan requires payment to continue accessing the platform.";
    let buttonText = "Renew Subscription";
    let Icon = Lock;

    if (isOrgMember) {
        title = "Organization Access Paused";
        description = statusMessage || "Your organization's subscription is currently inactive. Please contact your administrator.";
        buttonText = ""; // No button for org members
        Icon = Building;
    } else if (isNewUser) {
        title = "Complete Your Registration";
        description = "You need to complete your plan payment to activate your account.";
        buttonText = "Pay to Activate";
        Icon = CreditCard;
    }

    return (
      <div className="h-screen w-full flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
          <CardHeader className="text-center">
            <div className={`mx-auto p-3 rounded-full w-fit mb-4 ${isNewUser ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <Icon className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isOrgMember && (
                <Button 
                className="w-full text-lg py-6 shadow-md transition-all hover:scale-[1.02]" 
                onClick={handlePayment}
                disabled={paymentLoading}
                >
                {paymentLoading ? (
                    <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                    </>
                ) : (
                    buttonText
                )}
                </Button>
            )}
            
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => window.location.reload()} className="hover:text-primary flex items-center transition-colors">
                <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh Status
              </button>
              <div className="w-px h-4 bg-border"></div>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="hover:text-red-500 flex items-center transition-colors">
                <LogOut className="w-3 h-3 mr-1.5" /> Sign Out
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}