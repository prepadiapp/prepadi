'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useQuizStore, SanitizedQuestion, QuizMode } from '@/stores/quizStore';
import { useTimer } from 'react-timer-hook';
import { Button } from '@/components/ui/button';
import {
  Card, CardHeader,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft, ChevronRight, Flag, Loader2, Timer, AlertCircle, Menu, BookOpen, Sparkles, Check, X, WifiOff, ZoomIn, CheckCircle2, XCircle
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify'; 
import { toast } from 'sonner';
import { saveOfflineAttempt } from '@/lib/offline-storage';
import { clearQuizProgress, createQuizProgressIdentity, getQuizProgressKey, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress';

interface QuizClientProps {
  initialQuestions: SanitizedQuestion[];
  quizDetails: {
    examName: string;
    subjectName: string;
    year: number | string;
  };
  mode: QuizMode | string;
  initialDuration: number;
  assignmentId?: string | null; // Allow null
  userId: string;
  isOffline?: boolean;
}

function QuizTimer({ expiryTimestamp, onExpire }: { expiryTimestamp: Date; onExpire: () => void }) {
  const { seconds, minutes, hours } = useTimer({
    expiryTimestamp, 
    onExpire
  });

  const fHours = String(hours).padStart(2, '0');
  const fMinutes = String(minutes).padStart(2, '0');
  const fSeconds = String(seconds).padStart(2, '0');
  
  const timerColor = minutes < 5 && hours === 0 ? 'text-red-500' : 'text-primary';

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1.5 font-mono text-sm font-bold tabular-nums sm:text-base ${timerColor}`}>
      <Timer className="h-4 w-4" />
        <span>{fHours}:{fMinutes}:{fSeconds}</span>
    </div>
  );
}

function SafeHTML({ html, className }: { html: string; className?: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html);
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
    />
  );
}

export function QuizClient({ initialQuestions, quizDetails, mode, initialDuration, assignmentId, userId, isOffline = false }: QuizClientProps) {
  const router = useRouter();
  
  const {
    status, questions, currentIndex, answers, startTime, expiresAt,
    startQuiz, selectAnswer, goToQuestion, nextQuestion, prevQuestion, finishQuiz, resetQuiz, 
  } = useQuizStore();

  const [isMounted, setIsMounted] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState<Date | null>(null);
  const [isSubmitting, setLocalIsSubmitting] = useState(false); 
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  
  // Offline Success Modal State
  const [isOfflineSuccessOpen, setIsOfflineSuccessOpen] = useState(false);
  const [offlineScore, setOfflineScore] = useState(0);

  const [theoryText, setTheoryText] = useState('');
  const [aiGrading, setAiGrading] = useState<any>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportedQuestionIds, setReportedQuestionIds] = useState<string[]>([]);

  // Practice-mode instant check: per-question reveal recorded after answering.
  const [revealed, setRevealed] = useState<
    Record<string, { correctOptionId: string | null; pickedCorrect: boolean; explanation: string }>
  >({});
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // Practice-mode answering with instant check. Records the answer first,
  // then asks the server for the verdict (exam mode stays blind).
  // Once revealed, a question is locked.
  const handleSelectOption = useCallback((questionId: string, optionId: string) => {
      const target = questions.find((q) => q.id === questionId);
      if (!target || target.type !== 'OBJECTIVE') {
        selectAnswer(questionId, optionId);
        return;
      }
      if (revealed[questionId]) return;
      selectAnswer(questionId, optionId);
      if (mode !== 'PRACTICE') return;
      setCheckingId(optionId);
      fetch('/api/quiz/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId, optionId }),
      })
        .then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        })
        .then((data) => {
            setRevealed((prev) => ({
                ...prev,
                [questionId]: {
                    correctOptionId: data.correctOptionId ?? null,
                    pickedCorrect: !!data.correct,
                    explanation: typeof data.explanation === 'string' ? data.explanation : '',
                },
            }));
        })
        .catch(() => {
            toast.error('Could not check that answer. Continuing without instant feedback.');
        })
        .finally(() => {
            setCheckingId(null);
        });
  }, [mode, questions, revealed, selectAnswer]);

  // Inner scroll region for the question content. Reset to top on every
  // question change so a new question never loads at the old scroll offset.
  // `showScrollHint` signals overflow so users can discover hidden content.
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => {
      setShowScrollHint(el.scrollHeight - el.scrollTop - el.clientHeight > 24);
    };
    update();
    const raf = requestAnimationFrame(update);
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [currentIndex]);

  const progressIdentity = useMemo(() => createQuizProgressIdentity({
    userId,
    assignmentId,
    examName: quizDetails.examName,
    subjectName: quizDetails.subjectName,
    year: quizDetails.year,
    mode: mode === 'PRACTICE' ? 'PRACTICE' : 'EXAM',
  }), [userId, assignmentId, quizDetails.examName, quizDetails.subjectName, quizDetails.year, mode]);
  const progressKey = useMemo(() => getQuizProgressKey(progressIdentity, initialQuestions), [progressIdentity, initialQuestions]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (
      status !== 'active' ||
      isSubmitDialogOpen ||
      isReportDialogOpen ||
      previewImage ||
      isOfflineSuccessOpen
    ) return;

    const handleQuizShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')
      ) return;

      const key = event.key.toLowerCase();
      if (key === 'enter' && target?.closest('button, a, [role="button"]')) return;
      const question = questions[currentIndex];
      let handled = true;

      if (/^[a-d]$/.test(key) && question?.type === 'OBJECTIVE') {
        const option = question.options[key.charCodeAt(0) - 97];
        if (option) handleSelectOption(question.id, option.id);
        else handled = false;
      } else if (key === 'n') {
        nextQuestion();
      } else if (key === 'p') {
        prevQuestion();
      } else if (key === 's') {
        setIsSubmitDialogOpen(true);
      } else if (key === 'enter') {
        if (currentIndex === questions.length - 1) setIsSubmitDialogOpen(true);
        else nextQuestion();
      } else {
        handled = false;
      }

      if (handled) event.preventDefault();
    };

    window.addEventListener('keydown', handleQuizShortcut);
    return () => window.removeEventListener('keydown', handleQuizShortcut);
  }, [
    status,
    isSubmitDialogOpen,
    isReportDialogOpen,
    previewImage,
    isOfflineSuccessOpen,
    questions,
    currentIndex,
    selectAnswer,
    handleSelectOption,
    nextQuestion,
    prevQuestion,
  ]);

  useEffect(() => {
    if (!isOnline) setIsReportDialogOpen(false);
  }, [isOnline]);

  useEffect(() => {
    const duration = initialDuration || 60; 
    const savedProgress = loadQuizProgress(progressKey, progressIdentity, initialQuestions, mode === 'PRACTICE' ? 'PRACTICE' : 'EXAM');
    startQuiz(initialQuestions, mode as QuizMode, duration, savedProgress ?? undefined);
    setExpiryTimestamp(savedProgress?.expiresAt ?? (mode === 'PRACTICE' ? null : new Date(Date.now() + duration * 60 * 1000)));
    if (savedProgress) toast.info('Your saved quiz progress has been restored.');
    setProgressReady(true);
    
    setIsMounted(true);
    return () => resetQuiz(); 
  }, [initialQuestions, startQuiz, resetQuiz, mode, initialDuration, progressKey, progressIdentity]);

  useEffect(() => {
    if (!progressReady || status !== 'active' || !startTime) return;
    saveQuizProgress(progressKey, progressIdentity, questions, answers, currentIndex, startTime, expiresAt);
  }, [progressReady, status, progressKey, progressIdentity, questions, answers, currentIndex, startTime, expiresAt]);

  useEffect(() => {
    if (questions[currentIndex]) {
       setTheoryText(answers.get(questions[currentIndex].id) || '');
       setAiGrading(null); 
    }
  }, [currentIndex, questions, answers]);

  useEffect(() => {
    if (status === 'finished' && !isSubmitting) {
      handleSubmit();
    }
  }, [status]); 

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
  
  const handleSubmit = useCallback(async () => {
        if (isSubmitting) return;
        setLocalIsSubmitting(true);
        setSubmitError(null);

        try {
          const timeTaken = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000) : 0;
          const answersArray = Array.from(answers.entries());

          // --- OFFLINE SUBMISSION BLOCK START ---
          if (isOffline) {
            let correctCount = 0;
            let totalObjective = 0;

            // CORRECT SCORING LOGIC: Iterate over ALL questions to find total objective count
            questions.forEach((question) => {
              if (question.type === 'OBJECTIVE') {
                totalObjective++;
                
                const userAnswer = answers.get(question.id);
                // Only check correctness if user provided an answer
                if (userAnswer) {
                  const options = (question as any).options || [];
                  const selectedOption = options.find((opt: any) => opt.id === userAnswer);
                  if (selectedOption?.isCorrect) {
                    correctCount++;
                  }
                }
              }
            });

            // Calculate percentage based on TOTAL possible objective questions
            const score = totalObjective > 0 
              ? Math.round((correctCount / totalObjective) * 100) 
              : 0;

            await saveOfflineAttempt({
              examKey: `${quizDetails.examName}-${quizDetails.subjectName}-${quizDetails.year}`,
              answers: Array.from(answers.entries()), 
              timeTaken,
              score, 
              userId,
              questionIds: questions.map(q => q.id), // NEW: Save ALL question IDs for sync
              assignmentId: assignmentId || null, 
            });

            clearQuizProgress(progressKey);

            setOfflineScore(score);
            setIsSubmitDialogOpen(false);
            setIsOfflineSuccessOpen(true);
            
            return; 
          }
          // --- OFFLINE SUBMISSION BLOCK END ---

          const questionIds = questions.map(q => q.id);

          const response = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answers: answersArray,
              questionIds: questionIds,
              timeTaken: timeTaken,
              assignmentId, 
              paperId: quizDetails.subjectName, 
            }),
          });

          if (!response.ok) throw new Error('Failed to submit');
          const result = await response.json();
          clearQuizProgress(progressKey);
          router.push(`/dashboard/results/${result.attemptId}`);
        } catch (error: any) {
          setSubmitError(error.message);
          setLocalIsSubmitting(false);
          toast.error("Submission failed. Please try again.");
        }
  }, [answers, questions, startTime, assignmentId, isSubmitting, router, quizDetails, isOffline, userId, progressKey]);

  const handleOfflineExit = () => {
      router.push('/dashboard/offline');
  };

  if (!isMounted || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Preparing your exam...</p>
      </div>
    );
  }

  if (status === 'finished' && submitError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <AlertTitle>Submission Error</AlertTitle>
          <AlertDescription className="mb-4">{submitError}</AlertDescription>
          <Button onClick={handleSubmit} className="w-full">Retry Submission</Button>
        </Alert>
      </div>
    );
  }

  if (status === 'finished' && !isOfflineSuccessOpen) {
      return (
        <div className="flex items-center justify-center min-h-screen flex-col">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Submitting your answers...</p>
        </div>
      );
  }

  const currentQuestion = questions[currentIndex];
  const questionImages = [
    currentQuestion.section?.imageUrl ? { src: currentQuestion.section.imageUrl, alt: 'Section instruction image' } : null,
    currentQuestion.imageUrl ? { src: currentQuestion.imageUrl, alt: 'Question illustration' } : null,
  ].filter((image): image is { src: string; alt: string } => Boolean(image));
  const currentAnswer = answers.get(currentQuestion.id);
  const practiceReveal =
    mode === 'PRACTICE' && currentQuestion.type === 'OBJECTIVE'
      ? revealed[currentQuestion.id]
      : undefined;
  const totalQuestions = questions.length;
  const answeredCount = answers.size;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const canReportQuestion = isOnline && !isOffline;
  const hasReportedCurrentQuestion = reportedQuestionIds.includes(currentQuestion.id);

  const handleReportQuestion = async () => {
    if (!canReportQuestion || isReporting || hasReportedCurrentQuestion) return;

    setIsReporting(true);
    try {
      const response = await fetch('/api/quiz/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          assignmentId,
          comment: reportComment,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Could not send report');
      }

      setReportedQuestionIds((previous) => [...previous, currentQuestion.id]);
      setReportComment('');
      setIsReportDialogOpen(false);
      toast.success('Question reported for review');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  const NavigatorContent = () => (
    <div className="flex h-full min-h-0 flex-col">
        <div className="mb-4 flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0000FE]">Exam progress</p>
              <h3 className="mt-1 text-base font-semibold tracking-tight text-slate-900">Question navigator</h3>
            </div>
            <span className="rounded-full bg-[#F1F4FF] px-2.5 py-1 text-xs font-semibold tabular-nums text-[#0000CC]">
              {answeredCount}<span className="mx-0.5 text-slate-400">/</span>{totalQuestions}
            </span>
          </div>
          <Progress value={totalQuestions ? (answeredCount / totalQuestions) * 100 : 0} className="mt-3 h-1.5 bg-slate-100 [&>div]:bg-[#0000FE]" />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Answered</span>
            <span>{totalQuestions - answeredCount} remaining</span>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 px-1 text-[11px] font-medium text-slate-600" aria-label="Question status legend">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#0000FE]" />Current</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-[#C7D4FF] bg-[#E8EDFF]" />Answered</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" />To do</span>
        </div>
        
        <ScrollArea className="-mx-1 min-h-0 flex-1 px-1">
          <div className="grid grid-cols-5 gap-2 pb-4 sm:grid-cols-6">
            {questions.map((q, index) => {
                const isAnswered = answers.has(q.id);
                const isCurrent = currentIndex === index;
                return (
                  <Button
                    key={q.id}
                    type="button"
                    variant="outline"
                    className={cn(
                        'relative h-10 w-full rounded-xl p-0 text-sm font-semibold tabular-nums transition-all duration-150',
                        isCurrent && 'border-[#0000FE] bg-[#0000FE] text-white shadow-[0_6px_14px_rgba(0,0,254,0.2)] ring-2 ring-[#0000FE]/15 ring-offset-1 hover:bg-[#0000CC] hover:text-white',
                        isAnswered && !isCurrent && 'border-[#DCE4FF] bg-[#EEF2FF] text-[#172B8A] hover:border-[#BAC8FF] hover:bg-[#E4EAFE]',
                        !isAnswered && !isCurrent && 'border-slate-200 bg-white text-slate-600 hover:border-[#AAB9FF] hover:bg-[#F6F8FF] hover:text-slate-950'
                    )}
                    onClick={() => goToQuestion(index)}
                    aria-label={`Question ${index + 1}${isAnswered ? ', Answered' : ', To do'}${isCurrent ? ', Current' : ''}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    title={`Question ${index + 1} · ${isCurrent ? 'Current' : isAnswered ? 'Answered' : 'To do'}`}
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
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[#F8FAFC] md:flex-row">
      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden p-2 sm:p-3">
        <header className="mb-2 flex flex-shrink-0 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.045)] sm:px-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#DCE4FF] bg-[#F5F7FF] px-2.5 py-1 text-[10px] font-semibold text-[#0000CC] sm:text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              {mode === 'PRACTICE' ? 'Practice mode' : 'Student CBT'}
            </span>
            <h1 className="min-w-0 flex-1 truncate text-xs font-bold leading-tight text-slate-900 sm:text-sm">
              {quizDetails.examName}
              <span className="font-medium text-slate-500"> • {quizDetails.subjectName} • {quizDetails.year}</span>
            </h1>
            <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-xs', isOffline ? 'border-amber-200 bg-amber-50 text-amber-800' : isOnline ? 'border-[#DCE4FF] bg-[#EEF2FF] text-[#0000CC]' : 'border-slate-200 bg-slate-50 text-slate-500')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', isOffline ? 'bg-amber-500' : isOnline ? 'bg-[#0000FE]' : 'bg-slate-400')} />
              {isOffline ? 'Offline mode' : isOnline ? 'Online' : 'Connecting'}
            </span>
            {mode === 'EXAM' && expiryTimestamp && <QuizTimer expiryTimestamp={expiryTimestamp} onExpire={finishQuiz} />}
            <div className="shrink-0 md:hidden">
              <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="outline" className="h-8 gap-2 rounded-full border-slate-200 bg-white px-2.5 shadow-sm">
                        <span className="text-[11px] font-semibold tabular-nums text-[#0000FE]">{currentIndex + 1}/{totalQuestions}</span>
                        <Menu className="h-4 w-4" />
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 gap-3 bg-[#F8FAFC] p-4 sm:w-96 sm:p-5">
                      <SheetHeader className="mb-1 text-left">
                          <SheetTitle>Quiz Overview</SheetTitle>
                      </SheetHeader>
                      <NavigatorContent />
                  </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Progress value={totalQuestions ? ((currentIndex + 1) / totalQuestions) * 100 : 0} className="h-1 flex-1 bg-slate-100 [&>div]:bg-[#0000FE]" aria-label="Question progress" />
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[#0000CC] sm:text-xs">Q.{currentIndex + 1} of {totalQuestions}</span>
          </div>
        </header>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.07)] sm:rounded-3xl">
          <CardHeader className="flex-shrink-0 border-b border-slate-100 bg-white px-3 py-1 sm:px-4">
            <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-bold tracking-tight text-slate-900">
                  Q{currentIndex + 1}
                  <span className="ml-1.5 rounded-full border border-[#DCE4FF] bg-[#F5F7FF] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-[#45527A]">
                      {questions[currentIndex].type}
                  </span>
                </p>
                {canReportQuestion && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-full text-slate-400 hover:text-amber-600"
                    onClick={() => setIsReportDialogOpen(true)}
                    disabled={isReporting || hasReportedCurrentQuestion}
                    aria-label={hasReportedCurrentQuestion ? 'Question reported' : 'Report this question'}
                    title={hasReportedCurrentQuestion ? 'Question reported' : 'Report this question'}
                  >
                    {hasReportedCurrentQuestion
                      ? <Check className="h-3.5 w-3.5" />
                      : <Flag className="h-3.5 w-3.5" />}
                  </Button>
                )}
            </div>
          </CardHeader>
          
          <div
            ref={contentRef}
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white"
            style={
              showScrollHint
                ? {
                    WebkitMaskImage:
                      'linear-gradient(to bottom, black calc(100% - 3.5rem), transparent 100%)',
                    maskImage:
                      'linear-gradient(to bottom, black calc(100% - 3.5rem), transparent 100%)',
                  }
                : undefined
            }
          >
            <div className="space-y-3 p-3 pb-20 sm:space-y-4 sm:p-5 sm:pb-24">
                <div className={cn('grid gap-3 rounded-2xl border border-[#DDE6FF] bg-[#F5F8FF] p-3 sm:gap-4 sm:p-4', questionImages.length > 0 && 'lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] lg:items-start')}>
                  <div className="min-w-0 space-y-2">
                    {currentQuestion.section && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-2.5">
                        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Instruction</span>
                        </div>
                        <SafeHTML 
                           html={currentQuestion.section.instruction} 
                           className="text-sm font-medium text-slate-800 mb-2 prose prose-sm max-w-none" 
                        />
                        {currentQuestion.section.passage && (
                             <div className="mt-1.5 border-t border-slate-200 pt-1.5">
                                <SafeHTML 
                                   html={currentQuestion.section.passage} 
                                   className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none"
                                />
                             </div>
                        )}
                    </div>
                    )}

                    <SafeHTML
                      html={currentQuestion.text}
                      className="prose prose-slate prose-sm max-w-none text-foreground leading-snug font-medium sm:leading-relaxed"
                    />
                  </div>

                  {questionImages.length > 0 && (
                    <div className={cn('grid gap-2', questionImages.length > 1 && 'sm:grid-cols-2 lg:grid-cols-1')}>
                      {questionImages.map((image) => (
                        <button
                          key={image.src}
                          type="button"
                          onClick={() => setPreviewImage(image)}
                          aria-label={`Enlarge ${image.alt.toLowerCase()}`}
                          className="group relative flex min-h-24 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#DCE4FF] bg-white p-2 text-left shadow-sm transition hover:border-[#AAB9FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FE]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.src}
                            alt={image.alt}
                            className="max-h-28 w-full object-contain sm:max-h-32 lg:max-h-36"
                            onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                          />
                          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition group-hover:bg-white">
                            <ZoomIn className="h-3 w-3" /> Enlarge
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {currentQuestion.type === 'OBJECTIVE' && (
                    <RadioGroup
                        value={currentAnswer}
                        onValueChange={(optionId) => handleSelectOption(currentQuestion.id, optionId)}
                        className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
                    >
                    {currentQuestion.options.map((option, index) => (
                        <div 
                            key={option.id} 
                            className={cn(
                                "group relative flex min-h-12 items-center gap-2 overflow-hidden rounded-2xl border p-2.5 transition-all duration-150 focus-within:ring-2 focus-within:ring-[#0000FE]/30 sm:p-3",
                                !practiceReveal
                                ? currentAnswer === option.id 
                                  ? "cursor-pointer border-[#0000FE] bg-[#EEF0FF] text-[#0000CC] shadow-[0_4px_14px_rgba(0,0,254,0.08)] ring-1 ring-[#0000FE]"
                                  : "cursor-pointer border-[#DDE5F4] bg-white hover:border-[#AAB9FF] hover:bg-[#F8FAFF]"
                                : option.id === practiceReveal.correctOptionId
                                  ? "border-green-500 bg-green-50 text-green-900 ring-1 ring-green-500"
                                  : option.id === currentAnswer
                                    ? "border-red-400 bg-red-50 text-red-900"
                                    : "border-slate-200 bg-white opacity-60"
                            )}
                            onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                        >
                        <RadioGroupItem value={option.id} id={option.id} className="sr-only" />
                        <label htmlFor={option.id} className={cn("flex-1 leading-snug", practiceReveal ? "cursor-default" : "cursor-pointer text-slate-700 group-hover:text-slate-900")}>
                            <div className="flex gap-1.5">
                                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                  practiceReveal
                                    ? option.id === practiceReveal.correctOptionId
                                      ? 'bg-green-600 text-white'
                                      : option.id === currentAnswer
                                        ? 'bg-red-500 text-white'
                                        : 'bg-slate-100 text-slate-500'
                                    : currentAnswer === option.id ? 'bg-[#0000FE] text-white' : 'bg-[#EAF0FF] text-[#5B6B94]')}>
                                  {checkingId === option.id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : String.fromCharCode(65 + index)}
                                </span>
                                <SafeHTML html={option.text} className="text-[13px] leading-snug sm:text-sm" />
                            </div>
                        </label>
                        </div>
                    ))}
                    </RadioGroup>
                )}

                {practiceReveal && (
                    <div
                        aria-live="polite"
                        className={cn(
                            "rounded-2xl border p-3 sm:p-4",
                            practiceReveal.pickedCorrect
                              ? "border-green-200 bg-green-50/70"
                              : "border-amber-200 bg-amber-50/70"
                        )}
                    >
                        <p className={cn(
                            "flex items-center gap-1.5 text-sm font-bold",
                            practiceReveal.pickedCorrect ? "text-green-800" : "text-amber-800"
                        )}>
                            {practiceReveal.pickedCorrect ? (
                                <><CheckCircle2 className="h-4 w-4" /> Correct — well done!</>
                            ) : (
                                <><XCircle className="h-4 w-4" /> Not quite — the correct answer is highlighted above.</>
                            )}
                        </p>
                        {practiceReveal.explanation ? (
                            <SafeHTML html={practiceReveal.explanation} className="mt-1.5 text-sm leading-relaxed text-slate-700 [&_p]:my-1" />
                        ) : null}
                    </div>
                )}

                {currentQuestion.type === 'THEORY' && (
                    <div className="space-y-4">
                        <Textarea 
                            value={theoryText} 
                            onChange={(e) => handleTheoryChange(e.target.value)} 
                            placeholder="Type your answer here..." 
                            className="min-h-[200px] font-mono text-sm bg-white focus:ring-primary"
                        />
                        
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
        </Card>

        {/* Floating nav pill — overlays the card so the full height is Q&A */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3 sm:bottom-4">
          <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur">
            <Button
                type="button"
                variant="ghost"
                onClick={prevQuestion}
                disabled={currentIndex === 0}
                className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-40"
                aria-label="Previous question"
            >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Prev</span>
            </Button>

            {!isLastQuestion && (
              <button
                  type="button"
                  onClick={() => setIsSubmitDialogOpen(true)}
                  title="Submit exam early"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-destructive"
              >
                  <Flag className="h-3 w-3" />
                  <span className="hidden min-[420px]:inline">Submit early</span>
                  <span className="min-[420px]:hidden">Submit</span>
              </button>
            )}

            {isLastQuestion ? (
                <Button
                    type="button"
                    onClick={() => setIsSubmitDialogOpen(true)}
                    className="h-8 shrink-0 rounded-full bg-[#0000FE] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#0000CC]"
                >
                    Finish
                </Button>
            ) : (
                <Button
                    type="button"
                    className="h-8 shrink-0 rounded-full bg-[#0000FE] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#0000CC]"
                    onClick={nextQuestion}
                    aria-label="Next question"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
            )}
          </div>
        </div>
      </div>
      
      <aside className="z-10 hidden h-screen w-[19rem] flex-col overflow-hidden border-l border-slate-200/80 bg-[#F8FAFC] p-4 shadow-[-8px_0_24px_rgba(15,23,42,0.03)] md:sticky md:top-0 md:flex">
        <NavigatorContent />
      </aside>

      <Dialog open={isReportDialogOpen} onOpenChange={(open) => setIsReportDialogOpen(open && canReportQuestion)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Question {currentIndex + 1}</DialogTitle>
            <DialogDescription>
              Tell the review team what may be wrong. Your comment is optional and will be attached to this question.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={reportComment}
              onChange={(event) => setReportComment(event.target.value.slice(0, 500))}
              placeholder="For example: the answer options seem incorrect…"
              className="min-h-28 resize-y"
              maxLength={500}
              disabled={isReporting}
            />
            <p className="text-right text-xs text-muted-foreground">{reportComment.length}/500</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setIsReportDialogOpen(false)} disabled={isReporting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleReportQuestion} disabled={isReporting || !canReportQuestion}>
              {isReporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
              {isReporting ? 'Sending…' : 'Send report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
        <DialogContent className="max-w-[min(96vw,1200px)] border-slate-200 bg-white p-2 sm:p-4">
          <DialogHeader className="px-1 sm:px-0">
            <DialogTitle>{previewImage?.alt || 'Question image'}</DialogTitle>
            <DialogDescription>Image preview. Press Escape or close this window to return to the question.</DialogDescription>
          </DialogHeader>
          {previewImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewImage.src} alt={previewImage.alt} className="max-h-[78dvh] w-full rounded-md bg-slate-50 object-contain" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Quiz?</DialogTitle>
              <DialogDescription>
                You have answered <span className="font-bold text-foreground">{answeredCount}</span> out of <span className="font-bold text-foreground">{totalQuestions}</span> questions. 
                {mode === 'EXAM' ? ' This will end your timed session immediately.' : ' Are you ready to see your results?'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3 sm:gap-3">
              <Button variant="ghost" onClick={() => setIsSubmitDialogOpen(false)}>Keep working</Button>
              <Button variant="destructive" onClick={handleSubmit}>Yes, Submit</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offline Success Dialog */}
      <Dialog open={isOfflineSuccessOpen} onOpenChange={setIsOfflineSuccessOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <WifiOff className="w-5 h-5 text-slate-500"/> 
                Exam Completed Offline!
              </DialogTitle>
              <DialogDescription className="pt-2">
                Your exam data has been saved locally on this device.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-green-600">{offlineScore}%</span>
                <span className="text-xs text-muted-foreground mt-1">Approximate Objective Score</span>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={handleOfflineExit} className="w-full">
                Go to Offline Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
