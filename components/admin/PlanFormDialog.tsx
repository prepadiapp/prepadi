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
  const [originalFeatures, setOriginalFeatures] = useState<PlanFeatures>({
    allowedExamIds: [],
    allowedSubjectIds: [],
    allowedYears: [],
  });
  const [extraFeatures, setExtraFeatures] = useState<Record<string, unknown>>({});
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [shrinkWarning, setShrinkWarning] = useState<string | null>(null);

  const [maxBaseExamSelections, setMaxBaseExamSelections] = useState<number | ''>('');
  const [allowsSpecialExams, setAllowsSpecialExams] = useState(false);
  const [canCreateCustomExams, setCanCreateCustomExams] = useState(false);
  const [orgPricingEnabled, setOrgPricingEnabled] = useState(false);
  const [seatBands, setSeatBands] = useState<SeatBandInput[]>([]);

  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [examsRes, subjectsRes, yearsRes] = await Promise.all([
          fetch('/api/admin/exams'),
          fetch('/api/admin/subjects'),
          fetch('/api/admin/plans/available-years'),
        ]);

        if (examsRes.ok) setAllExams(await examsRes.json());
        if (subjectsRes.ok) setAllSubjects(await subjectsRes.json());
        if (yearsRes.ok) {
          const yearsPayload = await yearsRes.json();
          setAvailableYears(Array.isArray(yearsPayload.years) ? yearsPayload.years : []);
        }
      } catch (error) {
        console.error('Failed to load plan metadata', error);
      }
    };

    loadData();
  }, []);

  const normalizeFeatureList = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  const parseStoredFeatures = (raw: unknown): { parsed: PlanFeatures; extra: Record<string, unknown> } => {
    const empty: PlanFeatures = { allowedExamIds: [], allowedSubjectIds: [], allowedYears: [] };
    let record: Record<string, unknown> | null = null;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') record = parsed as Record<string, unknown>;
      } catch {
        record = null;
      }
    } else if (raw && typeof raw === 'object') {
      record = raw as Record<string, unknown>;
    }
    if (!record) return { parsed: empty, extra: {} };
    const { allowedExamIds, allowedSubjectIds, allowedYears, ...rest } = record;
    return {
      parsed: {
        allowedExamIds: normalizeFeatureList(allowedExamIds),
        allowedSubjectIds: normalizeFeatureList(allowedSubjectIds),
        allowedYears: normalizeFeatureList(allowedYears),
      },
      extra: rest,
    };
  };

  useEffect(() => {
    if (!open) return;

    if (plan) {
      const { parsed, extra } = parseStoredFeatures(plan.features);
      setName(plan.name);
      setDescription(plan.description || '');
      setPrice(plan.price);
      setInterval(plan.interval);
      setType(plan.type);
      setIsActive(plan.isActive);
      setMarketingBullets(Array.isArray(plan.marketingBullets) ? (plan.marketingBullets as string[]) : []);
      setOriginalFeatures(parsed);
      setExtraFeatures(extra);
      setAllowedExamIds(parsed.allowedExamIds);
      setAllowedSubjectIds(parsed.allowedSubjectIds);
      setAllowedYears(parsed.allowedYears);
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
      setOriginalFeatures({ allowedExamIds: [], allowedSubjectIds: [], allowedYears: [] });
      setExtraFeatures({});
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
    setConfirmRemoval(false);
    setShrinkWarning(null);
  }, [open, plan]);

  // Any filter change after a shrink warning clears the pending confirmation.
  useEffect(() => {
    setConfirmRemoval(false);
    setShrinkWarning(null);
  }, [allowedExamIds, allowedSubjectIds, allowedYears]);

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

  const coversAll = (values: string[]) => values.includes('ALL');
  const isNarrowing = (previous: string[], next: string[]) => {
    if (coversAll(previous) && !coversAll(next)) return true;
    if (previous.length > 0 && next.length === 0) return true;
    return false;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (plan && !confirmRemoval) {
      const narrowed: string[] = [];
      if (isNarrowing(originalFeatures.allowedExamIds, allowedExamIds)) narrowed.push('exams');
      if (isNarrowing(originalFeatures.allowedSubjectIds, allowedSubjectIds)) narrowed.push('subjects');
      if (isNarrowing(originalFeatures.allowedYears, allowedYears)) narrowed.push('years');
      if (narrowed.length > 0) {
        setShrinkWarning(
          `Saving will narrow coverage for: ${narrowed.join(', ')}. Students on this plan may lose access. Submit again to confirm.`
        );
        setConfirmRemoval(true);
        return;
      }
    }

    setLoading(true);

    const features: PlanFeatures & Record<string, unknown> = {
      ...extraFeatures,
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
      confirmRemoval,
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

      if (!response.ok) {
        let message = await response.text();
        try {
          const data = JSON.parse(message) as { error?: string; narrowed?: string[] };
          if (response.status === 409 && data.narrowed?.length) {
            setShrinkWarning(
              `The server blocked this save because it narrows coverage for: ${data.narrowed.join(', ')}. Submit again to confirm.`
            );
            setConfirmRemoval(true);
            return;
          }
          if (data.error) message = data.error;
        } catch {
          // Non-JSON error body; use raw text.
        }
        throw new Error(message || 'Failed to save plan');
      }

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
  const yearOptions = availableYears.map((year) => ({ label: String(year), value: String(year) }));
  const allExamsEnabled = allowedExamIds.includes('ALL');
  const allSubjectsEnabled = allowedSubjectIds.includes('ALL');
  const allYearsEnabled = allowedYears.includes('ALL');

  const toggleAllExams = () => {
    setAllowedExamIds((current) => (current.includes('ALL') ? [] : ['ALL']));
  };

  const toggleAllSubjects = () => {
    setAllowedSubjectIds((current) => (current.includes('ALL') ? [] : ['ALL']));
  };

  const toggleAllYears = () => {
    setAllowedYears((current) => (current.includes('ALL') ? [] : ['ALL']));
  };

  const describeCoverage = (values: string[], singular: string, plural: string) =>
    values.includes('ALL') ? `All ${plural}` : values.length === 0 ? `No ${plural}` : `${values.length} ${values.length === 1 ? singular : plural}`;
  const coverageSummary = `${describeCoverage(allowedExamIds, 'exam', 'exams')} · ${describeCoverage(allowedSubjectIds, 'subject', 'subjects')} · ${describeCoverage(allowedYears, 'year', 'years')}`;

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
                  <p className="text-xs text-slate-500 -mt-2">Currently saved: {coverageSummary}</p>

                  <div className="space-y-2">
                    <Label>Allowed exams</Label>
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <label className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={allExamsEnabled}
                          onChange={toggleAllExams}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-medium text-slate-900">All current and future exams</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Give this plan access to every exam now and any new exams added later.
                          </span>
                        </span>
                      </label>
                      <MultiSelect
                        options={examOptions}
                        selected={allExamsEnabled ? [] : allowedExamIds}
                        onChange={setAllowedExamIds}
                        placeholder={examOptions.length > 0 ? 'Select exams...' : 'No exams available yet'}
                        className="bg-white"
                        disabled={allExamsEnabled}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed subjects</Label>
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <label className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={allSubjectsEnabled}
                          onChange={toggleAllSubjects}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-medium text-slate-900">All current and future subjects</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Give this plan access to every subject now and any new subjects added later.
                          </span>
                        </span>
                      </label>
                      <MultiSelect
                        options={subjectOptions}
                        selected={allSubjectsEnabled ? [] : allowedSubjectIds}
                        onChange={setAllowedSubjectIds}
                        placeholder={subjectOptions.length > 0 ? 'Select subjects...' : 'No subjects available yet'}
                        className="bg-white"
                        disabled={allSubjectsEnabled}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed years</Label>
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <label className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 text-sm">
                        <input
                          type="checkbox"
                          checked={allYearsEnabled}
                          onChange={toggleAllYears}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-medium text-slate-900">All existing and future years</span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Give this plan access to every seeded year now and any new years added later.
                          </span>
                        </span>
                      </label>
                      <MultiSelect
                        options={yearOptions}
                        selected={allYearsEnabled ? [] : allowedYears}
                        onChange={setAllowedYears}
                        placeholder={yearOptions.length > 0 ? 'Select specific available years...' : 'No seeded years available yet'}
                        className="bg-white"
                        disabled={allYearsEnabled}
                      />
                      <p className="text-xs text-slate-500">
                        This list is pulled from the actual years already present in platform papers.
                      </p>
                    </div>
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

            {shrinkWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Narrowing coverage</AlertTitle>
                <AlertDescription>{shrinkWarning}</AlertDescription>
              </Alert>
            )}
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
