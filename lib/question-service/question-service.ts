import { prisma } from '@/lib/prisma';
import { Exam, Subject, Question, Option } from '@/lib/generated/prisma/client';
import { IQuestionAdapter, StandardizedQuestion, QuestionWithOptions } from './types';
import { QboardAdapter } from './adapters/qboard-adapter';
// Import other adapters here in the future
// import { MyQuestAdapter } from './adapters/myquest-adapter';

class QuestionService {
  private adapters: IQuestionAdapter[];

  constructor() {
    this.adapters = [
      new QboardAdapter(),
      // new MyQuestAdapter(),
    ];
  }

  /**
   * The main public method to get questions.
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
        options: true,
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

    // 3. Save the new questions to our DB
    console.log(`[QuestionService] Found ${fetchedQuestions.length} questions. Saving to DB...`);
    const newDbQuestions = await this.saveQuestionsToDb(fetchedQuestions);
    console.log(`[QuestionService] Successfully saved new questions to DB.`);

    return newDbQuestions;
  }

  /**
   * Fetches available years from DB and all adapters.
   */
  public async getAvailableYears(examId: string, subjectId: string): Promise<number[]> {
    console.log(`[Service] Getting available years for exam: ${examId}, subject: ${subjectId}`);
    
    // 1. Get years from our local DB (questions we've already cached)
    // We create the promise but don't await it yet.
    const localYearsQuery = prisma.question.findMany({
      where: { examId, subjectId },
      select: { year: true },
      distinct: ['year'],
    });
    
    // 2. Get years from our adapters
    const adapterYears = this.fetchAvailableYearsFromAdapters(examId, subjectId);

    // 3. Await both promises in parallel (this is efficient)
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
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

    if (!exam || !subject) {
      console.error('[QuestionService] Could not find Exam or Subject in DB.');
      return [];
    }

    for (const adapter of this.adapters) {
      try {
        const questions = await adapter.fetchQuestions(exam, subject, year);
        if (questions.length > 0) {
          console.log(`[QuestionService] Successfully fetched questions from adapter: ${adapter.constructor.name}`);
          return questions;
        }
      } catch (error) {
        console.error(`[QuestionService] Adapter ${adapter.constructor.name} failed:`, error);
      }
    }

    return [];
  }
  
  /**
   * Helper method to get years from adapters.
   */
  private async fetchAvailableYearsFromAdapters(
    examId: string, 
    subjectId: string
  ): Promise<number[]> {
    
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!exam || !subject) return [];

    let allAdapterYears: number[] = [];

    for (const adapter of this.adapters) {
      if (adapter.getAvailableYears) { // Check if method exists
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
    
    const createPromises = questions.map((q) => {
      return prisma.question.create({
        data: {
          text: q.text,
          explanation: q.explanation,
          year: q.year,
          examId: q.dbExamId,
          subjectId: q.dbSubjectId,
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
          options: true,
        },
      });
    });

    const createdQuestions = await prisma.$transaction(createPromises);
    return createdQuestions;
  }
}

export const questionService = new QuestionService();