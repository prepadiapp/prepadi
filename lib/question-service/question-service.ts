import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { QuestionWithOptions, StandardizedQuestion, IQuestionAdapter } from './types';

const EXTERNAL_QUESTION_LOADING_ENABLED = false;

interface GetQuestionsParams {
  examId: string;
  subjectId?: string; // Optional (if "All Subjects")
  year?: number;      // Optional (if "Random")
  tags?: string[];    // Optional
  limit?: number;     // Optional
}

class QuestionService {
  private adapters: Record<string, IQuestionAdapter>;

  constructor() {
    // External question loading is intentionally paused. The platform now serves
    // only papers/questions seeded through admin/org uploads and manual authoring.
    this.adapters = {};
  }

  /**
   * Main Entry: Get questions with flexible filters.
   */
  public async getQuestions(params: GetQuestionsParams): Promise<QuestionWithOptions[]> {
    const { examId, subjectId, year, tags, limit } = params;

    // --- 1. Build Local Query ---
    const where: any = { 
      examId, 
      organizationId: null 
    };

    if (subjectId && subjectId !== 'all') {
        where.subjectId = subjectId;
    }

    if (year) {
        where.year = year;
    }

    if (tags && tags.length > 0) {
        where.tags = {
            some: {
                name: { in: tags }
            }
        };
    }

    // --- 2. Fetch from Local DB ---
    // If we need random questions (no year specified), we have to shuffle.
    // Prisma doesn't support native random easily.
    // Strategy: Fetch more than needed, then shuffle in memory.
    
    let localQuestions = await prisma.question.findMany({
      where,
      include: {
        options: true,
        section: true,
        tags: true,
      },
      ...(limit ? { take: year ? limit : limit * 2 } : {}),
    });

    // Randomize if no specific year was requested (Practice Mode)
    if (!year) {
        localQuestions = localQuestions.sort(() => 0.5 - Math.random());
    }

    // Apply strict limit
    if (limit && localQuestions.length > limit) {
        localQuestions = localQuestions.slice(0, limit);
    }

    // If we found enough questions locally, return them.
    if (localQuestions.length >= (limit || 5)) {
        return localQuestions;
    }

    if (!EXTERNAL_QUESTION_LOADING_ENABLED) {
        return localQuestions;
    }

    // --- 3. External Adapter Fallback ---
    // Temporarily disabled by EXTERNAL_QUESTION_LOADING_ENABLED. Keep this block
    // available for a future reactivation without exposing it to users today.
    // Only attempt if we have a specific subject and year (Adapters usually need structure)
    // If user asked for "Random Tags across All Subjects", adapters might not support it efficiently.
    if (subjectId && year && subjectId !== 'all') {
        console.log(`[QuestionService] Fetching from adapters for ${year}...`);
        const fetchedQuestions = await this.fetchFromAdapters(examId, subjectId, year);
        
        if (fetchedQuestions.length > 0) {
            const savedQuestions = await this.bulkCreate(fetchedQuestions);
            const combined = [...localQuestions, ...savedQuestions];
            return limit ? combined.slice(0, limit) : combined;
        }
    }

    return localQuestions;
  }

  /**
   * Get all years available for a specific Exam/Subject combo.
   */
  public async getAvailableYears(examId: string, subjectId: string): Promise<number[]> {
    const localYearsQuery = prisma.question.findMany({
      where: { examId, subjectId, organizationId: null },
      select: { year: true },
      distinct: ['year'],
    });
    
    const localYearsResult = await localYearsQuery;
    
    const localYears = localYearsResult
        .map(q => q.year)
        .filter((y): y is number => y !== null); // Filter out nulls

    if (!EXTERNAL_QUESTION_LOADING_ENABLED) {
        return localYears.sort((a, b) => b - a);
    }

    const adapterYears = await this.fetchAvailableYearsFromAdapters(examId, subjectId);

    // Sort descending, handling any potential undefined/null safely
    const combined = Array.from(new Set([...localYears, ...adapterYears])).sort((a, b) => {
        const valA = a ?? 0;
        const valB = b ?? 0;
        return valB - valA;
    });
    
    return combined;
  }

  // --- Adapters Logic ---
  private async fetchFromAdapters(examId: string, subjectId: string, year: number): Promise<StandardizedQuestion[]> {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!exam || !subject) return [];

    const examAliases = (exam.apiAliases as Record<string, string>) || {};
    const subjectSlugs = (subject.apiSlugs as Record<string, string>) || {};

    for (const [adapterName, adapter] of Object.entries(this.adapters)) {
        const examSlug = examAliases[adapterName];
        const subjectSlug = subjectSlugs[adapterName];
        if (examSlug && subjectSlug) {
            try {
                const questions = await adapter.fetchQuestions(examSlug, subjectSlug, year, exam.id, subject.id);
                if (questions.length > 0) return questions;
            } catch (e) { console.error(`[QuestionService] Adapter ${adapterName} failed:`, e); }
        }
    }
    return [];
  }
  
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
            if (subjectSlug) {
                try {
                    const years = await adapter.getAvailableYears(examSlug, subjectSlug);
                    if (years.length > 0) allYears.push(...years);
                } catch (e) { console.error(e); }
            }
        }
    }
    return allYears;
  }

  public async bulkCreate(questions: StandardizedQuestion[]): Promise<QuestionWithOptions[]> {
    if (questions.length === 0) return [];
    
    // De-duplicate section names
    const uniqueSectionNames = Array.from(new Set(questions.map(q => q.sectionName).filter((n): n is string => !!n)));
    const sectionMap = new Map<string, string>();

    // Resolve Sections
    for (const name of uniqueSectionNames) {
      let section = await prisma.section.findFirst({ where: { instruction: name } });
      if (!section) section = await prisma.section.create({ data: { instruction: name } });
      sectionMap.set(name, section.id);
    }

    const createdQuestions: QuestionWithOptions[] = [];

    // Helper to process tags
    const processTags = async (tagNames: string[]) => {
        const tagIds = [];
        for (const name of tagNames) {
            let tag = await prisma.tag.findUnique({ where: { name } });
            if (!tag) tag = await prisma.tag.create({ data: { name } });
            tagIds.push({ id: tag.id });
        }
        return tagIds;
    };

    for (const q of questions) {
        const exists = await prisma.question.findFirst({
            where: q.paperId
                ? { text: q.text, paperId: q.paperId }
                : { text: q.text, subjectId: q.dbSubjectId, examId: q.dbExamId, year: q.year },
        });

        if (!exists) {
            const sectionId = q.sectionName ? sectionMap.get(q.sectionName) : undefined;
            const tagConnects = q.tags ? await processTags(q.tags) : [];

            const newQ = await prisma.question.create({
                data: {
                    text: q.text,
                    explanation: q.explanation,
                    markingGuide: q.markingGuide,
                    year: q.year,
                    type: q.type,
                    imageUrl: q.imageUrl,
                    examId: q.dbExamId,
                    subjectId: q.dbSubjectId,
                    paperId: q.paperId,
                    order: q.order ?? 0,
                    sectionId: sectionId,
                    organizationId: null,
                    options: {
                        createMany: {
                            data: q.options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect })),
                        },
                    },
                    tags: { connect: tagConnects }
                },
                include: { options: true, section: true, tags: true },
            });
            createdQuestions.push(newQ);
        }
    }

    return createdQuestions;
  }
}

export const questionService = new QuestionService();
