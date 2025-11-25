'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
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
import { Alert, AlertDescription } from '@/components/ui/alert'; 
import { UserRole } from '@prisma/client';


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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');


  const handlePostLogin = async () => {
    // Get the fresh session to check the role
    const session = await getSession();
    if (session?.user?.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
    router.refresh();
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    setIsLoading(false);

    if (result?.ok) {
      // Success! Redirect to dashboard.
      await handlePostLogin();
    } else {
      // Handle different errors
      if(result?.error === 'CredentialsSignin') {
        setError('Invalid email or password.');
      } else if (result?.error) {
        setError('An error occurred. Please try again.');
      } else {
        setError('Your email is not verified. Please check your inbox.');
      }
    }
  };

  

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // This will redirect to Google, then back to our app
    signIn('google', {
      callbackUrl: '/dashboard', 
    });
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back!</CardTitle>
            <CardDescription>
              Sign in to continue to PrepWave
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Show local errors (e.g., "Invalid password") */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Show query param alerts (e.g., "Email verified") */}
            <LoginAlerts />

            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <GoogleIcon className="mr-2" />
              Sign In with Google
            </Button>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="font-medium text-blue-600 hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </Suspense>
  );
}