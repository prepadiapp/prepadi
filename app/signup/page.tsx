'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plan, UserRole, PlanType } from '@prisma/client'; // Type Safety
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, Building, GraduationCap, ArrowRight, ArrowLeft } from "lucide-react";
import { GoogleIcon } from '@/components/GoogleIcon';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const router = useRouter();
  
  // --- State ---
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Role, 2=Plan, 3=Form
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState(''); // Only for Org
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Step 1: Fetch Plans when Role changes ---
  useEffect(() => {
    if (step === 2) {
      const type = selectedRole === UserRole.STUDENT ? 'STUDENT' : 'ORGANIZATION';
      setLoading(true);
      fetch(`/api/public/plans?type=${type}`)
        .then(res => res.json())
        .then(data => setPlans(data))
        .catch(err => setError("Failed to load plans"))
        .finally(() => setLoading(false));
    }
  }, [step, selectedRole]);

  // --- Handlers ---

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      // Success
      router.push('/verify-email');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    try {
      // 1. Save the intent to a cookie
      await fetch('/api/auth/save-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          role: selectedRole,
          orgName: selectedRole === 'ORGANIZATION' ? orgName : undefined
        }),
      });

      // 2. Redirect to Google
      signIn('google', { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  // --- Renders ---

  // Step 1: Choose Role
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
                <p className="text-sm text-muted-foreground">
                  I want to practice for my exams, take quizzes, and track my performance.
                </p>
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
                <p className="text-sm text-muted-foreground">
                  I want to manage students, create custom exams, and monitor progress.
                </p>
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

  // Step 2: Choose Plan
  if (step === 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
        <div className="max-w-5xl w-full space-y-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold">Choose your {selectedRole === 'STUDENT' ? 'Student' : 'Organization'} Plan</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary"/></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map(plan => (
                <Card key={plan.id} className="flex flex-col relative overflow-hidden hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold mt-2">
                      {plan.price === 0 ? 'Free' : `₦${plan.price.toLocaleString()}`}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        / {plan.interval.toLowerCase()}
                      </span>
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {/* We could parse plan.features here to show bullets, but for now simple list */}
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center"><Check className="w-4 h-4 mr-2 text-green-500"/> Access to Platform</li>
                      {/* You can add logic here to display specific features from JSON */}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={() => handlePlanSelect(plan)}>
                      Select {plan.name}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 3: Registration Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Back to Plans</span>
          </div>
          <CardTitle className="text-2xl">Complete Registration</CardTitle>
          <CardDescription>
            Creating a <strong>{selectedPlan?.name}</strong> account for <strong>{selectedRole}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleFinalSubmit} className="space-y-4">
            {selectedRole === UserRole.ORGANIZATION && (
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input 
                  id="orgName" 
                  value={orgName} 
                  onChange={e => setOrgName(e.target.value)} 
                  placeholder="e.g. Great Heights Academy"
                  required 
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
          </div>

          {/* Note: Google Sign Up currently defaults to Student in our AuthOptions. 
              Handling Org signup via Google is complex (need to ask Org Name after). 
              For now, this button will create a Student account. */}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignup}
            disabled={loading || !selectedPlan} // Disable if no plan selected
          >
            <GoogleIcon className="mr-2" />
            Sign Up with Google
          </Button>

        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Log In</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}