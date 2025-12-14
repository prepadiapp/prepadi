import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { questionService } from '@/lib/question-service/question-service';
import { redirect, notFound } from 'next/navigation';
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
  searchParams: Promise<{ mode?: string; tags?: string; limit?: string }>;
}

type QuestionWithRelations = Question & {
    options: Option[];
    section: Section | null;
};

async function getQuizData(slug: string[] | undefined, searchParams: { tags?: string; limit?: string }, userId: string) {
  try {
    if (!slug) {
      throw new Error('Invalid quiz URL.');
    }

    // --- MODE 1: ASSIGNMENT (Org Exam) ---
    // URL pattern: /quiz/assignment/[assignmentId]
    if (slug[0] === 'assignment') {
        const assignmentId = slug[1];
        
        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: { paper: true }
        });

        if (!assignment) throw new Error("Assignment not found");

        // Check Access (Time window, Org membership)
        const access = await verifyUserAccess(userId, { assignmentId: assignmentId });
        if (!access.allowed) {
            throw new Error(`ACCESS_DENIED:${access.reason}`);
        }

        // Check if already taken (Server-side check)
        const attempt = await prisma.quizAttempt.findFirst({
            where: { userId: userId, assignmentId: assignmentId, status: 'COMPLETED' }
        });
        if (attempt) {
            throw new Error(`ACCESS_DENIED:You have already completed this exam.`);
        }

        // Fetch Questions linked to the paper
        const paper = await prisma.examPaper.findUnique({
            where: { id: assignment.paperId },
            include: {
                questions: {
                    include: { options: true, section: true },
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (!paper || paper.questions.length === 0) throw new Error("No questions found in this assignment.");

        // Sanitize
        const sanitizedQuestions: SanitizedQuestion[] = paper.questions.map((q) => ({
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
            options: q.options.map((opt) => ({
                id: opt.id,
                text: opt.text,
            })),
        }));

        return {
            data: {
                questions: sanitizedQuestions,
                quizDetails: {
                    examName: assignment.title,
                    subjectName: paper.title, // Use paper title as subject context
                    year: paper.year,
                },
                assignmentId: assignment.id,
                duration: assignment.duration || assignment.paper.duration || 0
            },
            error: null
        };
    }

    // --- MODE 2: PRACTICE / STANDARD EXAM ---
    // URL pattern: /quiz/[exam]/[subject]/[year]
    
    if (slug.length !== 3) {
      throw new Error('Invalid quiz URL.');
    }

    const [examSlug, subjectSlug, yearStr] = slug;
    
    // Handle "Random" year logic
    const year = yearStr === 'random' ? undefined : parseInt(yearStr);
    if (yearStr !== 'random' && isNaN(year!)) throw new Error('Invalid year.');

    const exam = await prisma.exam.findFirst({
      where: { shortName: { equals: examSlug, mode: 'insensitive' } },
    });

    // Handle "All" subjects logic
    let subject = null;
    if (subjectSlug !== 'all') {
        subject = await prisma.subject.findFirst({
            where: {
                name: { equals: subjectSlug.replace(/-/g, ' '), mode: 'insensitive' },
            },
        });
        if (!subject) throw new Error(`Subject not found.`);
    }

    if (!exam) throw new Error(`Exam not found.`);

    // Check Plan Permissions
    const access = await verifyUserAccess(userId, {
        examId: exam.id,
        subjectId: subject?.id,
        year: year
    });

    if (!access.allowed) {
        throw new Error(`ACCESS_DENIED:${access.reason}`);
    }

    // Call service with parsed params
    const questions = (await questionService.getQuestions({
        examId: exam.id,
        subjectId: subject?.id,
        year: year,
        tags: searchParams.tags ? searchParams.tags.split(',') : undefined,
        limit: searchParams.limit ? parseInt(searchParams.limit) : undefined
    })) as QuestionWithRelations[];

    if (questions.length === 0) {
      throw new Error('No questions found for this selection.');
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
          subjectName: subject?.name || 'Mixed Subjects',
          year: year || new Date().getFullYear(),
        },
        duration: exam.duration || 60 // Default duration if not assignment
      },
      error: null,
    };

  } catch (error: any) {
    const msg = error.message || 'An unknown error occurred.';
    return {
      data: null,
      error: msg,
    };
  }
}

export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect('/login');
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { data, error } = await getQuizData(resolvedParams.slug, resolvedSearchParams, session.user.id);
  
  const modeParam = resolvedSearchParams.mode?.toUpperCase();
  // If it's an assignment, force EXAM mode (timed)
  const mode: QuizMode = resolvedParams.slug[0] === 'assignment' ? 'EXAM' : (modeParam === 'PRACTICE' ? 'PRACTICE' : 'EXAM');

  if (error) {
    const isAccessDenied = error.startsWith('ACCESS_DENIED:');
    const cleanError = isAccessDenied ? error.replace('ACCESS_DENIED:', '') : error;

    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-muted/20">
        <Alert variant="destructive" className="max-w-lg shadow-lg bg-white">
          {isAccessDenied ? <Lock className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <AlertTitle className="text-lg font-semibold mb-2">
            {isAccessDenied ? 'Access Restricted' : 'Error Loading Quiz'}
          </AlertTitle>
          <AlertDescription className="text-base text-muted-foreground mb-4">
            {cleanError}
          </AlertDescription>
          {isAccessDenied && !cleanError.includes('already completed') && (
              <Button asChild variant="default" className="w-full">
                  <Link href="/dashboard/billing">Upgrade Plan</Link>
              </Button>
          )}
          <Button asChild variant="outline" className="w-full mt-2">
              <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
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
      initialDuration={data.duration}
      assignmentId={data.assignmentId}
      userId={session.user.id}
    />
  );
}