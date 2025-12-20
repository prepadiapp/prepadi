import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clock, XCircle, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { QuizReview } from '@/components/QuizReview'; 
import { StudentNav } from '@/components/student/StudentNav';
import GradingTrigger from '@/components/GradingTrigger';

// --- Helper Component: Visual Score Card ---
function ResultSummary({ score, correct, total, timeFormatted, status }: { score: number, correct: number, total: number, timeFormatted: string, status: string }) {
  const isPass = score >= 50;
  
  // Simple CSS-based conic gradient for the ring
  const ringBackground = `
    radial-gradient(closest-side, white 79%, transparent 80% 100%),
    conic-gradient(${isPass ? '#22c55e' : '#ef4444'} ${score}%, #e2e8f0 0)
  `;

  return (
    <div className="grid lg:grid-cols-2 gap-6 mb-8">
      {/* Main Score Card */}
      <Card className="border-none shadow-sm bg-white overflow-hidden relative">
         <div className={`absolute top-0 left-0 w-full h-1 ${isPass ? 'bg-green-500' : 'bg-red-500'}`} />
         <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <div 
                className="w-40 h-40 rounded-full flex items-center justify-center mb-6 relative"
                style={{ background: ringBackground }}
            >
                <div className="flex flex-col items-center">
                    <span className={`text-5xl font-extrabold tracking-tighter ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                        {score}%
                    </span>
                </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {status === 'IN_PROGRESS' ? "Grading Pending..." : (isPass ? "Excellent Work!" : "Keep Practicing!")}
            </h2>
            <p className="text-slate-500 max-w-xs mx-auto">
                You answered <span className="font-medium text-slate-900">{correct}</span> out of <span className="font-medium text-slate-900">{total}</span> questions correctly.
            </p>
         </CardContent>
      </Card>

      {/* Detailed Stats Grid */}
      <div className="flex flex-col gap-4">
         {/* Correct */}
         <Card className="border-none shadow-sm flex-1 bg-white">
            <CardContent className="p-6 flex items-center gap-4 h-full">
                <div className="p-3 rounded-full bg-green-50 text-green-600">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Correct Answers</p>
                    <p className="text-2xl font-bold text-slate-900">{correct} <span className="text-sm font-normal text-muted-foreground">/ {total}</span></p>
                </div>
            </CardContent>
         </Card>
         
         {/* Incorrect */}
         <Card className="border-none shadow-sm flex-1 bg-white">
            <CardContent className="p-6 flex items-center gap-4 h-full">
                <div className="p-3 rounded-full bg-red-50 text-red-600">
                    <XCircle className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Incorrect Answers</p>
                    <p className="text-2xl font-bold text-slate-900">{total - correct}</p>
                </div>
            </CardContent>
         </Card>

         {/* Time */}
         <Card className="border-none shadow-sm flex-1 bg-white">
            <CardContent className="p-6 flex items-center gap-4 h-full">
                <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                    <Clock className="w-8 h-8" />
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Time Spent</p>
                    <p className="text-2xl font-bold text-slate-900">{timeFormatted}</p>
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

export default async function ResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await getAuthSession();

  if (!session?.user) {
    redirect('/login');
  }

  // 1. Fetch Quiz Attempt
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId, userId: session.user.id },
    include: {
      exam: true,
      subject: true,
      assignment: true,
      userAnswers: {
        orderBy: { question: { id: 'asc' } },
        include: {
          question: { include: { options: true } },
          option: true,
        },
      },
    },
  });

  // 2. Fetch User Subscription Status (For StudentNav)
  const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        subscription: { include: { plan: true } },
        ownedOrganization: { include: { subscription: { include: { plan: true } } } },
        organization: { include: { subscription: { include: { plan: true } } } } // Added this to check member org status
      }
  });

  // Calculate isPro status
  const isOrgOwner = !!user?.ownedOrganization?.subscription?.isActive;
  // Check if user is a member of an org (organizationId is not null) OR if that org has an active subscription
  // Simply being in an org usually grants pro access in this context, or we check the org's sub.
  const isOrgMember = !!user?.organizationId || !!user?.organization?.subscription?.isActive; 
  const isUserPro = !!user?.subscription?.isActive;

  // If user is part of an org (as member or owner) or has own sub, they are Pro
  const isPro = isUserPro || isOrgOwner || isOrgMember;

  // // Calculate isPro status
  // let activeSub = null;
  // if (user?.subscription?.isActive) activeSub = user.subscription;
  // else if (user?.ownedOrganization?.subscription?.isActive) activeSub = user.ownedOrganization.subscription;
  
  // const isPro = (activeSub?.plan?.price || 0) > 0;

  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-0">
        <StudentNav 
          isPro={isPro} 
          isOrgMember={!!user?.organizationId} // Pass raw org membership status for "Connected to..." badge
          orgName={user?.organization?.name}
        />
        <main className="md:pl-64 min-h-screen transition-all p-4 md:p-8 flex items-center justify-center">
            <Alert variant="destructive" className="max-w-md bg-white shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Result Not Found</AlertTitle>
            <AlertDescription>This result either doesn't exist or you don't have permission to view it.</AlertDescription>
            <Button asChild className="mt-4 w-full" variant="outline"><Link href="/dashboard">Go Home</Link></Button>
            </Alert>
        </main>
      </div>
    );
  }

  // Time Formatting
  const minutes = Math.floor(attempt.timeTaken / 60);
  const seconds = attempt.timeTaken % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  // Determine retry link (back to assignment list if assignment, else specific practice link)
  const retryLink = attempt.assignment 
    ? `/dashboard/assessments` 
    : `/quiz/${attempt.exam.shortName.toLowerCase()}/${attempt.subject.name.toLowerCase().replace(/\s+/g, '-')}/${attempt.year}`;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-0">
      <StudentNav isPro={isPro} />
      <main className="md:pl-64 min-h-[calc(100vh-4rem)] md:min-h-screen transition-all">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            
            {/* AI Grading Trigger: If status is IN_PROGRESS, this component will call the grade API */}
            {attempt.status === 'IN_PROGRESS' && (
                <GradingTrigger attemptId={attempt.id} />
            )}

            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Quiz Results</h1>
                    <p className="text-slate-500">
                        {attempt.exam.name} • <span className="font-medium text-slate-700">{attempt.subject.name} ({attempt.year})</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button asChild variant="outline" className="bg-white">
                        <Link href="/dashboard">
                            <Home className="w-4 h-4 mr-2" /> Dashboard
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={retryLink}>
                            <RotateCcw className="w-4 h-4 mr-2" /> {attempt.assignment ? "Assessments" : "Retry Quiz"}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Summary Section */}
            <ResultSummary 
                score={attempt.score} 
                correct={attempt.correct} 
                total={attempt.total} 
                timeFormatted={timeFormatted}
                status={attempt.status}
            />

            {/* Review Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8">
                <QuizReview userAnswers={attempt.userAnswers} />
            </div>

        </div>
      </main>
    </div>
  );
}