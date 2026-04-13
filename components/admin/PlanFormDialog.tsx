'use client';

import { useEffect, useState } from 'react';
import { Exam, OrgPlanSeatBand, Plan, PlanInterval, PlanType, Subject } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X, List, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { MultiSelect } from './MultiSelect';

type PlanWithBands = Plan & {
  seatBands: OrgPlanSeatBand[];
};

type PlanFeatures = {
  allowedExamIds: string[];
  allowedSubjectIds: string[];
  allowedYears: string[];
};

type SeatBandInput = {
  id: string;
  minSeats: number;
  maxSeats: number | null;
  monthlyPerStudent: number;
  yearlyPerStudent: number;
  isContactSales: boolean;
};

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanWithBands | null;
  onSave: () => void;
}

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 20 }, (_, index) => {
    const value = String(currentYear - index);
    return { label: value, value };
  });
};

const createSeatBand = (): SeatBandInput => ({
  id: crypto.randomUUID(),
  minSeats: 3,
  maxSeats: null,
  monthlyPerStudent: 1000,
  yearlyPerStudent: 10000,
  isContactSales: false,
});

export function PlanFormDialog({ open, onOpenChange, plan, onSave }: PlanFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [interval, setInterval] = useState<PlanInterval>(PlanInterval.MONTHLY);
  const [type, setType] = useState<PlanType>(PlanType.STUDENT);
  const [isActive, setIsActive] = useState(true);
  const [marketingBullets, setMarketingBullets] = useState<string[]>([]);
  const [newBullet, setNewBullet] = useState('');

  const [allowedExamIds, setAllowedExamIds] = useState<string[]>([]);
  const [allowedSubjectIds, setAllowedSubjectIds] = useState<string[]>([]);
  const [allowedYears, setAllowedYears] = useState<string[]>([]);

  const [maxBaseExamSelections, setMaxBaseExamSelections] = useState<number | ''>('');
  const [allowsSpecialExams, setAllowsSpecialExams] = useState(false);
  const [canCreateCustomExams, setCanCreateCustomExams] = useState(false);
  const [orgPricingEnabled, setOrgPricingEnabled] = useState(false);
  const [seatBands, setSeatBands] = useState<SeatBandInput[]>([]);

  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  const yearOptions = generateYearOptions();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [examsRes, subjectsRes] = await Promise.all([
          fetch('/api/admin/exams'),
          fetch('/api/admin/subjects'),
        ]);

        if (examsRes.ok) setAllExams(await examsRes.json());
        if (subjectsRes.ok) setAllSubjects(await subjectsRes.json());
      } catch (error) {
        console.error('Failed to load plan metadata', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!open) return;

    if (plan) {
      const features = (plan.features || {}) as PlanFeatures;
      setName(plan.name);
      setDescription(plan.description || '');
      setPrice(plan.price);
      setInterval(plan.interval);
      setType(plan.type);
      setIsActive(plan.isActive);
      setMarketingBullets(Array.isArray(plan.marketingBullets) ? (plan.marketingBullets as string[]) : []);
      setAllowedExamIds(features.allowedExamIds || []);
      setAllowedSubjectIds(features.allowedSubjectIds || []);
      setAllowedYears(features.allowedYears || []);
      setMaxBaseExamSelections(plan.maxBaseExamSelections ?? '');
      setAllowsSpecialExams(plan.allowsSpecialExams);
      setCanCreateCustomExams(plan.canCreateCustomExams);
      setOrgPricingEnabled(plan.orgPricingEnabled);
      setSeatBands(
        plan.seatBands.length > 0
          ? plan.seatBands.map((band) => ({
              id: band.id,
              minSeats: band.minSeats,
              maxSeats: band.maxSeats,
              monthlyPerStudent: band.monthlyPerStudent,
              yearlyPerStudent: band.yearlyPerStudent,
              isContactSales: band.isContactSales,
            }))
          : [createSeatBand()]
      );
    } else {
      setName('');
      setDescription('');
      setPrice(0);
      setInterval(PlanInterval.MONTHLY);
      setType(PlanType.STUDENT);
      setIsActive(true);
      setMarketingBullets([]);
      setAllowedExamIds([]);
      setAllowedSubjectIds([]);
      setAllowedYears([]);
      setMaxBaseExamSelections('');
      setAllowsSpecialExams(false);
      setCanCreateCustomExams(false);
      setOrgPricingEnabled(false);
      setSeatBands([createSeatBand()]);
    }

    setNewBullet('');
  }, [open, plan]);

  const addBullet = () => {
    if (!newBullet.trim()) return;
    setMarketingBullets((current) => [...current, newBullet.trim()]);
    setNewBullet('');
  };

  const removeBullet = (index: number) => {
    setMarketingBullets((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const addSeatBand = () => {
    setSeatBands((current) => [...current, createSeatBand()]);
  };

  const updateSeatBand = (id: string, field: keyof SeatBandInput, value: string | number | boolean | null) => {
    setSeatBands((current) =>
      current.map((band) =>
        band.id === id
          ? {
              ...band,
              [field]: value,
            }
          : band
      )
    );
  };

  const removeSeatBand = (id: string) => {
    setSeatBands((current) => current.filter((band) => band.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const features: PlanFeatures = {
      allowedExamIds,
      allowedSubjectIds,
      allowedYears,
    };

    const payload = {
      name,
      description,
      price: type === PlanType.ORGANIZATION ? 0 : price,
      interval: type === PlanType.ORGANIZATION ? PlanInterval.MONTHLY : interval,
      type,
      features,
      isActive,
      marketingBullets,
      maxBaseExamSelections:
        type === PlanType.ORGANIZATION && maxBaseExamSelections !== '' ? Number(maxBaseExamSelections) : null,
      allowsSpecialExams: type === PlanType.ORGANIZATION ? allowsSpecialExams : false,
      canCreateCustomExams: type === PlanType.ORGANIZATION ? canCreateCustomExams : false,
      orgPricingEnabled: type === PlanType.ORGANIZATION ? orgPricingEnabled : false,
      seatBands:
        type === PlanType.ORGANIZATION
          ? seatBands.map((band) => ({
              minSeats: Number(band.minSeats),
              maxSeats: band.maxSeats === null ? null : Number(band.maxSeats),
              monthlyPerStudent: Number(band.monthlyPerStudent),
              yearlyPerStudent: Number(band.yearlyPerStudent),
              isContactSales: Boolean(band.isContactSales),
            }))
          : [],
    };

    try {
      const url = plan ? `/api/admin/plans/${plan.id}` : '/api/admin/plans';
      const method = plan ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(await response.text());

      toast.success('Plan saved successfully.');
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  const examOptions = allExams.map((exam) => ({ label: exam.name, value: exam.id }));
  const subjectOptions = allSubjects.map((subject) => ({ label: subject.name, value: subject.id }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[860px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{plan ? 'Edit plan' : 'Create plan'}</DialogTitle>
            <DialogDescription>
              Configure either a student subscription or an organization pricing tier.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as PlanType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PlanType.STUDENT}>Student</SelectItem>
                    <SelectItem value={PlanType.ORGANIZATION}>Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="A short summary that appears on pricing cards."
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] p-5">
              <div className="flex items-center gap-2 text-[color:var(--primary-ink)]">
                <Sparkles className="h-4 w-4" />
                <Label>Marketing bullets</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newBullet}
                  onChange={(event) => setNewBullet(event.target.value)}
                  placeholder="Add a short benefit statement"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addBullet();
                    }
                  }}
                />
                <Button type="button" size="icon" onClick={addBullet}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {marketingBullets.map((bullet, index) => (
                  <div key={`${bullet}-${index}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
                    <span>{bullet}</span>
                    <button type="button" onClick={() => removeBullet(index)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {type === PlanType.STUDENT ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Price (Naira)</Label>
                    <Input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing interval</Label>
                    <Select value={interval} onValueChange={(value) => setInterval(value as PlanInterval)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PlanInterval.MONTHLY}>Monthly</SelectItem>
                        <SelectItem value={PlanInterval.QUARTERLY}>Quarterly</SelectItem>
                        <SelectItem value={PlanInterval.BIANNUALLY}>Bi-Annually</SelectItem>
                        <SelectItem value={PlanInterval.YEARLY}>Yearly</SelectItem>
                        <SelectItem value={PlanInterval.LIFETIME}>Lifetime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <List className="h-4 w-4" />
                    <p className="text-sm font-medium">Student access filters</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed exams</Label>
                    <MultiSelect options={examOptions} selected={allowedExamIds} onChange={setAllowedExamIds} placeholder="Select exams..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed subjects</Label>
                    <MultiSelect options={subjectOptions} selected={allowedSubjectIds} onChange={setAllowedSubjectIds} placeholder="Select subjects..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed years</Label>
                    <MultiSelect options={yearOptions} selected={allowedYears} onChange={setAllowedYears} placeholder="Select years..." />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-5 rounded-2xl border border-[color:var(--primary-border)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(235,241,255,0.9))] p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Base exam limit</Label>
                    <Input
                      type="number"
                      value={maxBaseExamSelections}
                      onChange={(event) =>
                        setMaxBaseExamSelections(event.target.value === '' ? '' : Number(event.target.value))
                      }
                      placeholder="Leave blank for unlimited"
                    />
                  </div>
                  <label className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={allowsSpecialExams}
                      onChange={(event) => setAllowsSpecialExams(event.target.checked)}
                    />
                    Allows special exams
                  </label>
                  <label className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={canCreateCustomExams}
                      onChange={(event) => setCanCreateCustomExams(event.target.checked)}
                    />
                    Can create custom exams
                  </label>
                </div>

                <label className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={orgPricingEnabled}
                    onChange={(event) => setOrgPricingEnabled(event.target.checked)}
                  />
                  Show this tier in the organization pricing configurator
                </label>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Seat bands</h3>
                      <p className="text-sm text-slate-600">Define per-student pricing and sales-only ranges.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={addSeatBand}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add band
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {seatBands.map((band) => (
                      <div key={band.id} className="grid gap-3 rounded-2xl border border-white/80 bg-white p-4 md:grid-cols-5">
                        <div className="space-y-2">
                          <Label>Min seats</Label>
                          <Input
                            type="number"
                            value={band.minSeats}
                            onChange={(event) => updateSeatBand(band.id, 'minSeats', Number(event.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max seats</Label>
                          <Input
                            type="number"
                            value={band.maxSeats ?? ''}
                            onChange={(event) =>
                              updateSeatBand(
                                band.id,
                                'maxSeats',
                                event.target.value === '' ? null : Number(event.target.value)
                              )
                            }
                            placeholder="Leave blank for unlimited"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Monthly/student</Label>
                          <Input
                            type="number"
                            value={band.monthlyPerStudent}
                            onChange={(event) =>
                              updateSeatBand(band.id, 'monthlyPerStudent', Number(event.target.value))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Yearly/student</Label>
                          <Input
                            type="number"
                            value={band.yearlyPerStudent}
                            onChange={(event) =>
                              updateSeatBand(band.id, 'yearlyPerStudent', Number(event.target.value))
                            }
                          />
                        </div>
                        <div className="flex flex-col justify-between gap-3">
                          <label className="flex items-center gap-2 rounded-xl bg-[color:var(--primary-soft)] px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={band.isContactSales}
                              onChange={(event) => updateSeatBand(band.id, 'isContactSales', event.target.checked)}
                            />
                            Contact sales
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            className="justify-start text-destructive hover:text-destructive"
                            onClick={() => removeSeatBand(band.id)}
                            disabled={seatBands.length === 1}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Plan is active
            </label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
