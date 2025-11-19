'use client';

import { useEffect, useState } from 'react';
import { useQuizStore, SanitizedQuestion } from '@/stores/quizStore';
import { useTimer } from 'react-timer-hook';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  Lock,
  Timer,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';


interface QuizClientProps {
  initialQuestions: SanitizedQuestion[];
  quizDetails: {
    examName: string;
    subjectName: string;
    year: number;
  };
}

// --- Helper: Countdown Timer Component ---
function QuizTimer({ expiryTimestamp }: { expiryTimestamp: Date }) {
  const {
    seconds,
    minutes,
    hours,
  } = useTimer({ 
    expiryTimestamp, 
    onExpire: () => {
      // Automatically finish the quiz when time is up
      useQuizStore.getState().finishQuiz(); 
    }
  });

  // Format time to be 00:00:00
  const fHours = String(hours).padStart(2, '0');
  const fMinutes = String(minutes).padStart(2, '0');
  const fSeconds = String(seconds).padStart(2, '0');
  
  const timeRemaining = (hours * 3600) + (minutes * 60) + seconds;
  const totalTime = useQuizStore.getState().timeLimitMinutes * 60;
  const progress = (timeRemaining / totalTime) * 100;
  
  // Change color when time is low
  const timerColor = minutes < 5 && hours === 0 ? 'text-red-500' : 'text-primary';

  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center font-mono text-2xl font-bold ${timerColor}`}>
        <Timer className="w-6 h-6 mr-2" />
        <span>{fHours}:{fMinutes}:{fSeconds}</span>
      </div>
      <Progress value={progress} className="w-full h-2 mt-1" />
    </div>
  );
}

// --- Main Quiz Component ---
export function QuizClient({ initialQuestions, quizDetails }: QuizClientProps) {
  const router = useRouter();
  // Get state and actions from our Zustand store
  const {
    status,
    questions,
    currentIndex,
    answers,
    startTime,
    timeLimitMinutes,
    startQuiz,
    selectAnswer,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    finishQuiz,
    resetQuiz,
  } = useQuizStore();

  const [isMounted, setIsMounted] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState(new Date());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // On component mount: initialize the quiz
  useEffect(() => {
    startQuiz(initialQuestions);
    const quizStartTime = new Date();
    const expiry = new Date(quizStartTime.getTime() + timeLimitMinutes * 60 * 1000);
    setExpiryTimestamp(expiry);
    setIsMounted(true);
    
    // Clean up on unmount
    return () => resetQuiz(); 
  }, [initialQuestions, startQuiz, resetQuiz, timeLimitMinutes]);

  // On submit. This is where we will submit answers
  useEffect(() => {
    if (status === 'finished' && !isSubmitting) {
      
      const submit = async () => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
          const timeTaken = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000) : 0;
          const questionIds = questions.map(q => q.id);
          
          // Convert Map to an array of [key, value] for JSON serialization
          const answersArray = Array.from(answers.entries());

          const response = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: answersArray,
              questionIds: questionIds,
              timeTaken: timeTaken,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to submit quiz.');
          }

          const result = await response.json();
          const { attemptId } = result;

          // --- SUCCESS! Redirect to the results page ---
          router.push(`/quiz/results/${attemptId}`);

        } catch (error: any) {
          console.error(error);
          setSubmitError(error.message || 'An error occurred while submitting.');
          setIsSubmitting(false); // Allow user to try again? (or just show error)
        }
      };
      
      submit();
    }
  }, [status, isSubmitting, answers, questions, startTime, router]);




  if (!isMounted || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Preparing your exam...</p>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <AlertTitle>
            {isSubmitting ? 'Submitting Your Quiz...' : 'Submission Error'}
          </AlertTitle>
          <AlertDescription>
            {isSubmitting
              ? 'Please wait while we grade your answers.'
              : submitError}
          </AlertDescription>
        </Alert>
      </div>
    );
  }


  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.get(currentQuestion.id);
  const totalQuestions = questions.length;
  const answeredCount = answers.size;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-muted/20">
      
      {/* --- Main Question Panel (Left Side) --- */}
      <div className="flex-1 p-4 md:p-8 flex flex-col">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{quizDetails.examName}</h1>
            <p className="text-lg text-muted-foreground">
              {quizDetails.subjectName} ({quizDetails.year})
            </p>
          </div>
          <div className="w-full md:w-auto mt-4 md:mt-0">
            {startTime && <QuizTimer expiryTimestamp={expiryTimestamp} />}
          </div>
        </header>

        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>
              Question {currentIndex + 1} <span className="text-muted-foreground font-normal">of {totalQuestions}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            <p className="text-lg font-medium leading-relaxed">
              {currentQuestion.text}
            </p>
            
            <RadioGroup
              value={currentAnswer}
              onValueChange={(optionId) => selectAnswer(currentQuestion.id, optionId)}
            >
              {currentQuestion.options.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-3 p-4 border rounded-md has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary transition-colors">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <label htmlFor={option.id} className="flex-1 text-base cursor-pointer">
                    <span className="font-bold mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option.text}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={prevQuestion} 
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button 
              onClick={nextQuestion} 
              disabled={currentIndex === totalQuestions - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* --- Navigation Panel (Right Side) --- */}
      <aside className="w-full md:w-80 border-l bg-white p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Question Navigator</h3>
          <span className="text-sm font-medium text-muted-foreground">
            {answeredCount} / {totalQuestions}
          </span>
        </div>
        
        <ScrollArea className="flex-1 pr-3">
          <div className="grid grid-cols-5 gap-3">
            {questions.map((q, index) => (
              <Button
                key={q.id}
                variant={
                  currentIndex === index ? 'default' : 
                  answers.has(q.id) ? 'secondary' : 'outline'
                }
                className="w-full h-12 text-lg"
                onClick={() => goToQuestion(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </ScrollArea>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="lg" className="w-full mt-6">
              <Flag className="w-5 h-5 mr-2" />
              Finish & Submit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure you want to submit?</DialogTitle>
              <DialogDescription>
                You have answered {answeredCount} out of {totalQuestions} questions.
                You cannot change your answers after submitting.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">Cancel</Button>
              <Button 
                variant="destructive"
                onClick={() => finishQuiz()}
              >
                <Lock className="w-4 h-4 mr-2" />
                Submit Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </aside>
    </div>
  );
}