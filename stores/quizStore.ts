import { create } from 'zustand';
import { Question, Option } from '@/lib/generated/prisma/client';


export type SanitizedOption = Omit<Option, 'isCorrect' | 'questionId'>;
export type SanitizedQuestion = Omit<Question, 'explanation' | 'sourceApi' | 'subjectId' | 'examId'> & {
  options: SanitizedOption[];
};


interface QuizState {
  questions: SanitizedQuestion[];
  answers: Map<string, string>; // Maps questionId -> selectedOptionId
  currentIndex: number;
  status: 'loading' | 'active' | 'finished';
  startTime: Date | null;
  timeLimitMinutes: number; // e.g., 60 minutes
  
  // These are the "actions" we can call to update the state
  startQuiz: (questions: SanitizedQuestion[], timeLimit?: number) => void;
  selectAnswer: (questionId: string, optionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  finishQuiz: () => void;
  resetQuiz: () => void;
}

// This creates the actual store with the initial state and actions
export const useQuizStore = create<QuizState>((set, get) => ({
  // --- Initial State ---
  questions: [],
  answers: new Map(),
  currentIndex: 0,
  status: 'loading',
  startTime: null,
  timeLimitMinutes: 45, // Default 45 minutes

  
  /**
   * Initializes the quiz with questions and starts the timer.
   */
  startQuiz: (questions, timeLimit) => {
    set({
      questions,
      answers: new Map(),
      currentIndex: 0,
      status: 'active',
      startTime: new Date(),
      timeLimitMinutes: timeLimit || 45,
    });
  },

  /**
   * Records a user's answer for a specific question.
   */
  selectAnswer: (questionId, optionId) => {
    set((state) => ({
      answers: new Map(state.answers).set(questionId, optionId),
    }));
  },

  /**
   * Jumps to a specific question by its index.
   */
  goToQuestion: (index) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) {
      set({ currentIndex: index });
    }
  },

  /**
   * Moves to the next question.
   */
  nextQuestion: () => {
    set((state) => {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex < state.questions.length) {
        return { currentIndex: nextIndex };
      }
      return {}; // No change if already at the end
    });
  },

  /**
   * Moves to the previous question.
   */
  prevQuestion: () => {
    set((state) => {
      const prevIndex = state.currentIndex - 1;
      if (prevIndex >= 0) {
        return { currentIndex: prevIndex };
      }
      return {}; // No change if already at the beginning
    });
  },

  /**
   * Manually finishes the quiz, changing status to 'finished'.
   */
  finishQuiz: () => {
    set({ status: 'finished' });
  },

  /**
   * Resets the store to its initial empty state.
   */
  resetQuiz: () => {
    set({
      questions: [],
      answers: new Map(),
      currentIndex: 0,
      status: 'loading',
      startTime: null,
    });
  },
}));