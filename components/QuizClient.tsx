'use client';

import { useEffect, useState } from 'react';
import { useQuizStore, SanitizedQuestion, QuizMode } from '@/stores/quizStore';
import { useTimer } from 'react-timer-hook';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft, ChevronRight, Flag, Loader2, Lock, Timer, AlertCircle, Menu, BookOpen, Sparkles, Check, X
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify'; 

interface QuizClientProps {
  initialQuestions: SanitizedQuestion[];
  quizDetails: {
    examName: string;
    subjectName: string;
    year: number;
  };
  mode: QuizMode;
}

// --- Helper: Countdown Timer Component ---
function QuizTimer({ expiryTimestamp }: { expiryTimestamp: Date }) {
  const { seconds, minutes, hours } = useTimer({ 
    expiryTimestamp, 
    onExpire: () => {
      useQuizStore.getState().finishQuiz(); 
    }
  });

  const fHours = String(hours).padStart(2, '0');
  const fMinutes = String(minutes).padStart(2, '0');
  const fSeconds = String(seconds).padStart(2, '0');
  
  const totalTime = useQuizStore.getState().timeLimitMinutes * 60;
  const timeRemaining = (hours * 3600) + (minutes * 60) + seconds;
  const progress = (timeRemaining / totalTime) * 100;
  const timerColor = minutes < 5 && hours === 0 ? 'text-red-500' : 'text-primary';

  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center font-mono text-xl md:text-2xl font-bold ${timerColor}`}>
        <Timer className="w-5 h-5 md:w-6 md:h-6 mr-2" />
        <span>{fHours}:{fMinutes}:{fSeconds}</span>
      </div>
      <Progress value={progress} className="w-32 md:w-48 h-1.5 mt-1" />
    </div>
  );
}

// --- Helper: Safe HTML Renderer ---
function SafeHTML({ html, className }: { html: string; className?: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html);
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
    />
  );
}

export function QuizClient({ initialQuestions, quizDetails, mode }: QuizClientProps) {
  const router = useRouter();
  const {
    status, questions, currentIndex, answers, startTime, timeLimitMinutes,
    startQuiz, selectAnswer, goToQuestion, nextQuestion, prevQuestion, finishQuiz, resetQuiz,
  } = useQuizStore();

  const [isMounted, setIsMounted] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  
  // --- Theory Grading State ---
  const [theoryText, setTheoryText] = useState('');
  const [aiGrading, setAiGrading] = useState<any>(null);
  const [gradingLoading, setGradingLoading] = useState(false);

  useEffect(() => {
    startQuiz(initialQuestions, mode);
    const quizStartTime = new Date();
    const expiry = new Date(quizStartTime.getTime() + timeLimitMinutes * 60 * 1000);
    setExpiryTimestamp(expiry);
    setIsMounted(true);
    return () => resetQuiz(); 
  }, [initialQuestions, startQuiz, resetQuiz, timeLimitMinutes, mode]);

  // Sync text input when question changes
  useEffect(() => {
    if (questions[currentIndex]) {
       setTheoryText(answers.get(questions[currentIndex].id) || '');
       setAiGrading(null); 
    }
  }, [currentIndex, questions, answers]);

  useEffect(() => {
    if (status === 'finished' && !isSubmitting) {
      const submit = async () => {
        setIsSubmitting(true);
        setSubmitError(null);
        try {
          const timeTaken = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000) : 0;
          const questionIds = questions.map(q => q.id);
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

          if (!response.ok) throw new Error('Failed to submit quiz.');
          const result = await response.json();
          router.push(`/quiz/results/${result.attemptId}`);
        } catch (error: any) {
          setSubmitError(error.message || 'An error occurred while submitting.');
          setIsSubmitting(false);
        }
      };
      submit();
    }
  }, [status, isSubmitting, answers, questions, startTime, router]);

  // --- Handlers ---
  const handleTheoryChange = (val: string) => {
      setTheoryText(val);
      selectAnswer(questions[currentIndex].id, val);
  };

  const handleGradeTheory = async () => {
      if (!theoryText.trim()) return;
      setGradingLoading(true);
      try {
          const res = await fetch('/api/quiz/grade-theory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questionId: questions[currentIndex].id, answer: theoryText })
          });
          if (res.ok) {
              setAiGrading(await res.json());
          }
      } catch(e) { console.error(e); }
      finally { setGradingLoading(false); }
  };
  
  const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
          const timeTaken = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000) : 0;
          const response = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: Array.from(answers.entries()),
              questionIds: questions.map(q => q.id),
              timeTaken,
            }),
          });
          if (!response.ok) throw new Error('Failed to submit');
          const result = await response.json();
          router.push(`/quiz/results/${result.attemptId}`);
        } catch (error: any) {
          setSubmitError(error.message);
          setIsSubmitting(false);
        }
  };

  if (!isMounted || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Preparing your exam...</p>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
          <AlertTitle>{isSubmitting ? 'Submitting...' : 'Submission Error'}</AlertTitle>
          <AlertDescription>{isSubmitting ? 'Please wait.' : submitError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.get(currentQuestion.id);
  const totalQuestions = questions.length;
  const answeredCount = answers.size;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // --- Navigator Content ---
  const NavigatorContent = () => (
    <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h3 className="text-base font-semibold">Question Navigator</h3>
          <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>
        
        {/* Fixed height scrolling area */}
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="grid grid-cols-5 gap-2 pb-6">
            {questions.map((q, index) => {
                const isAnswered = answers.has(q.id);
                const isCurrent = currentIndex === index;
                return (
                  <Button
                    key={q.id}
                    variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                    className={cn(
                        "w-full h-10 text-sm p-0 transition-all",
                        isAnswered && !isCurrent && "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
                        isCurrent && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => goToQuestion(index)}
                    aria-label={`Question ${index + 1}${isAnswered ? ', Answered' : ''}`}
                  >
                    {index + 1}
                  </Button>
                );
            })}
          </div>
        </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50/50">
      
      {/* --- Main Area --- */}
      <div className="flex-1 flex flex-col p-3 md:p-4 max-w-4xl mx-auto w-full h-[calc(100vh-64px)] md:h-screen overflow-y-auto">
        {/* Header */}
        <header className="flex flex-col gap-3 mb-3 md:mb-4 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
                <h1 className="text-lg md:text-xl font-bold leading-tight text-foreground">{quizDetails.examName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground font-medium">{quizDetails.subjectName} • {quizDetails.year}</span>
                    {mode === 'PRACTICE' && (
                        <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide border border-orange-200">PRACTICE</span>
                    )}
                </div>
            </div>

            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9"><Menu className="w-4 h-4"/></Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80 sm:w-96">
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle>Quiz Overview</SheetTitle>
                        </SheetHeader>
                        <NavigatorContent />
                    </SheetContent>
                </Sheet>
            </div>
          </div>

          {/* Timer Bar */}
          {mode === 'EXAM' && startTime && (
             <div className="w-full flex justify-center bg-white p-2 md:p-3 rounded-xl shadow-sm border border-slate-100">
                <QuizTimer expiryTimestamp={expiryTimestamp} />
             </div>
          )}
        </header>

        {/* Question Card */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden min-h-0">
          <CardHeader className="pb-3 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex justify-between items-center">
                <CardTitle className="text-base font-semibold">Question {currentIndex + 1}</CardTitle>
                <span className="text-xs font-medium text-muted-foreground bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
                    {questions[currentIndex].type}
                </span>
            </div>
          </CardHeader>
          
          <div className="flex-1 overflow-y-auto bg-white/50">
            <div className="p-6 space-y-6">
                
                {/* --- SECTION DISPLAY (Instruction/Passage) --- */}
                {currentQuestion.section && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Instruction</span>
                        </div>
                        <SafeHTML 
                           html={currentQuestion.section.instruction} 
                           className="text-sm font-medium text-slate-800 mb-2 prose prose-sm max-w-none" 
                        />
                        {currentQuestion.section.passage && (
                             <div className="border-t border-slate-200 pt-2 mt-2">
                                <SafeHTML 
                                   html={currentQuestion.section.passage} 
                                   className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                                />
                             </div>
                        )}
                    </div>
                )}

                {/* --- IMAGE DISPLAY --- */}
                {currentQuestion.imageUrl && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-slate-200">
                        <img 
                            src={currentQuestion.imageUrl} 
                            alt="Question Diagram" 
                            className="w-full h-auto max-h-64 object-contain bg-slate-50"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'; // Hide broken images
                            }}
                        />
                    </div>
                )}

                {/* --- QUESTION TEXT (Sanitized HTML) --- */}
                <SafeHTML 
                    html={currentQuestion.text} 
                    className="prose prose-slate prose-sm md:prose-base max-w-none text-foreground leading-relaxed font-medium"
                />
                
                {/* --- OBJECTIVE OPTIONS --- */}
                {currentQuestion.type === 'OBJECTIVE' && (
                    <RadioGroup
                        value={currentAnswer}
                        onValueChange={(optionId) => selectAnswer(currentQuestion.id, optionId)}
                        className="space-y-3"
                    >
                    {currentQuestion.options.map((option, index) => (
                        <div 
                            key={option.id} 
                            className={cn(
                                "flex items-start space-x-3 p-3 md:p-4 rounded-xl border cursor-pointer transition-all duration-200 relative overflow-hidden group",
                                currentAnswer === option.id 
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" 
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            )}
                            onClick={() => selectAnswer(currentQuestion.id, option.id)}
                        >
                        <RadioGroupItem value={option.id} id={option.id} className="mt-1 border-slate-400 text-primary" />
                        <label htmlFor={option.id} className="flex-1 cursor-pointer leading-snug text-slate-700 group-hover:text-slate-900">
                            <div className="flex gap-2">
                                <span className="font-bold mr-1 text-slate-400 group-hover:text-slate-500 shrink-0 pt-0.5">{String.fromCharCode(65 + index)}.</span>
                                {/* --- OPTION TEXT (Sanitized HTML) --- */}
                                <SafeHTML html={option.text} className="text-sm md:text-base" />
                            </div>
                        </label>
                        </div>
                    ))}
                    </RadioGroup>
                )}

                {/* --- THEORY INPUT --- */}
                {currentQuestion.type === 'THEORY' && (
                    <div className="space-y-4">
                        <Textarea 
                            value={theoryText} 
                            onChange={(e) => handleTheoryChange(e.target.value)} 
                            placeholder="Type your answer here..." 
                            className="min-h-[200px] font-mono text-sm bg-white focus:ring-primary"
                        />
                        
                        {/* AI Grading Button (Practice Mode Only) */}
                        {mode === 'PRACTICE' && (
                            <div className="flex items-center gap-4">
                                <Button 
                                    onClick={handleGradeTheory} 
                                    disabled={gradingLoading || !theoryText} 
                                    variant="secondary"
                                    className="w-full md:w-auto"
                                >
                                    {gradingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2 text-purple-500"/>}
                                    Grade with Gemini
                                </Button>
                            </div>
                        )}

                        {/* AI Feedback Display */}
                        {aiGrading && (
                            <Alert className={aiGrading.isCorrect ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}>
                                {aiGrading.isCorrect ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-orange-600" />}
                                <AlertTitle className={aiGrading.isCorrect ? "text-green-800" : "text-orange-800"}>
                                    {aiGrading.isCorrect ? `Pass (${aiGrading.score}%)` : `Needs Improvement (${aiGrading.score}%)`}
                                </AlertTitle>
                                <AlertDescription className="mt-2 text-sm text-slate-700">
                                    {aiGrading.feedback}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

            </div>
          </div>

          <CardFooter className="flex flex-col gap-4 pt-6 pb-6 border-t bg-white border-slate-100 z-10 flex-shrink-0">
            <div className="flex justify-between w-full">
                <Button 
                    variant="outline" 
                    onClick={prevQuestion} 
                    disabled={currentIndex === 0}
                    className="w-32"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>

                {isLastQuestion ? (
                    <Button 
                        onClick={() => setIsSubmitDialogOpen(true)} 
                        className="w-32 bg-green-600 hover:bg-green-700 text-white"
                    >
                        Finish
                    </Button>
                ) : (
                    <Button 
                        onClick={nextQuestion} 
                        className="w-32"
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                )}
            </div>
            
            {/* Secondary Link to Submit Early */}
            {!isLastQuestion && (
                <button 
                    onClick={() => setIsSubmitDialogOpen(true)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center w-full py-2"
                >
                    <Flag className="w-3 h-3 mr-1" /> Submit Exam Early
                </button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex w-80 border-l bg-white p-6 flex-col shadow-sm z-10 h-screen sticky top-0 overflow-hidden">
        <NavigatorContent />
      </aside>

      {/* --- Submit Dialog --- */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Quiz?</DialogTitle>
              <DialogDescription>
                You have answered <span className="font-bold text-foreground">{answeredCount}</span> out of <span className="font-bold text-foreground">{totalQuestions}</span> questions. 
                {mode === 'EXAM' ? ' This will end your timed session immediately.' : ' Are you ready to see your results?'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsSubmitDialogOpen(false)}>Keep working</Button>
              <Button variant="destructive" onClick={handleSubmit}>Yes, Submit</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}