'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plan, UserRole } from '@prisma/client'; 
import { OrganizationPricingConfigurator, OrgPricingSelectionState } from '@/components/billing/OrganizationPricingConfigurator';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Check, Building, GraduationCap, ArrowLeft } from "lucide-react";
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { GoogleIcon } from '@/components/GoogleIcon';
import { AuthPageShell } from '@/components/AuthPageShell';
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
  const [orgPricingSelection, setOrgPricingSelection] = useState<OrgPricingSelectionState | null>(null);
  const [orgQuote, setOrgQuote] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgName, setOrgName] = useState(''); 
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    if (step === 2 && selectedRole === UserRole.STUDENT && !inviteToken && flow !== 'general_join') {
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
          orgPricingSelection: selectedRole === UserRole.ORGANIZATION ? orgPricingSelection : undefined,
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
          skipPlan, // Pass flag to intent
          orgPricingSelection: selectedRole === UserRole.ORGANIZATION ? orgPricingSelection : undefined,
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
      <AuthPageShell contentClassName="max-w-2xl items-center justify-center py-10 sm:py-14">
        <div className="w-full space-y-8 text-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0000FE]">Get started with Prepadi</span>
            <h1 className="mb-2 mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Choose your account type</h1>
            <p className="text-sm text-slate-600 sm:text-base">How do you want to use the platform?</p>
          </div>
          
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card 
              className="group cursor-pointer overflow-hidden rounded-3xl border-slate-200/90 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-[#AAB9FF] hover:shadow-xl"
              onClick={() => handleRoleSelect(UserRole.STUDENT)}
            >
              <CardContent className="flex flex-col items-start space-y-4 p-6 sm:p-8">
                <div className="rounded-2xl border border-[#DCE4FF] bg-[#F1F4FF] p-4 transition-colors group-hover:bg-[#E8EDFF]">
                  <GraduationCap className="h-9 w-9 text-[#0000FE]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">Student</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">I want to practice for my exams.</p>
                </div>
                <span className="text-sm font-semibold text-[#0000FE] group-hover:text-[#0000CC]">Continue as a student <span aria-hidden="true">→</span></span>
              </CardContent>
            </Card>

            <Card 
              className="group cursor-pointer overflow-hidden rounded-3xl border-slate-200/90 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl"
              onClick={() => handleRoleSelect(UserRole.ORGANIZATION)}
            >
              <CardContent className="flex flex-col items-start space-y-4 p-6 sm:p-8">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 transition-colors group-hover:bg-orange-100">
                  <Building className="h-9 w-9 text-[#E05224]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950 sm:text-2xl">Organization</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">I want to manage students.</p>
                </div>
                <span className="text-sm font-semibold text-[#C2410C]">Continue as an organization <span aria-hidden="true">→</span></span>
              </CardContent>
            </Card>
          </div>
           <div className="pt-4">
             <p className="text-sm text-slate-500">
                Already have an account? <Link href="/login" className="font-semibold text-[#0000FE] hover:text-[#0000CC] hover:underline">Log in</Link>
             </p>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  // STEP 2: Plan Selection
  if (step === 2) {
    if (selectedRole === UserRole.ORGANIZATION) {
      return (
        <AuthPageShell contentClassName="max-w-7xl py-8 sm:py-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="outline" size="icon" onClick={() => setStep(1)} className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white shadow-sm"><ArrowLeft className="h-5 w-5" /></Button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0000FE]">Organization setup</p>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Choose your setup</h1>
              </div>
            </div>

            <OrganizationPricingConfigurator
              mode="select"
              ctaLabel="Use this configuration"
              onContinue={(selection, quote) => {
                setOrgPricingSelection(selection);
                setOrgQuote(quote);
                setSelectedPlan({ id: quote.planId, name: quote.planName } as Plan);
                setStep(3);
              }}
            />
          </div>
        </AuthPageShell>
      );
    }

    return (
      <AuthPageShell contentClassName="max-w-5xl justify-center py-8 sm:py-10">
        <div className="w-full space-y-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="outline" size="icon" onClick={() => setStep(1)} className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white shadow-sm"><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0000FE]">Student plan</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Choose your plan</h1>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary"/></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              {plans.map(plan => {
                const features = plan.features as any;
                const bullets = (features?.displayBullets as string[]) || [];
                return (
                <Card key={plan.id} className="relative flex flex-col overflow-hidden rounded-3xl border-slate-200/90 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="h-1 bg-gradient-to-r from-[#0000FE] to-[#FF6600]" />
                  <CardHeader className="p-5 sm:p-6">
                    <CardTitle className="text-xl font-bold text-slate-950">{plan.name}</CardTitle>
                    <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                      {plan.price === 0 ? 'Free' : `₦${plan.price.toLocaleString()}`}
                      <span className="text-sm font-normal text-muted-foreground ml-1">/ {plan.interval.toLowerCase()}</span>
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 px-5 sm:px-6">
                    <ul className="space-y-2.5 text-sm">
                      {bullets.length > 0 ? bullets.map((b, i) => (
                         <li key={i} className="flex items-start"><Check className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-[#0000FE]"/> <span className="text-muted-foreground">{b}</span></li>
                      )) : (
                         <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-[#0000FE]"/> Full Platform Access</li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="h-11 w-full rounded-xl bg-[#0000FE] font-semibold hover:bg-[#0000CC]" onClick={() => handlePlanSelect(plan)}>Select {plan.name}</Button>
                  </CardFooter>
                </Card>
              )})}
            </div>
          )}
        </div>
      </AuthPageShell>
    );
  }

  // STEP 3: Signup Form
  const isJoinFlow = !!inviteToken || flow === 'general_join';
  const cardTitle = inviteToken ? 'Join Organization' : (flow === 'general_join' ? 'Create Student Account' : 'Complete Registration');

  return (
    <>
      <AuthPageShell contentClassName="max-w-md justify-center py-8 sm:py-10">
        <Card className="w-full overflow-hidden rounded-3xl border-slate-200/90 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="h-1.5 bg-gradient-to-r from-[#0000FE] via-[#4C72FE] to-[#FF6600]" />
          <CardHeader className="space-y-2 px-6 pt-6 sm:px-8 sm:pt-8">
            <div className="flex items-center gap-2 mb-2">
              {!isJoinFlow && (
                  <Button variant="outline" size="icon" onClick={() => setStep(2)} className="h-8 w-8 rounded-lg border-slate-200 bg-white">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
              )}
              {isJoinFlow && <span className="rounded-full border border-[#DCE4FF] bg-[#F1F4FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0000CC]">Student signup</span>}
              {!isJoinFlow && <span className="text-xs font-medium text-slate-500">Back to plans</span>}
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-950">{cardTitle}</CardTitle>
            <CardDescription className="leading-6">
              {inviteToken ? 'Create your student account to accept the invite.' : 
               flow === 'general_join' ? 'Create an account to request access to the organization.' :
               `Creating a ${selectedPlan?.name} account for ${selectedRole}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 sm:px-8">
            {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}

            <form onSubmit={handleFinalSubmit} className="space-y-4">
            {selectedRole === UserRole.ORGANIZATION && (
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-xs font-semibold text-slate-700">Organization Name</Label>
                  <Input id="orgName" className="h-11 rounded-xl border-slate-200 bg-slate-50/70 focus-visible:ring-[#0000FE]" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Great Heights Academy" required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Full Name</Label>
                <Input id="name" className="h-11 rounded-xl border-slate-200 bg-slate-50/70 focus-visible:ring-[#0000FE]" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email</Label>
                <Input id="email" type="email" className="h-11 rounded-xl border-slate-200 bg-slate-50/70 focus-visible:ring-[#0000FE]" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!inviteEmail} />
              </div>

              {selectedRole === UserRole.ORGANIZATION && orgQuote ? (
                <div className="rounded-2xl border border-[color:var(--primary-border)] bg-[color:var(--primary-soft)] p-4">
                  <p className="text-sm font-semibold text-[#0000CC]">Selected pricing</p>
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{orgQuote.planName}</p>
                      <p className="text-sm text-slate-600">
                        {orgQuote.seatCount} students • {orgQuote.interval.toLowerCase()}
                      </p>
                    </div>
                    <p className="text-2xl font-semibold text-slate-950">
                      {`N${orgQuote.amount.toLocaleString()}`}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div> */}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pr-11 focus-visible:ring-[#0000FE]"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                  </Button>
                </div>
              </div>

              <Button type="submit" className="h-11 w-full rounded-xl bg-[#0000FE] font-semibold hover:bg-[#0000CC]" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-[10px] font-semibold tracking-wide text-slate-400">Or continue with</span></div>
            </div>

            <Button
              variant="outline"
              className="h-11 w-full rounded-xl border-slate-200 font-semibold hover:bg-slate-50"
              onClick={initiateGoogleSignup}
              disabled={loading || ((!selectedPlan || (selectedRole === UserRole.ORGANIZATION && !orgPricingSelection)) && !isJoinFlow)}
            >
              <GoogleIcon className="mr-2" />
              Sign Up with Google
            </Button>
          </CardContent>
          <CardFooter className="justify-center border-t border-slate-100 px-6 py-5 sm:px-8">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link href={`/login?callbackUrl=${callbackUrl}`} className="font-semibold text-[#0000FE] hover:text-[#0000CC] hover:underline">Log In</Link>
            </p>
          </CardFooter>
        </Card>
      </AuthPageShell>

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
