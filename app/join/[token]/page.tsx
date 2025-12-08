'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, Building, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.token as string;

  const [checking, setChecking] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // 1. Verify Token on Mount
  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await fetch(`/api/public/verify-invite?token=${token}`);
        if (!res.ok) {
            throw new Error(await res.text());
        }
        const data = await res.json();
        setInviteData(data);
      } catch (err: any) {
        setError(err.message || "Invalid or expired invite.");
      } finally {
        setChecking(false);
      }
    }
    verifyToken();
  }, [token]);

  // 2. Handle Existing User Join
  const handleAcceptAsUser = async () => {
    setProcessing(true);
    try {
        const res = await fetch('/api/organization/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        if(!res.ok) throw new Error(await res.text());
        
        setSuccess(`Joined ${inviteData.orgName} successfully!`);
        setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
        setError(err.message);
        setProcessing(false);
    }
  };

  // 3. Handle New User Signup
  const handleGoToSignup = () => {
    // Pass invite details to signup page to pre-fill and skip steps
    router.push(`/signup?inviteToken=${token}&email=${encodeURIComponent(inviteData.email)}`);
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-red-200">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl text-red-700">Invite Error</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardFooter className="justify-center">
                    <Button variant="outline" onClick={() => router.push('/')}>Go Home</Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            <strong>{inviteData.orgName}</strong> has invited you to join their organization on Prepadi.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
            {success && (
                <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            {!success && status === 'authenticated' && (
                <div className="text-center bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Logged in as <strong>{session.user.email}</strong></p>
                    {session.user.email?.toLowerCase() !== inviteData.email.toLowerCase() && (
                        <p className="text-xs text-yellow-600 mb-3">Warning: This invite was sent to {inviteData.email}.</p>
                    )}
                    <Button onClick={handleAcceptAsUser} disabled={processing} className="w-full">
                        {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                        Accept & Join Dashboard
                    </Button>
                </div>
            )}

            {!success && status === 'unauthenticated' && (
                <div className="space-y-3">
                    <Button onClick={handleGoToSignup} className="w-full h-12 text-base" size="lg">
                        Create Account & Join <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                        No payment required. You will join as a student member.
                    </p>
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-50 px-2 text-muted-foreground">Already have an account?</span></div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => router.push(`/login?callbackUrl=/join/${token}`)}>
                        Log In to Accept
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}