'use client';

import { useEffect, useState } from 'react';
import { Plan } from '@prisma/client'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { PlanFormDialog } from '@/components/admin/PlanFormDialog';

export default function ManagePlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      if (res.ok) setPlans(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedPlan(null);
    setDialogOpen(true);
  };

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

  return (
    <>
      <Toaster richColors />
      <PlanFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        plan={selectedPlan} 
        onSave={() => { setDialogOpen(false); fetchPlans(); }} 
      />
      
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Manage Plans</h1>
          <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Create Plan</Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Subscription Plans</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(plan => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>₦{plan.price.toLocaleString()}</TableCell>
                    <TableCell>{plan.interval}</TableCell>
                    <TableCell><Badge variant="outline">{plan.type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? 'default' : 'destructive'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}