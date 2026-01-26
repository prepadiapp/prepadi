'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Building2, User, ShieldAlert, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function UserManagementDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [role, setRole] = useState<'STUDENT' | 'ORGANIZATION' | 'ADMIN'>('STUDENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Org Specifics
  const [newOrgName, setNewOrgName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('none');
  const [selectedPlanId, setSelectedPlanId] = useState('none');
  
  // Data
  const [orgs, setOrgs] = useState<{id: string, name: string}[]>([]);
  const [plans, setPlans] = useState<{id: string, name: string, price: number}[]>([]);

  useEffect(() => {
    if (open) {
        // Fetch Org List
        fetch('/api/admin/organizations/list')
            .then(res => res.json())
            .then(data => setOrgs(data))
            .catch(console.error);
        
        // Fetch Plan List (We can reuse public plans route or add an admin one)
        // Assuming /api/public/plans exists or similar
        fetch('/api/public/plans')
            .then(res => res.json())
            .then(data => setPlans(data))
            .catch(console.error);
    }
  }, [open]);

  const handleSubmit = async () => {
      setLoading(true);
      try {
          const payload = {
              name,
              email,
              password,
              role,
              organizationId: (role === 'STUDENT' && selectedOrgId !== 'none') ? selectedOrgId : undefined,
              newOrgName: role === 'ORGANIZATION' ? newOrgName : undefined,
              planId: selectedPlanId !== 'none' ? selectedPlanId : undefined
          };

          const res = await fetch('/api/admin/users/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (!res.ok) {
              const msg = await res.text();
              throw new Error(msg);
          }

          toast.success("User created successfully");
          setOpen(false);
          router.refresh();
          
          // Reset form
          setName(''); setEmail(''); setPassword(''); setNewOrgName(''); setSelectedOrgId('none'); setSelectedPlanId('none');

      } catch (error: any) {
          toast.error(error.message || "Failed to create user");
      } finally {
          setLoading(false);
      }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="w-4 h-4 mr-2" /> Add User / Org
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Manually add a user or organization to the platform.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(val: any) => setRole(val)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="STUDENT"><div className="flex items-center"><User className="w-4 h-4 mr-2"/> Student</div></SelectItem>
                        <SelectItem value="ORGANIZATION"><div className="flex items-center"><Building2 className="w-4 h-4 mr-2"/> Organization Owner</div></SelectItem>
                        <SelectItem value="ADMIN"><div className="flex items-center"><ShieldAlert className="w-4 h-4 mr-2 text-red-500"/> System Admin</div></SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
            </div>

            <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>

            <div className="grid gap-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <div className="grid gap-2">
                <Label>Assign Plan (Optional)</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">-- No Plan --</SelectItem>
                        {plans.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name} (₦{p.price})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">User will bypass payment if a plan is assigned here.</p>
            </div>

            {/* Conditional Fields based on Role */}
            
            {role === 'ORGANIZATION' && (
                <div className="grid gap-2 bg-slate-50 p-3 rounded-md border border-slate-100">
                    <Label className="text-blue-600">Organization Name</Label>
                    <Input 
                        value={newOrgName} 
                        onChange={e => setNewOrgName(e.target.value)} 
                        placeholder="e.g. Prestige Academy" 
                    />
                    <p className="text-xs text-muted-foreground">This will create a new Organization entity linked to this user.</p>
                </div>
            )}

            {role === 'STUDENT' && (
                <div className="grid gap-2">
                    <Label>Assign to Organization (Optional)</Label>
                    <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Organization" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- Independent Student --</SelectItem>
                            {orgs.map(org => (
                                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}