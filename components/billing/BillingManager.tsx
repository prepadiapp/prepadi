'use client';

import { useState } from 'react';
import { Plan, Subscription } from '@prisma/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, AlertTriangle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type SubscriptionWithPlan = Subscription & { plan: Plan };

interface BillingManagerProps {
  currentSubscription: SubscriptionWithPlan | null;
  availablePlans: Plan[];
  userRole: 'STUDENT' | 'ORGANIZATION';
  userEmail: string;
}

export function BillingManager({ currentSubscription, availablePlans, userRole, userEmail }: BillingManagerProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const relevantPlans = availablePlans.filter(p => p.type === userRole);

  const handleSubscribe = async (plan: Plan) => {
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    
    if (!publicKey) {
        toast.error("Configuration Error: Missing Paystack Public Key");
        return;
    }

    if (!userEmail) {
        toast.error("User email is missing. Cannot proceed.");
        return;
    }

    if (plan.price === 0) {
         toast.info("To switch to a free plan, please cancel your current subscription.");
         return;
    }

    setLoadingPlanId(plan.id);
    try {
      // 1. Initialize
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });

      if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Payment initialization failed');
      }
      
      const { reference, amount } = await res.json();

      // 2. Open Paystack
      // Dynamic import to ensure window object is available
      const PaystackPop = (await import('@paystack/inline-js')).default;
      const paystack = new PaystackPop();
      
      paystack.newTransaction({
        key: publicKey, 
        email: userEmail,
        amount: amount, 
        ref: reference,
        onSuccess: async (transaction: any) => {
           // 3. Verify
           try {
             const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: transaction.reference }),
             });
             if (verifyRes.ok) {
                toast.success("Plan updated successfully!");
                window.location.reload();
             } else {
                toast.error("Payment successful but verification failed.");
             }
           } catch(e) {
             toast.error("Verification error.");
           }
        },
        onCancel: () => {
            setLoadingPlanId(null);
            toast.info("Payment cancelled");
        }
      });

    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error(error.message || "Something went wrong");
      setLoadingPlanId(null);
    }
  };

  const isCurrentPlan = (planId: string) => currentSubscription?.planId === planId;

  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      <Card className="border-l-4 border-l-primary shadow-sm bg-slate-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Your Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Current Plan:</span>
                <span className="font-bold text-foreground">{currentSubscription?.plan.name || 'Free Tier'}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                {currentSubscription?.isActive ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                ) : (
                    <Badge variant="destructive">Inactive</Badge>
                )}
            </div>
            {currentSubscription?.endDate ? (
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Valid until: {new Date(currentSubscription.endDate).toLocaleDateString()}
              </div>
            ) : (
                <div className="text-xs text-muted-foreground mt-1 pl-1">Lifetime Access</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid md:grid-cols-3 gap-6">
          {relevantPlans.map((plan) => {
            const features = plan.features as any;
            const bullets = (features?.displayBullets as string[]) || [];

            return (
            <Card key={plan.id} className={`flex flex-col relative transition-all ${isCurrentPlan(plan.id) ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'hover:shadow-md'}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrentPlan(plan.id) && <Badge variant="secondary">Current</Badge>}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {plan.price === 0 ? 'Free' : `₦${plan.price.toLocaleString()}`}
                  </span>
                  <span className="text-muted-foreground text-xs font-medium">/ {plan.interval.toLowerCase()}</span>
                </div>
                <CardDescription className="text-xs mt-1">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 pt-2">
                  {bullets.length > 0 ? (
                    bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{bullet}</span>
                        </li>
                    ))
                  ) : (
                    <>
                        <li className="flex items-start text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">Full Access</span>
                        </li>
                        <li className="flex items-start text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">Analytics & Reports</span>
                        </li>
                    </>
                  )}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={isCurrentPlan(plan.id) ? "outline" : "default"}
                  disabled={isCurrentPlan(plan.id) || !!loadingPlanId}
                  onClick={() => handleSubscribe(plan)}
                >
                  {loadingPlanId === plan.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isCurrentPlan(plan.id) ? 'Current Plan' : (plan.price === 0 ? 'Select' : `Upgrade`)}
                </Button>
              </CardFooter>
            </Card>
          )})}
      </div>
    </div>
  );
}