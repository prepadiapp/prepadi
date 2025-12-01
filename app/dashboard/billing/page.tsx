import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillingManager } from '@/components/billing/BillingManager';
import { Toaster } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default async function StudentBillingPage() {
  const session = await getAuthSession();
  
  // Strict check: If no ID, redirect immediately
  if (!session?.user?.id) {
      redirect('/login');
  }

  try {
    // Fetch User & Subscription & Plans in parallel
    const [user, subscription, plans] = await prisma.$transaction([
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true } 
        }),
        prisma.subscription.findUnique({
            where: { userId: session.user.id },
            include: { plan: true },
        }),
        prisma.plan.findMany({
            where: { isActive: true, type: 'STUDENT' },
            orderBy: { price: 'asc' },
        }),
    ]);

    if (!user || !user.email) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Account Error</AlertTitle>
                    <AlertDescription>
                        Could not retrieve your email address. Please contact support.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
        <Toaster richColors />
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Billing & Plans</h1>
            <p className="text-sm text-muted-foreground">Choose the plan that fits your needs.</p>
        </div>
        
        <BillingManager 
            currentSubscription={subscription} 
            availablePlans={plans} 
            userRole="STUDENT"
            userEmail={user.email} 
        />
        </div>
    );
  } catch (error) {
      console.error("Billing Page Error:", error);
      return (
        <div className="p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>System Error</AlertTitle>
                <AlertDescription>
                    Failed to load billing information. Please try refreshing the page.
                </AlertDescription>
            </Alert>
        </div>
      );
  }
}