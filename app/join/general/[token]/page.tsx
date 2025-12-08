'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, Building, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GeneralJoinPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.token as string;

  const [checking, setChecking] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  // 1. Verify Token Validity
  useEffect(() => {
    async function verifyToken() {
      try {
        const res = await fetch(`/api/public/verify-invite?token=${token}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        
        if (data.email !== 'GENERAL_LINK') {
            throw new Error("Invalid invite link type.");
        }
        setOrgName(data.orgName);
      } catch (err: any) {
        setError(err.message || "Invalid link.");
      } finally {
        setChecking(false);
      }
    }
    verifyToken();
  }, [token]);

  const handleRequestJoin = async () => {
    setRequesting(true);
    try {
        const res = await fetch('/api/organization/join-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg);
        }

        setSuccess("Request sent! The organization admin will review your request.");
    } catch (err: any) {
        setError(err.message);
    } finally {
        setRequesting(false);
    }
  };

  // Helpers to preserve current URL as callback
  const handleLogin = () => {
    signIn(undefined, { callbackUrl: window.location.href });
  };

  const handleSignup = () => {
    // Pass callbackUrl to signup page so Google Auth returns here
    // Pass flow=general_join to skip plan selection
    const callbackUrl = encodeURIComponent(window.location.href);
    router.push(`/signup?flow=general_join&callbackUrl=${callbackUrl}`);
  };

  if (checking) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join {orgName}</CardTitle>
          <CardDescription>Request access to join this organization.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <div className="text-center space-y-4">
                <div className="flex justify-center text-green-500 mb-2">
                    <CheckCircle className="w-12 h-12" />
                </div>
                <h3 className="font-semibold text-lg">Request Sent</h3>
                <p className="text-muted-foreground text-sm">
                    You will be notified once your request is approved. You can still access your personal student dashboard.
                </p>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
          ) : (
            <>
                {status === 'authenticated' ? (
                    <div className="text-center bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-4">
                            You are logged in as <strong>{session.user.email}</strong>.
                        </p>
                        <Button onClick={handleRequestJoin} disabled={requesting} className="w-full">
                            {requesting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                            <UserPlus className="w-4 h-4 mr-2" /> Request to Join
                        </Button>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">Please log in to send a join request.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={handleLogin}>Log In</Button>
                            <Button onClick={handleSignup}>Sign Up</Button>
                        </div>
                    </div>
                )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}