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

    const uniqueSectionNames = Array.from(new Set(questions.map(q => q.sectionName).filter((n): n is string => !!n)));
    const sectionMap = new Map<string, string>();

    for (const name of uniqueSectionNames) {
      let section = await prisma.section.findFirst({ where: { instruction: name } });
      if (!section) {
        section = await prisma.section.create({ data: { instruction: name } });
      }
      sectionMap.set(name, section.id);
    }

    const createdQuestions: QuestionWithOptions[] = [];

    await prisma.$transaction(async (tx) => {
        for (const q of questions) {
            const sectionId = q.sectionName ? sectionMap.get(q.sectionName) : undefined;

            // Duplicate Check
            const exists = await tx.question.findFirst({
                where: {
                    text: q.text,
                    subjectId: q.dbSubjectId,
                    examId: q.dbExamId,
                    year: q.year
                }
            });

            if (!exists) {
                const newQ = await tx.question.create({
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
                                data: q.options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect })),
                            },
                        },
                    },
                    include: { options: true, section: true },
                });
                createdQuestions.push(newQ);
            }
        }
    });

    return createdQuestions;
  }
}

export const questionService = new QuestionService();