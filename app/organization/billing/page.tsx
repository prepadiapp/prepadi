import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { OrganizationPricingConfigurator } from '@/components/billing/OrganizationPricingConfigurator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Sparkles } from 'lucide-react';

export default async function OrgBillingPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect('/login');

  try {
    // 1. Fetch User (Owner), Org, Subscription, and Plans
    // We need the User's email for payment, and the Org for the subscription context
    const org = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
      include: {
        subscription: {
          include: {
            plan: true,
            selectedExams: true,
          },
        },
      },
    });

    if (!org) {
         // If user is Organization Role but has no org, something is wrong with onboarding
         redirect('/onboarding');
    }

    const currentQuote = org.subscription?.quoteSnapshot as
      | {
          planId?: string;
          interval?: "MONTHLY" | "YEARLY";
          seatCount?: number;
          selectedBaseExamIds?: string[];
          selectedSpecialExamIds?: string[];
        }
      | null;

    return (
      <div className="space-y-8 pb-20">
        <div className="rounded-[1.75rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(235,241,255,0.88))] px-6 py-6 shadow-[0_22px_52px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[color:var(--primary-soft)] p-3 text-[color:var(--primary-ink)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Organization Billing</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Configure seats, choose your exam access, and keep your organization on the right tier.
              </p>
            </div>
          </div>
        </div>

        {org.subscription && (!org.subscription.quoteSnapshot || !org.subscription.seatCount) ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Action needed</AlertTitle>
            <AlertDescription>
              Your organization is on the legacy pricing setup. Choose a new configuration below to continue.
            </AlertDescription>
          </Alert>
        ) : null}

        <OrganizationPricingConfigurator
          mode="checkout"
          ctaLabel={org.subscription?.isActive ? "Update and pay" : "Continue to payment"}
          initialSelection={{
            planId: currentQuote?.planId,
            interval: currentQuote?.interval,
            seatCount: currentQuote?.seatCount,
            baseExamIds: currentQuote?.selectedBaseExamIds,
            specialExamIds: currentQuote?.selectedSpecialExamIds,
          }}
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
