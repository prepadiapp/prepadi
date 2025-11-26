import Link from 'next/link';
import { Button } from '@/components/ui/button'; 

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-blue-600">Prepadi</h1>
        <p className="mt-4 text-xl text-gray-700">
          Your #1 CBT simulator for WAEC success.
        </p>
        <div className="mt-8 space-x-4">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">Sign Up</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}