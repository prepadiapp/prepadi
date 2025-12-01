import { Exam, Subject, QuestionType } from '@prisma/client';
import { IQuestionAdapter, StandardizedQuestion } from '../types';


// The base URL for the Qboard (ALOC) API
const API_BASE_URL = 'https://questions.aloc.com.ng/api/v2';
const ACCESS_TOKEN = process.env.QBOARD_ACCESS_TOKEN;


/**
 * HARDCODED availability map based on the Qboard docs.
 * We explicitly type this as Record<string, number[]> to allow indexing 
 * by the variable 'apiSubject' (which is of type string), resolving the TypeScript error.
 */
const QBOARD_AVAILABILITY: Record<string, number[]> = {
  'english': [2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010],
  'mathematics': [2006, 2007, 2008, 2009, 2013],
  'commerce': [1900, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2016],
  'accounting': [1997, 2004, 2006, 2007, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016],
  'biology': [2003, 2004, 2005, 2006, 2008, 2009, 2010, 2011, 2012],
  'physics': [2006, 2007, 2009, 2010, 2011, 2012],
  'chemistry': [2001, 2002, 2003, 2004, 2005, 2006, 2010],
  'englishlit': [2006, 2007, 2008, 2009, 2010, 2012, 2013, 2015],
  'government': [1999, 2006, 2007, 2008, 2009, 2000, 2010, 2011, 2012, 2013, 2016],
  'crk': [2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2015],
  'geography': [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014],
  'economics': [2001, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013],
  'civiledu': [2011, 2012, 2013, 2014, 2015, 2016],
  //... etc.
};

/**
 * This is the specific implementation for the Qboard (aloc.com.ng) API.
 */
export class QboardAdapter implements IQuestionAdapter {

  public getAvailableYears(exam: Exam, subject: Subject): number[] {
    // apiSubject is of type string | null
    const apiSubject = this.mapSubject(subject.name);
    const apiType = this.mapExamType(exam.shortName);

    // Because QBOARD_AVAILABILITY is now typed as Record<string, number[]>, 
    // TypeScript allows indexing with apiSubject (of type string) inside this check.
    // The previous error is resolved.
    if (apiSubject && apiType && QBOARD_AVAILABILITY[apiSubject]) {
      // ...return the list of years.
      return QBOARD_AVAILABILITY[apiSubject];
    }
    return [];
  }

  public async fetchQuestions(
    exam: Exam,
    subject: Subject,
    year: number
  ): Promise<StandardizedQuestion[]> {
    
    // 1. Map our DB names to Qboard API names
    const apiSubject = this.mapSubject(subject.name);
    const apiType = this.mapExamType(exam.shortName);

    if (!apiSubject || !apiType) {
      console.warn(`QboardAdapter: Skipping. No mapping for ${subject.name} or ${exam.shortName}`);
      return []; // Not supported by this API
    }
    
    // 2. Build the API URL (using 'm' for multiple questions, 50 limit)
    const url = `${API_BASE_URL}/m/50?subject=${apiSubject}&year=${year}&type=${apiType}`;

    try {
      // 3. Make the API call
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'AccessToken': ACCESS_TOKEN!,
        },
      });

      if (!response.ok) {
        console.error(`Qboard API error (${response.status}): ${await response.text()}`);
        return [];
      }

      const json = await response.json();

      console.log(`[QboardAdapter] Raw JSON response:`, JSON.stringify(json, null, 2));
      
      // 4. Transform the API data into our standard format
      // The Qboard docs say the response is an array of questions
      if (json.data && Array.isArray(json.data)) {
        return this.transformQboardData(json.data, exam, subject, year);
      }
      
      return [];

    } catch (error) {
      console.error('QboardAdapter fetch error:', error);
      return [];
    }
  }

  /**
   * Maps our database Exam shortName to the Qboard API 'type' parameter.
   */
  private mapExamType(shortName: string): string | null {
    switch (shortName.toUpperCase()) {
      case 'UTME':
        return 'utme';
      case 'WAEC':
        return 'wassce';
      case 'POST-UTME':
        return 'post-utme';
      default:
        return null; // This API doesn't support other exam types
    }
  }

  /**
   * Maps our database Subject name to the Qboard API 'subject' parameter.
   * Qboard seems to use lowercase and short-hand.
   */
  private mapSubject(subjectName: string): string | null {
    const lowerSub = subjectName.toLowerCase();
    
    // Add more mappings here as needed
    switch (lowerSub) {
      case 'english language':
        return 'english';
      case 'mathematics':
        return 'mathematics';
      case 'physics':
        return 'physics';
      case 'chemistry':
        return 'chemistry';
      case 'biology':
        return 'biology';
      case 'government':
        return 'government';
      case 'economics':
        return 'economics';
      case 'literature in english':
        return 'englishlit';
      case 'crk':
        return 'crk';
      case 'civic education':
        return 'civiledu';
      case 'geography':
        return 'geography';
      case 'accounting':
        return 'accounting';
      case 'commerce':
        return 'commerce';
      // ... etc.
      default:
        // A simple fallback for simple names
        if (lowerSub.includes(' ')) return null;
        return lowerSub;
    }
  }

  /**
   * Transforms the raw Qboard JSON array into our StandardizedQuestion array.
   */
  private transformQboardData(
    apiQuestions: any[],
    exam: Exam,
    subject: Subject,
    year: number
  ): StandardizedQuestion[] {
    
    return apiQuestions.map((q) => {
      const options = [
        { text: q.option.a, isCorrect: q.answer === 'a' },
        { text: q.option.b, isCorrect: q.answer === 'b' },
        { text: q.option.c, isCorrect: q.answer === 'c' },
        { text: q.option.d, isCorrect: q.answer === 'd' },
      ];
      if (q.option.e) {
        options.push({ text: q.option.e, isCorrect: q.answer === 'e' });
      }

      // API "solution" maps to our "explanation"
      // API "section" maps to our "sectionName"
      
      const standardized: StandardizedQuestion = {
        text: q.question,
        explanation: q.solution || null, 
        year: year,
        dbExamId: exam.id,
        dbSubjectId: subject.id,
        type: QuestionType.OBJECTIVE, // Qboard API is purely Objective
        sectionName: q.section || null,
        options: options,
      };

      return standardized;
    });
  }
}