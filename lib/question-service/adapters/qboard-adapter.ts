import { QuestionType } from '@prisma/client';
import { IQuestionAdapter, StandardizedQuestion } from '../types';

const API_BASE_URL = 'https://questions.aloc.com.ng/api';
const ACCESS_TOKEN = process.env.QBOARD_ACCESS_TOKEN;

// --- Types for Qboard API Responses ---

interface QboardQuestion {
  id: number;
  question: string;
  option: {
    a: string;
    b: string;
    c: string;
    d: string;
    e?: string;
  };
  answer: string;
  solution?: string;
  image?: string;
  section?: string;
  examtype: string;
  examyear: string;
}

interface QboardResponse {
  status: number;
  message?: string;
  subject?: string;
  data: QboardQuestion[] | QboardQuestion;
}

// Updated interface based on your sample response
interface QboardYearMetric {
    questions: number;
    examyear: string;
}

interface QboardMetricsResponse {
    status: number;
    data: QboardYearMetric[];
}

export class QboardAdapter implements IQuestionAdapter {

  public async getAvailableYears(examSlug: string, subjectSlug: string): Promise<number[]> {
    // URL: https://questions.aloc.com.ng/api/metrics/years-available-for/english
    const url = `${API_BASE_URL}/metrics/years-available-for/${subjectSlug}`;

    console.log(`[QboardAdapter] Fetching years for: ${subjectSlug}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'AccessToken': ACCESS_TOKEN || '',
        },
        next: { revalidate: 3600 } 
      });

      if (!response.ok) {
        console.warn(`[QboardAdapter] Metrics fetch failed: ${response.status}`);
        return [];
      }

      const json = await response.json();
      
      // Debug log to see exactly what we get
      // console.log("[QboardAdapter] Metrics Response:", JSON.stringify(json).slice(0, 100));

      let yearsData: QboardYearMetric[] = [];

      // The API returns { status: 200, data: [...] }
      if (json.data && Array.isArray(json.data)) {
          yearsData = json.data;
      } else if (Array.isArray(json)) {
          // Fallback if API changes structure to direct array
          yearsData = json;
      }

      if (yearsData.length > 0) {
        const years = yearsData
            .map(item => parseInt(item.examyear))
            .filter(y => !isNaN(y))
            .sort((a, b) => b - a);
        
        console.log(`[QboardAdapter] Found ${years.length} years for ${subjectSlug}`);
        return years;
      }

      console.warn(`[QboardAdapter] No years found in data for ${subjectSlug}`);
      return [];
    } catch (error) {
      console.error('[QboardAdapter] getAvailableYears error:', error);
      return [];
    }
  }

  public async fetchQuestions(
    examSlug: string,
    subjectSlug: string,
    year: number,
    dbExamId: string,
    dbSubjectId: string
  ): Promise<StandardizedQuestion[]> {
    
    // Using standard 'm' endpoint which we assume returns array of randoms for that year
    // or just 'q' if we want one.
    // Based on user feedback: "remove the limit segment"
    const url = `${API_BASE_URL}/v2/m?subject=${subjectSlug}&year=${year}&type=${examSlug}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'AccessToken': ACCESS_TOKEN || '',
        },
        cache: 'no-store' 
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[QboardAdapter] API error (${response.status}): ${errText}`);
        return [];
      }

      const json = (await response.json()) as QboardResponse;
      
      let questionsData: QboardQuestion[] = [];

      if (json.data) {
          if (Array.isArray(json.data)) {
              questionsData = json.data;
          } else if (typeof json.data === 'object') {
              questionsData = [json.data];
          }
      }

      if (questionsData.length > 0) {
        console.log(`[QboardAdapter] Fetched ${questionsData.length} questions for ${subjectSlug}/${year}`);
        return this.transformQboardData(questionsData, dbExamId, dbSubjectId, year);
      } 
      
      return [];

    } catch (error) {
      console.error('[QboardAdapter] fetchQuestions connection error:', error);
      return [];
    }
  }

  private transformQboardData(
    apiQuestions: QboardQuestion[],
    dbExamId: string,
    dbSubjectId: string,
    year: number
  ): StandardizedQuestion[] {
    return apiQuestions.map((q) => {
      const options = [];
      
      if (q.option.a) options.push({ text: q.option.a, isCorrect: q.answer.toLowerCase() === 'a' });
      if (q.option.b) options.push({ text: q.option.b, isCorrect: q.answer.toLowerCase() === 'b' });
      if (q.option.c) options.push({ text: q.option.c, isCorrect: q.answer.toLowerCase() === 'c' });
      if (q.option.d) options.push({ text: q.option.d, isCorrect: q.answer.toLowerCase() === 'd' });
      if (q.option.e) options.push({ text: q.option.e, isCorrect: q.answer.toLowerCase() === 'e' });

      const sectionName = q.section && q.section.trim().length > 0 ? q.section.trim() : null;
      const imageUrl = q.image && q.image.trim().length > 0 ? q.image : null;

      const standardized: StandardizedQuestion = {
        text: q.question,
        explanation: q.solution || null, 
        year: year,
        dbExamId: dbExamId,
        dbSubjectId: dbSubjectId,
        type: QuestionType.OBJECTIVE, 
        sectionName: sectionName,
        options: options,
        imageUrl: imageUrl
      };

      return standardized;
    });
  }
}