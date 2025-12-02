import { Question, Option, Exam, Subject, QuestionType } from '@prisma/client'; 

export type QuestionWithOptions = Question & {
  options: Option[];
};

export type StandardizedQuestion = {
  text: string;
  explanation: string | null;
  year: number;
  tags?: string[];
  dbExamId: string;
  dbSubjectId: string;
  type: QuestionType;
  sectionName?: string | null;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
};

export interface IQuestionAdapter {
  fetchQuestions(
    // Pass simple strings now, not full objects, as the Service does the mapping lookup
    examSlug: string, 
    subjectSlug: string,
    year: number,
    // Pass original DB IDs for reference if needed in return object
    dbExamId: string,
    dbSubjectId: string
  ): Promise<StandardizedQuestion[]>;

  getAvailableYears?: (examSlug: string, subjectSlug: string) => number[];
}