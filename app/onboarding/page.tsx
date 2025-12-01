'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plan, UserRole } from '@prisma/client'; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building, GraduationCap, ArrowLeft, Check } from "lucide-react";
import { useSession } from 'next-auth/react';

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
  const [verifying, setVerifying] = useState(false);

  // Protect Route & Smart Default
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    // If user is already an Organization in the DB, default to that role
    if (session?.user?.role === 'ORGANIZATION') {
        setSelectedRole(UserRole.ORGANIZATION);
    }
  }, [status, router, session]);

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
        
        const initRes = await fetch('/api/payment/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan?.id }),
        });

        if (!initRes.ok) throw new Error("Payment init failed");
        
        const initData = await initRes.json();
        const { reference, amount } = initData; 

        // 2. Open Paystack Popup
        const PaystackPop = (await import('@paystack/inline-js')).default;
        const popup = new PaystackPop();
        
        popup.newTransaction({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!, 
          email: session?.user?.email!,
          amount: amount, 
          ref: reference, 
          onSuccess: (response: any) => {
            handleVerifyPayment(response.reference);
          },
          onCancel: () => {
            setLoading(false);
            alert("Payment cancelled.");
          },
        });

      } else {
        // Free plan
        window.location.href = '/dashboard';
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
        window.location.href = '/dashboard'; // Force reload
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

  // Step 1: Role Selection
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <h1 className="text-3xl font-bold">Finish Setting Up Your Account</h1>
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
                className={`cursor-pointer hover:border-primary ${selectedRole === 'STUDENT' ? 'border-primary ring-1 ring-primary' : ''}`} 
                onClick={() => { setSelectedRole(UserRole.STUDENT); setStep(2); }}
            >
              <CardContent className="pt-6 flex flex-col items-center">
                <GraduationCap className="w-10 h-10 mb-2 text-blue-600" />
                <h3 className="text-xl font-bold">Student</h3>
              </CardContent>
            </Card>
            <Card 
                className={`cursor-pointer hover:border-primary ${selectedRole === 'ORGANIZATION' ? 'border-primary ring-1 ring-primary' : ''}`}
                onClick={() => { setSelectedRole(UserRole.ORGANIZATION); setStep(2); }}
            >
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
          
          {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary"/></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const features = plan.features as any;
                    const bullets = (features?.displayBullets as string[]) || [];
                    return (
                    <Card key={plan.id} className="flex flex-col relative overflow-hidden hover:shadow-xl transition-shadow">
                        <CardHeader>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <div className="text-3xl font-bold mt-2">
                            {plan.price === 0 ? 'Free' : `₦${plan.price.toLocaleString()}`}
                            <span className="text-sm font-normal text-muted-foreground ml-1">/ {plan.interval.toLowerCase()}</span>
                        </div>
                        <CardDescription className="mt-2">{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                        <ul className="space-y-2 text-sm">
                            {bullets.length > 0 ? bullets.map((b, i) => (
                                <li key={i} className="flex items-start"><Check className="w-4 h-4 mr-2 text-green-500 mt-0.5 shrink-0"/> <span className="text-muted-foreground">{b}</span></li>
                            )) : (
                                <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500"/> Full Platform Access</li>
                            )}
                        </ul>
                        </CardContent>
                        <CardFooter>
                        <Button className="w-full" onClick={() => { setSelectedPlan(plan); setStep(3); }}>Select</Button>
                        </CardFooter>
                    </Card>
                )})}
            </div>
          )}
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
              <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. My Academy" />
            </div>
          )}
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Plan: {selectedPlan?.name}</p>
            <p className="text-2xl font-bold">
              {selectedPlan?.price === 0 ? 'Free' : `₦${selectedPlan?.price?.toLocaleString()}`}
            </p>
          </div>

          <Button className="w-full" onClick={handleFinalSubmit} disabled={loading || verifying}>
            {(loading || verifying) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Setup'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}