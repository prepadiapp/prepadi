import { prisma } from '@/lib/prisma';
import { Exam, Subject, Question, Option } from '@/lib/generated/prisma/client';
import { IQuestionAdapter, StandardizedQuestion, QuestionWithOptions } from './types';
import { QboardAdapter } from './adapters/qboard-adapter';
// Import other adapters here in the future
// import { MyQuestAdapter } from './adapters/myquest-adapter';

class QuestionService {
  private adapters: IQuestionAdapter[];

  constructor() {
    // This array holds all our API strategies.
    // We can add MyQuestAdapter here later.
    this.adapters = [
      new QboardAdapter(),
      // new MyQuestAdapter(),
    ];
  }

  /**
   * The main public method to get questions.
   * It orchestrates the "check DB -> fetch from API -> save to DB" logic.
   */
  public async getQuestions(
    examId: string,
    subjectId: string,
    year: number
  ): Promise<QuestionWithOptions[]> {
    console.log(`[QuestionService] Attemping to get questions for exam: ${examId}, subject: ${subjectId}, year: ${year}`);

    // 1. Try to fetch from our local database first
    const localQuestions = await prisma.question.findMany({
      where: {
        examId,
        subjectId,
        year,
      },
      include: {
        options: true, // Must include the options
      },
    });

    if (localQuestions.length > 0) {
      console.log(`[QuestionService] Found ${localQuestions.length} questions in local DB.`);
      return localQuestions;
    }

    // 2. If no local questions, fetch from external APIs
    console.log(`[QuestionService] No local questions found. Fetching from external APIs...`);
    const fetchedQuestions = await this.fetchFromAdapters(examId, subjectId, year);

    if (fetchedQuestions.length === 0) {
      console.log(`[QuestionService] No questions found from any external API.`);
      return [];
    }

    // 3. Save the new questions to our DB (this is the caching step)
    console.log(`[QuestionService] Found ${fetchedQuestions.length} questions. Saving to DB...`);
    const newDbQuestions = await this.saveQuestionsToDb(fetchedQuestions);
    console.log(`[QuestionService] Successfully saved new questions to DB.`);

    return newDbQuestions;
  }

  public async getAvailableYears(examId: string, subjectId: string): Promise<number[]> {
    console.log(`[Service] Getting available years for exam: ${examId}, subject: ${subjectId}`);
    
    
    // We must `await` the prisma query immediately.
    const localYearsQuery = prisma.question.findMany({
      where: { examId, subjectId },
      select: { year: true },
      distinct: ['year'],
    });
    
    // 2. Get years from our adapters (this is correct)
    const adapterYears = this.fetchAvailableYearsFromAdapters(examId, subjectId);

    // 3. Await both promises together
    // This is more efficient than awaiting them one by one
    const [localYearsResult, adapterYearsResult] = await Promise.all([
      localYearsQuery,
      adapterYears,
    ]);
    
    // 4. Combine and de-duplicate
    const localYears = localYearsResult.map(q => q.year);
    const combinedYears = new Set([...localYears, ...adapterYearsResult]);
    
    // Sort descending
    return Array.from(combinedYears).sort((a, b) => b - a);
  }
  /**
   * Loops through all available adapters until one returns questions.
   */
  private async fetchFromAdapters(
    examId: string,
    subjectId: string,
    year: number
  ): Promise<StandardizedQuestion[]> {
    // We need the full Exam and Subject objects for the adapters
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

    if (!exam || !subject) {
      console.error('[QuestionService] Could not find Exam or Subject in DB.');
      return [];
    }

    // Try each adapter one by one
    for (const adapter of this.adapters) {
      try {
        const questions = await adapter.fetchQuestions(exam, subject, year);
        if (questions.length > 0) {
          console.log(`[QuestionService] Successfully fetched questions from adapter: ${adapter.constructor.name}`);
          return questions; // Return on the first success
        }
      } catch (error) {
        console.error(`[QuestionService] Adapter ${adapter.constructor.name} failed:`, error);
      }
    }

    return []; // No adapter found anything
  }


  private async fetchAvailableYearsFromAdapters(
    examId: string, 
    subjectId: string
  ): Promise<number[]> {
    
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!exam || !subject) return [];

    let allAdapterYears: number[] = [];

    for (const adapter of this.adapters) {
      // Check if the adapter supports the `getAvailableYears` method
      if (adapter.getAvailableYears) {
        try {
          const years = adapter.getAvailableYears(exam, subject);
          allAdapterYears.push(...years);
        } catch (error) {
          console.error(`[Service] Adapter ${adapter.constructor.name} failed to get years:`, error);
        }
      }
    }
    return allAdapterYears;
  }

  /**
   * Saves standardized questions to our database in a single transaction.
   */
  private async saveQuestionsToDb(
    questions: StandardizedQuestion[]
  ): Promise<QuestionWithOptions[]> {
    
    // We use a transaction to ensure that either all questions/options
    // are created, or none are.
    const createPromises = questions.map((q) => {
      return prisma.question.create({
        data: {
          text: q.text,
          explanation: q.explanation,
          year: q.year,
          examId: q.dbExamId,
          subjectId: q.dbSubjectId,
          // This creates all the options and links them automatically
          options: {
            createMany: {
              data: q.options.map(opt => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
            },
          },
        },
        include: {
          options: true, // Return the newly created questions with options
        },
      });
    });

    // Execute all create operations in a single transaction
    const createdQuestions = await prisma.$transaction(createPromises);
    return createdQuestions;
  }
}

/**
 * Export a single, global instance of the service.
 * This is a singleton pattern, which is efficient.
 */
export const questionService = new QuestionService();