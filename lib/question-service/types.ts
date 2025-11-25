import { Question, Option, Exam, Subject, QuestionType } from '@prisma/client'; 

/**
 * A helper type that represents a full question with its options.
 * This is what our QuestionService will return.
 */
export type QuestionWithOptions = Question & {
  options: Option[];
};

/**
 * Our app's standardized, "perfect" question format.
 * All API adapters must transform their response into this structure.
 */
export type StandardizedQuestion = {
  text: string;
  explanation: string | null;
  year: number;
  tags?: string[];
  // This is how we link it to our DB
  dbExamId: string;
  dbSubjectId: string;

  type: QuestionType;
  sectionName?: string | null;

  // The options for this question
  options: {
    text: string;
    isCorrect: boolean;
  }[];
};

/**
 * The interface (or "contract") that all question adapters must follow.
 */
export interface IQuestionAdapter {
  fetchQuestions(
    exam: Exam,
    subject: Subject,
    year: number
  ): Promise<StandardizedQuestion[]>;

  getAvailableYears?: (exam: Exam, subject: Subject) => number[];
}