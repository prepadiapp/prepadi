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
  imageUrl?: string | null;
};

export interface IQuestionAdapter {
  fetchQuestions(
    examSlug: string, 
    subjectSlug: string,
    year: number,
    dbExamId: string,
    dbSubjectId: string
  ): Promise<StandardizedQuestion[]>;


  getAvailableYears?: (examSlug: string, subjectSlug: string) => Promise<number[]>;
}