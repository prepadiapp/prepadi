'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plan, UserRole } from '@prisma/client'; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Check, Building, GraduationCap, ArrowLeft } from "lucide-react";
import { GoogleIcon } from '@/components/GoogleIcon';
import { signIn } from 'next-auth/react';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Direct Invite Params
  const inviteToken = searchParams.get('inviteToken');
  const inviteEmail = searchParams.get('email');
  
  // General Join Flow Params
  const flow = searchParams.get('flow'); // 'general_join'
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  // --- State ---
  const [step, setStep] = useState<1 | 2 | 3>(1); 
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState(''); 
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOrgDialog, setShowOrgDialog] = useState(false); 

  // --- Logic: Handle Invites/Flows ---
  useEffect(() => {
    if (inviteToken) {
        // Direct Invite: Strict Student, Pre-fill email
        setStep(3); 
        setSelectedRole(UserRole.STUDENT); 
        if (inviteEmail) setEmail(inviteEmail); 
    } else if (flow === 'general_join') {
        // General Join: Strict Student, Skip Plan
        setStep(3);
        setSelectedRole(UserRole.STUDENT);
    }
  }, [inviteToken, inviteEmail, flow]);

  // --- Logic: Fetch Plans (Only if needed) ---
  useEffect(() => {
    if (step === 2 && !inviteToken && flow !== 'general_join') {
      const type = selectedRole === UserRole.STUDENT ? 'STUDENT' : 'ORGANIZATION';
      setLoading(true);
      fetch(`/api/public/plans?type=${type}`)
        .then(res => res.json())
        .then(data => setPlans(data))
        .catch(err => setError("Failed to load plans"))
        .finally(() => setLoading(false));
    }
  }, [step, selectedRole, inviteToken, flow]);

  // --- Handlers ---

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep(3);
  };

  // Handler: Credentials Signup
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const skipPlan = flow === 'general_join';

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: selectedRole,
          planId: selectedPlan?.id, 
          orgName: selectedRole === UserRole.ORGANIZATION ? orgName : undefined,
          inviteToken,
          skipPlan, // New flag for general join flow
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      const data = await res.json();

      // Direct Invite: Auto-verified
      if (inviteToken && data.success) {
          router.push('/login?verified=true');
          return;
      }

      // General Join: Standard verification needed
      if (flow === 'general_join' && data.success) {
          router.push('/verify-email');
          return;
      }

      router.push('/verify-email');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Google Signup Trigger
  const initiateGoogleSignup = () => {
    if (selectedRole === UserRole.ORGANIZATION && !orgName.trim()) {
      setShowOrgDialog(true);
    } else {
      performGoogleRedirect(); 
    }
  };

  // Handler: Google Redirect Logic
  const performGoogleRedirect = async () => {
    const skipPlan = flow === 'general_join';
    
    // Validation: Must have Plan OR Invite OR be skipping plan
    if (!selectedPlan && !inviteToken && !skipPlan) return;
    
    setLoading(true);
    try {
      await fetch('/api/auth/save-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan?.id,
          role: selectedRole,
          orgName: selectedRole === 'ORGANIZATION' ? orgName : undefined,
          inviteToken,
          skipPlan // Pass flag to intent
        }),
      });

      signIn('google', { callbackUrl: callbackUrl });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  // --- Renders ---

  // STEP 1: Role Selection
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Join Prepadi</h1>
            <p className="text-muted-foreground">How do you want to use the platform?</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
              onClick={() => handleRoleSelect(UserRole.STUDENT)}
            >
              <CardContent className="pt-6 flex flex-col items-center space-y-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <GraduationCap className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold">Student</h3>
                <p className="text-sm text-muted-foreground">I want to practice for my exams.</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
              onClick={() => handleRoleSelect(UserRole.ORGANIZATION)}
            >
              <CardContent className="pt-6 flex flex-col items-center space-y-4">
                <div className="p-4 bg-purple-100 rounded-full">
                  <Building className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold">Organization</h3>
                <p className="text-sm text-muted-foreground">I want to manage students.</p>
              </CardContent>
            </Card>
          </div>
           <div className="pt-4">
             <p className="text-sm text-muted-foreground">
                Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link>
             </p>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Plan Selection
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
        <div className="max-w-5xl w-full space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(1)}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="text-3xl font-bold">Choose your Plan</h1>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary"/></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map(plan => {
                const features = plan.features as any;
                const bullets = (features?.displayBullets as string[]) || [];
                return (
                <Card key={plan.id} className="flex flex-col relative overflow-hidden hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold mt-2">
                      {plan.price === 0 ? 'Free' : `₦${plan.price.toLocaleString()}`}
                      <span className="text-sm font-normal text-muted-foreground ml-1">/ {plan.interval.toLowerCase()}</span>
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2 text-sm">
                      {bullets.length > 0 ? bullets.map((b, i) => (
                         <li key={i} className="flex items-start"><Check className="w-4 h-4 mr-2 text-green-500 mt-0.5 shrink-0"/> <span className="text-muted-foreground">{b}</span></li>
                      )) : (
                         <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500"/> Full Platform Access</li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={() => handlePlanSelect(plan)}>Select {plan.name}</Button>
                  </CardFooter>
                </Card>
              )})}
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 3: Signup Form
  const isJoinFlow = !!inviteToken || flow === 'general_join';
  const cardTitle = inviteToken ? 'Join Organization' : (flow === 'general_join' ? 'Create Student Account' : 'Complete Registration');

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {!isJoinFlow && (
                  <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="h-8 w-8">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
              )}
              {isJoinFlow && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Student Signup</span>}
              {!isJoinFlow && <span className="text-sm text-muted-foreground">Back to Plans</span>}
            </div>
            <CardTitle className="text-2xl">{cardTitle}</CardTitle>
            <CardDescription>
              {inviteToken ? 'Create your student account to accept the invite.' : 
               flow === 'general_join' ? 'Create an account to request access to the organization.' :
               `Creating a ${selectedPlan?.name} account for ${selectedRole}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              {selectedRole === UserRole.ORGANIZATION && (
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Great Heights Academy" required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!inviteEmail} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
            </div>

            <Button variant="outline" className="w-full" onClick={initiateGoogleSignup} disabled={loading || (!selectedPlan && !isJoinFlow)}>
              <GoogleIcon className="mr-2" />
              Sign Up with Google
            </Button>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link href={`/login?callbackUrl=${callbackUrl}`} className="text-primary font-medium hover:underline">Log In</Link>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Dialog for Organization Name */}
      <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Setup</DialogTitle>
            <DialogDescription>Please enter your Organization's name.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="dialogOrgName" className="mb-2 block">Organization Name</Label>
            <Input id="dialogOrgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Prestige Academy" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrgDialog(false)}>Cancel</Button>
            <Button onClick={() => { if (orgName.trim()) { setShowOrgDialog(false); performGoogleRedirect(); } }} disabled={!orgName.trim()}>Continue to Google</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-muted/20"><Loader2 className="w-10 h-10 animate-spin text-primary"/></div>}>
      <SignupContent />
    </Suspense>
  );
}