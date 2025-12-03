import { prisma } from '@/lib/prisma';
import { QuestionWithOptions, StandardizedQuestion, IQuestionAdapter } from './types';
import { QboardAdapter } from './adapters/qboard-adapter';

class QuestionService {
  private adapters: Record<string, IQuestionAdapter>;

  constructor() {
    this.adapters = {
      'qboard': new QboardAdapter(),
    };
  }

  /**
   * Main Entry: Get questions for a quiz session.
   */
  public async getQuestions(
    examId: string,
    subjectId: string,
    year: number
  ): Promise<QuestionWithOptions[]> {
    
    // 1. Try Local DB first
    const localQuestions = await prisma.question.findMany({
      where: { 
        examId, 
        subjectId, 
        year, 
        organizationId: null 
      },
      include: { 
        options: true, 
        section: true 
      },
    });

    // If we have data, return it.
    if (localQuestions.length > 5) {
        return localQuestions;
    }

    // 2. If empty or low, fetch from external adapters
    console.log(`[QuestionService] Fetching from adapters...`);
    const fetchedQuestions = await this.fetchFromAdapters(examId, subjectId, year);

    if (fetchedQuestions.length === 0) {
        return localQuestions;
    }

    // 3. Save & Return
    const savedQuestions = await this.bulkCreate(fetchedQuestions);
    return [...localQuestions, ...savedQuestions];
  }

  /**
   * Get all years available for a specific Exam/Subject combo.
   */
  public async getAvailableYears(examId: string, subjectId: string): Promise<number[]> {
    // 1. Local DB Years
    const localYearsQuery = prisma.question.findMany({
      where: { examId, subjectId, organizationId: null },
      select: { year: true },
      distinct: ['year'],
    });
    
    // 2. Adapter Years
    const adapterYearsResult = this.fetchAvailableYearsFromAdapters(examId, subjectId);

    const [localYearsResult, adapterYears] = await Promise.all([localYearsQuery, adapterYearsResult]);
    
    const localYears = localYearsResult.map(q => q.year);
    
    // Merge and Sort Descending
    const combined = Array.from(new Set([...localYears, ...adapterYears])).sort((a, b) => b - a);
    
    return combined;
  }

  // --- Internal Helper: Iterate Adapters to fetch questions ---
  private async fetchFromAdapters(
    examId: string,
    subjectId: string,
    year: number
  ): Promise<StandardizedQuestion[]> {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

    if (!exam || !subject) return [];

    // Parse JSON mappings from DB
    const examAliases = (exam.apiAliases as Record<string, string>) || {};
    const subjectSlugs = (subject.apiSlugs as Record<string, string>) || {};

    for (const [adapterName, adapter] of Object.entries(this.adapters)) {
        // Check if this Exam AND Subject have a mapping for this specific adapter
        const examSlug = examAliases[adapterName];
        const subjectSlug = subjectSlugs[adapterName];

        if (examSlug && subjectSlug) {
            try {
                const questions = await adapter.fetchQuestions(examSlug, subjectSlug, year, exam.id, subject.id);
                if (questions.length > 0) {
                    return questions;
                }
            } catch (e) {
                console.error(`[QuestionService] Adapter ${adapterName} failed:`, e);
            }
        }
    }

    return [];
  }
  
  // --- Internal Helper: Iterate Adapters to get years ---
  private async fetchAvailableYearsFromAdapters(examId: string, subjectId: string): Promise<number[]> {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });

    if (!exam || !subject) return [];

    const examAliases = (exam.apiAliases as Record<string, string>) || {};
    const subjectSlugs = (subject.apiSlugs as Record<string, string>) || {};
    
    let allYears: number[] = [];

    for (const [adapterName, adapter] of Object.entries(this.adapters)) {
        if (adapter.getAvailableYears) {
            const examSlug = examAliases[adapterName];
            const subjectSlug = subjectSlugs[adapterName];

            // Only fetch if we have a valid slug for this subject on this adapter
            if (subjectSlug) {
                try {
                    const years = await adapter.getAvailableYears(examSlug, subjectSlug);
                    if (years.length > 0) {
                        allYears.push(...years);
                    }
                } catch (e) { 
                    console.error(`[QuestionService] Failed to get years from ${adapterName}`, e); 
                }
            }
        }
    }
    return allYears;
  }

  public async bulkCreate(questions: StandardizedQuestion[]): Promise<QuestionWithOptions[]> {
    if (questions.length === 0) return [];

    console.log(`[QuestionService] Saving ${questions.length} questions...`);

    // 1. Handle sections
    const uniqueSectionNames = Array.from(
      new Set(questions.map(q => q.sectionName).filter((n): n is string => !!n))
    );
    
    const sectionMap = new Map<string, string>();

    for (const name of uniqueSectionNames) {
      let section = await prisma.section.findFirst({ where: { instruction: name } });
      if (!section) {
        section = await prisma.section.create({ data: { instruction: name } });
      }
      sectionMap.set(name, section.id);
    }

    // 2. Save with concurrency limit (5 at a time)
    const CONCURRENCY = 5;
    const MAX_RETRIES = 3;
    const createdQuestions: QuestionWithOptions[] = [];
    const permanentlyFailed: StandardizedQuestion[] = [];

    const saveQuestion = async (q: StandardizedQuestion, index: number): Promise<void> => {
      let saved = false;
      let attempt = 0;

      while (!saved && attempt < MAX_RETRIES) {
        attempt++;

        try {
          // Check duplicate
          const exists = await prisma.question.findFirst({
            where: {
              text: q.text,
              subjectId: q.dbSubjectId,
              examId: q.dbExamId,
              year: q.year,
            },
          });

          if (exists) {
            saved = true;
            return;
          }

          // Create question
          const sectionId = q.sectionName ? sectionMap.get(q.sectionName) : undefined;

          const newQ = await prisma.question.create({
            data: {
              text: q.text,
              explanation: q.explanation,
              year: q.year,
              type: q.type,
              imageUrl: q.imageUrl,
              examId: q.dbExamId,
              subjectId: q.dbSubjectId,
              sectionId: sectionId,
              organizationId: null,
              options: {
                createMany: {
                  data: q.options.map(opt => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                  })),
                },
              },
            },
            include: { options: true, section: true },
          });

          createdQuestions.push(newQ);
          console.log(`[QuestionService] ✓ ${index + 1}/${questions.length} saved`);
          saved = true;

        } catch (error) {
          if (attempt < MAX_RETRIES) {
            console.warn(`[QuestionService] ⚠️  ${index + 1}/${questions.length} failed (attempt ${attempt}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error(`[QuestionService] ✗ ${index + 1}/${questions.length} FAILED permanently`);
            permanentlyFailed.push(q);
          }
        }
      }
    };

    // Process in batches of CONCURRENCY
    for (let i = 0; i < questions.length; i += CONCURRENCY) {
      const batch = questions.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((q, idx) => saveQuestion(q, i + idx)));
    }

    // 3. Recursive retry for failed
    if (permanentlyFailed.length > 0) {
      console.log(`[QuestionService] Retrying ${permanentlyFailed.length} failed questions...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      const finalAttempt = await this.bulkCreate(permanentlyFailed);
      createdQuestions.push(...finalAttempt);
    }

    console.log(`[QuestionService] Final: ${createdQuestions.length}/${questions.length} saved`);

    return createdQuestions;
  }
}

export const questionService = new QuestionService();