'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  // Visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
        setStatus('error');
        setMessage("Passwords don't match");
        return;
    }

    if (password.length < 6) {
        setStatus('error');
        setMessage("Password must be at least 6 characters");
        return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to reset password');

      setStatus('success');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  if (status === 'success') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <Card className="w-full max-w-md">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Password Reset Successful!</h2>
                    <p className="text-slate-500">Your password has been updated. You will be redirected to login shortly.</p>
                    <Button asChild className="w-full mt-4">
                        <Link href="/login">Go to Login</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Please enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={status === 'loading'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={status === 'loading'}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={status === 'loading'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={status === 'loading'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">{showConfirmPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Reset Password'}
              </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}