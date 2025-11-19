import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, Clock, Hash, Percent, Target } from 'lucide-react';
import Link from 'next/link';
import { QuizReview } from '@/components/QuizReview'; 


function ScoreCircle({ score }: { score: number }) {
  
  const style = {
    background: `
      radial-gradient(closest-side, white 79%, transparent 80% 100%),
      conic-gradient(${score < 50 ? '#ef4444' : '#22c55e'} ${score}%, #e2e8f0 0)
    `,
  };
  
  return (
    <div 
      className="w-48 h-48 rounded-full flex items-center justify-center shadow-md"
      style={style}
    >
      <span className={`text-5xl font-bold ${score < 50 ? 'text-red-500' : 'text-green-500'}`}>
        {score}%
      </span>
    </div>
  );
}


function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}


export default async function ResultsPage({ params }: { 
  params: Promise<{ attemptId: string }> 
}) {
  
  // 1. Await the params to resolve them
  const resolvedParams = await params;
  const { attemptId } = resolvedParams;

  const session = await getAuthSession();
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch the attempt, but ONLY if it belongs to the logged-in user
  const attempt = await prisma.quizAttempt.findUnique({
    where: { 
      id: attemptId,
      userId: session.user.id // SECURE: Users can only see their own results
    },
    include: {
      exam: true,
      subject: true,
      // This is the complex query to get all data for the review
      userAnswers: {
        orderBy: {
          question: { id: 'asc' } // Keep a consistent order
        },
        include: {
          question: {
            include: {
              options: true, // Get all options for the question
            },
          },
          option: true, // Get the option the user selected
        },
      },
    },
  });

  // Handle case where attempt is not found
  if (!attempt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Quiz attempt not found or you do not have permission to view it.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Format the time
  const timeInSeconds = attempt.timeTaken;
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold">Quiz Results</h1>
        <p className="text-xl text-muted-foreground">
          {attempt.exam.name} - {attempt.subject.name} ({attempt.year})
        </p>
      </header>

      {/* --- Main Summary Card --- */}
      <Card className="mb-8">
        <CardContent className="flex flex-col items-center p-6 space-y-6">
          {/* Score Circle */}
          <ScoreCircle score={attempt.score} />
          
          <h2 className="text-3xl font-semibold">
            {attempt.score >= 50 ? "Well Done!" : "Keep Practicing!"}
          </h2>

          {/* Stats Grid (as per wireframe) */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              title="Correct" 
              value={attempt.correct} 
              icon={<Check className="w-4 h-4 text-green-500" />} 
            />
            <StatCard 
              title="Incorrect" 
              value={attempt.total - attempt.correct} 
              icon={<AlertCircle className="w-4 h-4 text-red-500" />} 
            />
            <StatCard 
              title="Total" 
              value={attempt.total} 
              icon={<Hash className="w-4 h-4 text-muted-foreground" />} 
            />
            <StatCard 
              title="Time Taken" 
              value={timeFormatted} 
              icon={<Clock className="w-4 h-4 text-muted-foreground" />} 
            />
          </div>

          {/* Action Buttons (as per wireframe) */}
          <div className="flex w-full gap-4">
            <Button asChild size="lg" className="flex-1">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1">
              <Link href={`/quiz/${attempt.exam.shortName.toLowerCase()}/${attempt.subject.name.toLowerCase().replace(/\s+/g, '-')}/${attempt.year}`}>
                Retry Quiz
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* --- Answer Review Section --- */}
      <QuizReview userAnswers={attempt.userAnswers} />
      
    </div>
  );
}