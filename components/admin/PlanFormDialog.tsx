'use client';

import { useEffect, useState } from 'react';
import { Plan, Exam } from '@/lib/generated/prisma/client'; 
import { PlanInterval, PlanType } from '@/lib/generated/prisma/enums'; 
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MultiSelect, MultiSelectOption } from './MultiSelect'; 

// Define the shape of our Features JSON
type PlanFeatures = {
  allowedExamIds: string[]; // IDs of exams they can access
  maxStudents?: number;     // Only for Orgs
  canCreateExams?: boolean; // Only for Orgs
};

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
  onSave: () => void;
}

export function PlanFormDialog({ open, onOpenChange, plan, onSave }: PlanFormDialogProps) {
  // Basic Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [interval, setInterval] = useState<PlanInterval>(PlanInterval.MONTHLY);
  const [type, setType] = useState<PlanType>(PlanType.STUDENT);
  const [isActive, setIsActive] = useState(true);

  // Feature Fields
  const [allowedExamIds, setAllowedExamIds] = useState<string[]>([]);
  const [maxStudents, setMaxStudents] = useState<number>(0);
  const [canCreateExams, setCanCreateExams] = useState(false);

  // Data
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  // Load Exams for the multi-select
  useEffect(() => {
    fetch('/api/admin/exams').then(res => res.json()).then(setAllExams);
  }, []);

  // Populate form on edit
  useEffect(() => {
    if (open && plan) {
      setName(plan.name);
      setDescription(plan.description || '');
      setPrice(plan.price);
      setInterval(plan.interval);
      setType(plan.type);
      setIsActive(plan.isActive);

      // Parse Features
      const features = plan.features as PlanFeatures;
      setAllowedExamIds(features.allowedExamIds || []);
      setMaxStudents(features.maxStudents || 0);
      setCanCreateExams(features.canCreateExams || false);
    } else if (open && !plan) {
      // Reset
      setName('');
      setDescription('');
      setPrice(0);
      setInterval(PlanInterval.MONTHLY);
      setType(PlanType.STUDENT);
      setIsActive(true);
      setAllowedExamIds([]);
      setMaxStudents(0);
      setCanCreateExams(false);
    }
  }, [open, plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Construct Features JSON
    const features: PlanFeatures = {
      allowedExamIds,
    };
    if (type === PlanType.ORGANIZATION) {
      features.maxStudents = maxStudents;
      features.canCreateExams = canCreateExams;
    }

    const payload = {
      name, description, price, interval, type, isActive, features
    };

    try {
      const url = plan ? `/api/admin/plans/${plan.id}` : '/api/admin/plans';
      const method = plan ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save plan');
      
      toast.success(`Plan ${plan ? 'updated' : 'created'}!`);
      onSave();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare options for multi-select
  const examOptions: MultiSelectOption[] = allExams.map(e => ({ label: e.name, value: e.id }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{plan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>Configure the pricing and features for this tier.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* --- Basic Info --- */}
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

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What do they get?" />
            </div>

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
                    <SelectItem value={PlanInterval.QUARTERLY}>Quarterly (3 Mo)</SelectItem>
                    <SelectItem value={PlanInterval.BIANNUALLY}>Bi-Annually (6 Mo)</SelectItem>
                    <SelectItem value={PlanInterval.YEARLY}>Yearly</SelectItem>
                    <SelectItem value={PlanInterval.LIFETIME}>Lifetime (One-time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* --- Feature Configuration --- */}
            <div className="border-t pt-4 mt-2 space-y-4">
              <h3 className="font-semibold text-sm">Features & Restrictions</h3>
              
              <div className="space-y-2">
                <Label>Allowed Exams</Label>
                <MultiSelect 
                  options={examOptions} 
                  selected={allowedExamIds} 
                  onChange={setAllowedExamIds}
                  placeholder="Select allowed exams..."
                />
                <p className="text-xs text-muted-foreground">Users on this plan can only access these exams.</p>
              </div>

              {/* Organization Specifics */}
              {type === PlanType.ORGANIZATION && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                  <div className="space-y-2">
                    <Label>Max Students</Label>
                    <Input type="number" value={maxStudents} onChange={e => setMaxStudents(Number(e.target.value))} />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    {/* We need a checkbox since we didn't install Switch yet */}
                    <input 
                      type="checkbox" 
                      id="canCreate" 
                      checked={canCreateExams} 
                      onChange={e => setCanCreateExams(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="canCreate">Can Create Custom Exams</Label>
                  </div>
                </div>
              )}
            </div>

            {/* --- Status --- */}
            <div className="flex items-center space-x-2">
               <input 
                  type="checkbox" 
                  id="active" 
                  checked={isActive} 
                  onChange={e => setIsActive(e.target.checked)}
                  className="h-4 w-4"
               />
               <Label htmlFor="active">Plan is Active (Visible to users)</Label>
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