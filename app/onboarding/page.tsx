'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plan, UserRole } from '@prisma/client'; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building, GraduationCap, ArrowLeft } from "lucide-react";
import { useSession } from 'next-auth/react';
import { usePaystackPayment } from 'react-paystack';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Protect Route
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch Plans
  useEffect(() => {
    if (step === 2) {
      const type = selectedRole === 'STUDENT' ? 'STUDENT' : 'ORGANIZATION';
      setLoading(true);
      fetch(`/api/public/plans?type=${type}`)
        .then(res => res.json())
        .then(data => setPlans(data))
        .catch(err => setError("Failed to load plans"))
        .finally(() => setLoading(false));
    }
  }, [step, selectedRole]);

  // --- 2. PREPARE PAYSTACK CONFIG ---
  // We need to initialize the config, but we can't fully set the 'reference' 
  // until the user clicks "Submit" because we need to create the Order first.
  // So we will trigger this manually.

  const triggerPayment = (config: any) => {
    // We use the library directly or via a dynamic hook instance
    // But react-paystack is hook-based. We'll use a dynamic component approach or
    // simply call the initialize function if we construct it manually.
    
    // Actually, the cleanest way in a function:
    const handler = (window as any).PaystackPop && (window as any).PaystackPop.setup(config);
    handler && handler.openIframe();
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // A. Create User/Org/Subscription
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          planId: selectedPlan?.id,
          orgName: selectedRole === 'ORGANIZATION' ? orgName : undefined,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // B. Check Payment
      if (data.requiresPayment) {
        
        // 1. Initialize Order in DB to get a Reference
        // We use the same initialize API, but we WON'T use the URL it returns.
        // We just want the reference it creates internally.
        // Actually, our API returns { url, reference, access_code }. Let's update it.
        // Or we can just let the API create the order and we grab the reference from the URL response?
        // No, let's update /api/payment/initialize to return the reference too.
        
        const initRes = await fetch('/api/payment/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan?.id }),
        });

        if (!initRes.ok) throw new Error("Payment init failed");
        
        const initData = await initRes.json();
        const { reference, access_code } = initData; // We need to update the API to return these

        // 2. Open Paystack Popup
        // We use the Paystack object directly for imperatively opening
        const paystackConfig = {
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!, // Need public key
          email: session?.user?.email!,
          amount: (selectedPlan?.price || 0) * 100, // Kobo
          currency: 'NGN',
          ref: reference, // Use the reference from our DB order
          onSuccess: (response: any) => {
            handleVerifyPayment(response.reference);
          },
          onClose: () => {
            setLoading(false);
            alert("Payment cancelled.");
          },
        };

        // We use the library's initialize method
        // Note: You need to add the Paystack Script or use the hook properly.
        // The easiest way with `react-paystack`:
        const PaystackPop = await import('@paystack/inline-js');
        const popup = new PaystackPop.default();
        popup.newTransaction(paystackConfig);

      } else {
        // Free plan
        router.push('/dashboard');
      }

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // --- 3. VERIFY PAYMENT ---
  const handleVerifyPayment = async (reference: string) => {
    setVerifying(true);
    try {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });

      if (res.ok) {
        // Success!
        router.push('/dashboard');
      } else {
        setError("Payment was successful but verification failed. Please contact support.");
      }
    } catch (e) {
      setError("Verification error.");
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  // ... (Step 1 & Step 2 renders are identical to previous version) ...
  // Step 1: Role Selection
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <h1 className="text-3xl font-bold">Finish Setting Up Your Account</h1>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:border-primary" onClick={() => { setSelectedRole(UserRole.STUDENT); setStep(2); }}>
              <CardContent className="pt-6 flex flex-col items-center">
                <GraduationCap className="w-10 h-10 mb-2 text-blue-600" />
                <h3 className="text-xl font-bold">Student</h3>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary" onClick={() => { setSelectedRole(UserRole.ORGANIZATION); setStep(2); }}>
              <CardContent className="pt-6 flex flex-col items-center">
                <Building className="w-10 h-10 mb-2 text-purple-600" />
                <h3 className="text-xl font-bold">Organization</h3>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Plan Selection
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
        <div className="max-w-5xl w-full space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /></Button>
            <h1 className="text-2xl font-bold">Choose a Plan</h1>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>₦{plan.price.toLocaleString()}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full" onClick={() => { setSelectedPlan(plan); setStep(3); }}>Select</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Finalize (Org Name if needed)
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Almost Done</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          
          {selectedRole === 'ORGANIZATION' && (
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={orgName} onChange={e => setOrgName(e.target.value)} />
            </div>
          )}
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Plan: {selectedPlan?.name}</p>
            <p className="text-2xl font-bold">
              {selectedPlan?.price === 0 ? 'Free' : `₦${selectedPlan?.price?.toLocaleString()}`}
            </p>
          </div>

          <Button className="w-full" onClick={handleFinalSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Setup'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}