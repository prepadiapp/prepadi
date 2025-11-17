import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { questionService } from '@/lib/question-service/question-service';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { QuizClient } from '@/components/QuizClient';
import { SanitizedQuestion } from '@/stores/quizStore';


interface QuizPageProps {
  params: Promise<{
    slug?: string[]; // e.g., ['waec', 'mathematics', '2023']
  }>;
}

/**
 * Fetches and validates all the data needed for the quiz.
 * This function runs entirely on the server.
 */
async function getQuizData(slug: string[] | undefined) {
  try {
    // 1. Validate user
    const session = await getAuthSession();
    if (!session?.user) {
      redirect('/login');
    }

    // 2. Validate slug
    if (!slug) {
      throw new Error('Invalid quiz URL. No quiz parameters were provided.');
    }

    if (slug.length !== 3) {
      throw new Error('Invalid quiz URL. Expected /quiz/[exam]/[subject]/[year]');
    }

    const [examSlug, subjectSlug, yearStr] = slug;
    const year = parseInt(yearStr);

    if (isNaN(year)) {
      throw new Error('Invalid year in URL.');
    }

    // 3. Find IDs from DB (case-insensitive)
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

    if (!exam) {
      throw new Error(`Exam type "${examSlug}" not found.`);
    }
    if (!subject) {
      throw new Error(`Subject "${subjectSlug.replace(/-/g, ' ')}" not found.`);
    }

    // 4. Call our "Smart" Question Service
    const questions = await questionService.getQuestions(exam.id, subject.id, year);

    if (questions.length === 0) {
      throw new Error('No questions could be found for this selection. Please try a different year or subject.');
    }

    // 5. Sanitize the questions
    const sanitizedQuestions: SanitizedQuestion[] = questions.map((q) => ({
      id: q.id,
      text: q.text,
      year: q.year,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
      })),
    }));
    
    // 6. Return all data
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
    console.error('[QUIZ_PAGE_ERROR]', error);
    return {
      data: null,
      error: error.message || 'An unknown error occurred.',
    };
  }
}

/**
 * This is the main Server Component page for the quiz.
 */
export default async function QuizPage({ params }: QuizPageProps) {
  // --- THIS IS THE FIX ---
  // We MUST await the params promise to resolve it,
  // just as you did with your verify route.
  const resolvedParams = await params;
  // --- END FIX ---
  
  console.log(
    `[QuizPage Server Component] Page loading. Received params:`,
    JSON.stringify(resolvedParams, null, 2)
  );
  
  // We now pass the resolved slug to our data function
  const { data, error } = await getQuizData(resolvedParams.slug);

  // If there was an error, show an error message
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Quiz</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle the case where the slug was valid but data fetching failed
  // (This is now redundant because getQuizData handles undefined slug)
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading quiz...</p>
      </div>
    );
  }

  // If data is loaded, pass it to the Client Component
  return (
    <QuizClient
      initialQuestions={data.questions}
      quizDetails={data.quizDetails}
    />
  );
}