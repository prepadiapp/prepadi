'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleIcon } from '@/components/GoogleIcon';
import { AuthPageShell } from '@/components/AuthPageShell';
import { Alert, AlertDescription } from '@/components/ui/alert'; 
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

function LoginAlerts() {
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified');
  const error = searchParams.get('error');

  return (
    <>
      {verified === 'true' && (
        <Alert variant="success" className="mb-4 bg-green-100 border-green-300 text-green-800">
          <AlertDescription>
            Email verified successfully! You can now log in.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {error === 'CredentialsSignin'
              ? 'Invalid email or password. Please check your credentials.'
              : 'An error occurred. Please try again.'}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        callbackUrl,
        email,
        password,
      });

      if (result?.ok) {
        window.location.assign(result.url || callbackUrl);
        return;
      }

      setIsLoading(false);

      if (result?.error === 'CredentialsSignin') {
        setError('Invalid email or password.');
      } else if (result?.error) {
        setError('An error occurred. Please try again.');
      } else {
        setError('Your email is not verified. Please check your inbox.');
      }
    } catch (loginError) {
      setIsLoading(false);
      setError('An error occurred. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    signIn('google', {
      callbackUrl,
    });
  };

  return (
    <AuthPageShell contentClassName="max-w-6xl items-center justify-center py-8 sm:py-12">
      <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:gap-14">
        <section className="hidden max-w-xl space-y-6 lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#DCE4FF] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#0000CC] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#FF6600]" /> YOUR NEXT SESSION STARTS HERE
          </span>
          <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-950 xl:text-6xl">
            Welcome back.{' '}
            <span className="bg-gradient-to-r from-[#0000FE] to-[#FF6600] bg-clip-text text-transparent">Let’s keep going.</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-slate-600">
            Pick up your WAEC, JAMB, or NECO preparation with your papers and progress ready when you are.
          </p>
          <div className="relative max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/03.jpg" alt="Student preparing calmly for an exam" className="h-56 w-full rounded-[1.25rem] object-cover xl:h-64" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-bold text-slate-900">Practice at your pace</p>
              <p className="mt-0.5 text-[11px] text-slate-600">Your saved quiz progress stays on this device.</p>
            </div>
          </div>
        </section>

        <Card className="relative w-full overflow-hidden rounded-3xl border-slate-200/90 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="h-1.5 bg-gradient-to-r from-[#0000FE] via-[#4C72FE] to-[#FF6600]" />
          <CardHeader className="space-y-2 px-6 pt-7 sm:px-8 sm:pt-8">
            <span className="w-fit rounded-full bg-[#F1F4FF] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0000CC]">Student &amp; school access</span>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Welcome back</CardTitle>
            <CardDescription className="text-sm leading-6">Sign in to continue to your Prepadi account.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 sm:px-8">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Suspense fallback={null}>
            <LoginAlerts />
          </Suspense>

          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="h-11 rounded-xl border-slate-200 bg-slate-50/70 focus-visible:ring-[#0000FE]"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-medium text-primary hover:underline"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pr-11 focus-visible:ring-[#0000FE]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            <Button type="submit" className="h-11 w-full rounded-xl bg-[#0000FE] font-semibold text-white shadow-sm shadow-[#0000FE]/20 hover:bg-[#0000CC]" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[10px] font-semibold tracking-wide text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="h-11 w-full rounded-xl border-slate-200 font-semibold hover:bg-slate-50"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <GoogleIcon className="mr-2" />
            Sign In with Google
          </Button>
          </CardContent>
          <CardFooter className="justify-center border-t border-slate-100 px-6 py-5 sm:px-8">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-[#0000FE] hover:text-[#0000CC] hover:underline"
            >
              Sign Up
            </Link>
          </p>
          </CardFooter>
        </Card>
      </div>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0000FE]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
