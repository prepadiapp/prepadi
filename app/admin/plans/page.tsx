'use client';

import { useEffect, useMemo, useState } from 'react';
import { OrgPlanSeatBand, Plan, PlanType } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { PlanFormDialog } from '@/components/admin/PlanFormDialog';

type PlanWithBands = Plan & {
  seatBands: OrgPlanSeatBand[];
};

const formatSeatBand = (band: OrgPlanSeatBand) =>
  `${band.minSeats}-${band.maxSeats ?? 'up'} • N${band.monthlyPerStudent.toLocaleString()}/mo • N${band.yearlyPerStudent.toLocaleString()}/yr`;

export default function ManagePlansPage() {
  const [plans, setPlans] = useState<PlanWithBands[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithBands | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Failed to fetch plans');
      setPlans(await res.json());
    } catch (error: any) {
      toast.error(error.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Plan deleted');
      fetchPlans();
    } else {
      toast.error('Failed to delete');
    }
  };

  const studentPlans = useMemo(() => plans.filter((plan) => plan.type === PlanType.STUDENT), [plans]);
  const orgPlans = useMemo(() => plans.filter((plan) => plan.type === PlanType.ORGANIZATION), [plans]);

  return (
    <>
      <Toaster richColors />
      <PlanFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={selectedPlan}
        onSave={() => {
          setDialogOpen(false);
          fetchPlans();
        }}
      />

      <section className="space-y-6">
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(235,241,255,0.88))] px-6 py-6 shadow-[0_22px_52px_rgba(15,23,42,0.06)] md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Manage Pricing Plans</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Keep student subscriptions simple while managing organization tiers, seat bands, and pricing rules in one place.
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedPlan(null);
              setDialogOpen(true);
            }}
            className="rounded-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>

        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 rounded-full bg-[color:var(--primary-soft)] p-1">
            <TabsTrigger value="organization" className="rounded-full">Organization tiers</TabsTrigger>
            <TabsTrigger value="student" className="rounded-full">Student plans</TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              {orgPlans.map((plan) => (
                <Card key={plan.id} className="rounded-[1.5rem] border-[color:var(--primary-border)] bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <Badge variant={plan.isActive ? 'default' : 'destructive'}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => { setSelectedPlan(plan); setDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-[color:var(--primary-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--primary-ink)]">Base exams</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {plan.maxBaseExamSelections ? `Up to ${plan.maxBaseExamSelections}` : 'Unlimited'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--primary-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--primary-ink)]">Special exams</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {plan.allowsSpecialExams ? 'Allowed' : 'Not allowed'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[color:var(--primary-soft)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--primary-ink)]">Custom exams</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {plan.canCreateCustomExams ? 'Included' : 'Not included'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Seat bands</h3>
                      <div className="space-y-2">
                        {plan.seatBands.map((band) => (
                          <div key={band.id} className="rounded-2xl border border-slate-100 px-4 py-3 text-sm text-slate-700">
                            <div className="flex items-center justify-between gap-3">
                              <span>{formatSeatBand(band)}</span>
                              {band.isContactSales && <Badge variant="outline">Contact sales</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="student" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {studentPlans.map((plan) => (
                <Card key={plan.id} className="rounded-[1.5rem] border-[color:var(--primary-border)] bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                      <p className="mt-4 text-2xl font-semibold text-slate-950">
                        N{plan.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500">{plan.interval.toLowerCase()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => { setSelectedPlan(plan); setDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={plan.isActive ? 'default' : 'destructive'}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {loading && <p className="text-sm text-muted-foreground">Refreshing plans...</p>}
      </section>
    </>
  );
}
