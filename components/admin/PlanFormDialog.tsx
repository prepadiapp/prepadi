'use client';

import { useEffect, useState } from 'react';
import { Plan, PlanInterval, PlanType, Exam, Subject } from '@prisma/client'; 
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MultiSelect, MultiSelectOption } from './MultiSelect';

type PlanFeatures = {
  allowedExamIds: string[];
  allowedSubjectIds: string[];
  allowedYears: string[];
  maxStudents?: number;
  canCreateExams?: boolean;
};

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
  onSave: () => void;
}

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 20; i++) {
    years.push({ label: String(currentYear - i), value: String(currentYear - i) });
  }
  return years;
};

export function PlanFormDialog({ open, onOpenChange, plan, onSave }: PlanFormDialogProps) {
  // --- State ---
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [interval, setInterval] = useState<PlanInterval>(PlanInterval.MONTHLY);
  const [type, setType] = useState<PlanType>(PlanType.STUDENT);
  const [isActive, setIsActive] = useState(true);

  // Features
  const [allowedExamIds, setAllowedExamIds] = useState<string[]>([]);
  const [allowedSubjectIds, setAllowedSubjectIds] = useState<string[]>([]);
  const [allowedYears, setAllowedYears] = useState<string[]>([]);
  const [maxStudents, setMaxStudents] = useState<number>(0);
  const [canCreateExams, setCanCreateExams] = useState(false);

  // Data Sources
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  const yearOptions = generateYearOptions();

  // --- Fetch Data ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [examsRes, subRes] = await Promise.all([
          fetch('/api/admin/exams'),
          fetch('/api/admin/subjects')
        ]);
        if(examsRes.ok) setAllExams(await examsRes.json());
        if(subRes.ok) setAllSubjects(await subRes.json());
      } catch (e) {
        console.error("Failed to load filter data");
      }
    };
    loadData();
  }, []);

  // --- Populate Form ---
  useEffect(() => {
    if (open && plan) {
      setName(plan.name);
      setDescription(plan.description || '');
      setPrice(plan.price);
      setInterval(plan.interval);
      setType(plan.type);
      setIsActive(plan.isActive);

      const features = plan.features as PlanFeatures;
      setAllowedExamIds(features.allowedExamIds || []);
      setAllowedSubjectIds(features.allowedSubjectIds || []);
      setAllowedYears(features.allowedYears || []);
      setMaxStudents(features.maxStudents || 0);
      setCanCreateExams(features.canCreateExams || false);
    } else if (open && !plan) {
      // Reset
      setName(''); setDescription(''); setPrice(0);
      setInterval(PlanInterval.MONTHLY); setType(PlanType.STUDENT); setIsActive(true);
      setAllowedExamIds([]); setAllowedSubjectIds([]); setAllowedYears([]);
      setMaxStudents(0); setCanCreateExams(false);
    }
  }, [open, plan]);

  // --- Handlers ---
  
  const handleSelectAllExams = () => setAllowedExamIds(allExams.map(e => e.id));
  const handleSelectAllSubjects = () => setAllowedSubjectIds(allSubjects.map(s => s.id));
  const handleSelectAllYears = () => setAllowedYears(yearOptions.map(y => y.value));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const features: PlanFeatures = {
      allowedExamIds,
      allowedSubjectIds,
      allowedYears,
    };
    if (type === PlanType.ORGANIZATION) {
      features.maxStudents = maxStudents;
      features.canCreateExams = canCreateExams;
    }

    try {
      const url = plan ? `/api/admin/plans/${plan.id}` : '/api/admin/plans';
      const method = plan ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, price, interval, type, isActive, features
        }),
      });

      if (!res.ok) throw new Error('Failed');
      toast.success('Saved!');
      onSave();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const examOpts = allExams.map(e => ({ label: e.name, value: e.id }));
  const subjectOpts = allSubjects.map(s => ({ label: s.name, value: s.id }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{plan ? 'Edit Plan' : 'New Plan'}</DialogTitle>
            <DialogDescription>Configure pricing and access restrictions.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Row 1: Name & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pro Student" required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as PlanType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PlanType.STUDENT}>Student</SelectItem>
                    <SelectItem value={PlanType.ORGANIZATION}>Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* --- ROW 2: DESCRIPTION (ADDED) --- */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="What features does this plan include?"
                rows={2}
              />
            </div>

            {/* Row 3: Price & Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (Naira)</Label>
                <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label>Billing Interval</Label>
                <Select value={interval} onValueChange={(v) => setInterval(v as PlanInterval)}>
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

            {/* --- Feature Configuration --- */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-sm">Restrictions</h3>
              
              {/* Exams */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Allowed Exams</Label>
                  <Button type="button" variant="link" size="sm" onClick={handleSelectAllExams} className="h-auto p-0 text-xs">Select All</Button>
                </div>
                <MultiSelect options={examOpts} selected={allowedExamIds} onChange={setAllowedExamIds} placeholder="Select exams..." />
              </div>

              {/* Subjects */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Allowed Subjects</Label>
                  <Button type="button" variant="link" size="sm" onClick={handleSelectAllSubjects} className="h-auto p-0 text-xs">Select All</Button>
                </div>
                <MultiSelect options={subjectOpts} selected={allowedSubjectIds} onChange={setAllowedSubjectIds} placeholder="Select subjects..." />
              </div>

              {/* Years */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Allowed Years</Label>
                  <Button type="button" variant="link" size="sm" onClick={handleSelectAllYears} className="h-auto p-0 text-xs">Select All</Button>
                </div>
                <MultiSelect options={yearOptions} selected={allowedYears} onChange={setAllowedYears} placeholder="Select years..." />
              </div>

              {/* Org Specifics */}
              {type === PlanType.ORGANIZATION && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                  <div className="space-y-2">
                    <Label>Max Students</Label>
                    <Input type="number" value={maxStudents} onChange={e => setMaxStudents(Number(e.target.value))} />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <input type="checkbox" id="canCreate" checked={canCreateExams} onChange={e => setCanCreateExams(e.target.checked)} className="h-4 w-4" />
                    <Label htmlFor="canCreate">Can Create Exams</Label>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
               <input type="checkbox" id="active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4" />
               <Label htmlFor="active">Plan is Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}