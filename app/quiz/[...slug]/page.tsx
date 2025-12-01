import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { questionService } from '@/lib/question-service/question-service';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { QuizClient } from '@/components/QuizClient';
import { SanitizedQuestion, QuizMode } from '@/stores/quizStore';
import { Question, Option, Section } from '@prisma/client'; 
import { verifyUserAccess } from '@/lib/access-control';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface QuizPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ mode?: string }>;
}

type QuestionWithRelations = Question & {
    options: Option[];
    section: Section | null;
};

async function getQuizData(slug: string[] | undefined) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      redirect('/login');
    }

    if (!slug || slug.length !== 3) {
      throw new Error('Invalid quiz URL.');
    }

    const [examSlug, subjectSlug, yearStr] = slug;
    const year = parseInt(yearStr);

    if (isNaN(year)) throw new Error('Invalid year.');

    const exam = await prisma.exam.findFirst({
      where: { shortName: { equals: examSlug, mode: 'insensitive' } },
    });

    const subject = await prisma.subject.findFirst({
      where: {
        name: {
          equals: subjectSlug.replace(/-/g, ' '),
          mode: 'insensitive',
        },
      },
    });

    if (!exam || !subject) {
      throw new Error(`Exam type or Subject not found.`);
    }

    // --- NEW: Check Plan Permissions ---
    const access = await verifyUserAccess(session.user.id, {
        examId: exam.id,
        subjectId: subject.id,
        year: year
    });

    if (!access.allowed) {
        // Throw a specific error to handle in UI
        throw new Error(`ACCESS_DENIED:${access.reason}`);
    }
    // -----------------------------------

    const questions = (await questionService.getQuestions(
        exam.id, 
        subject.id, 
        year
    )) as QuestionWithRelations[];

    if (questions.length === 0) {
      throw new Error('No questions found.');
    }

    const sanitizedQuestions: SanitizedQuestion[] = questions.map((q) => ({
      id: q.id,
      text: q.text,
      year: q.year,
      type: q.type,
      imageUrl: q.imageUrl,
      sectionId: q.sectionId,
      section: q.section ? {
        instruction: q.section.instruction,
        passage: q.section.passage,
      } : null,
      options: q.options.map((opt: Option) => ({
        id: opt.id,
        text: opt.text,
      })),
    }));
    
    return {
      data: {
        questions: sanitizedQuestions,
        quizDetails: {
          examName: exam.name,
          subjectName: subject.name,
          year: year,
        },
      },
      error: null,
    };

  } catch (error: any) {
    // Preserve the specific access denied message if present
    const msg = error.message || 'An unknown error occurred.';
    return {
      data: null,
      error: msg,
    };
  }
}

export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { data, error } = await getQuizData(resolvedParams.slug);
  
  const modeParam = resolvedSearchParams.mode?.toUpperCase();
  const mode: QuizMode = modeParam === 'PRACTICE' ? 'PRACTICE' : 'EXAM';

  if (error) {
    // Check if it's an access denied error to show a better UI
    const isAccessDenied = error.startsWith('ACCESS_DENIED:');
    const cleanError = isAccessDenied ? error.replace('ACCESS_DENIED:', '') : error;

    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-muted/20">
        <Alert variant="destructive" className="max-w-lg shadow-lg bg-white">
          {isAccessDenied ? <Lock className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <AlertTitle className="text-lg font-semibold mb-2">
            {isAccessDenied ? 'Plan Restriction' : 'Error Loading Quiz'}
          </AlertTitle>
          <AlertDescription className="text-base text-muted-foreground mb-4">
            {cleanError}
          </AlertDescription>
          {isAccessDenied && (
              <Button asChild variant="default" className="w-full">
                  <Link href="/dashboard/billing">Upgrade Plan</Link>
              </Button>
          )}
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading quiz...</p>
      </div>
    );
  }

  return (
    <QuizClient
      initialQuestions={data.questions}
      quizDetails={data.quizDetails}
      mode={mode}
    />
  );
}