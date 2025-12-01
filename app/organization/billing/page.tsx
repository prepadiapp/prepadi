import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { BillingManager } from '@/components/billing/BillingManager';
import { Toaster } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default async function OrgBillingPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect('/login');

  try {
    // 1. Fetch User (Owner), Org, Subscription, and Plans
    // We need the User's email for payment, and the Org for the subscription context
    const [user, org] = await prisma.$transaction([
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true }
        }),
        prisma.organization.findUnique({
            where: { ownerId: session.user.id },
            include: {
                subscription: {
                    include: { plan: true }
                }
            }
        })
    ]);

    if (!org) {
         // If user is Organization Role but has no org, something is wrong with onboarding
         redirect('/onboarding');
    }

    // 2. Fetch available plans for Organizations
    const plans = await prisma.plan.findMany({
        where: { isActive: true, type: 'ORGANIZATION' },
        orderBy: { price: 'asc' },
    });

    if (!user || !user.email) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Account Error</AlertTitle>
                    <AlertDescription>
                        Could not retrieve owner email address. Please contact support.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <Toaster richColors />
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Organization Billing</h1>
                <p className="text-sm text-muted-foreground">Manage your organization's subscription plan.</p>
            </div>
            
            <BillingManager 
                currentSubscription={org.subscription} 
                availablePlans={plans} 
                userRole="ORGANIZATION"
                userEmail={user.email} 
            />
        </div>
    );

  } catch (error) {
      console.error("Org Billing Page Error:", error);
      return (
        <div className="p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>System Error</AlertTitle>
                <AlertDescription>
                    Failed to load billing information. Please refresh.
                </AlertDescription>
            </Alert>
        </div>
      );
  }
}