import { create } from 'zustand';

import { Option } from '@prisma/client';

// Update the SanitizedQuestion type to match the API response
// We omit fields the frontend doesn't need or shouldn't see
export type SanitizedOption = Omit<Option, 'isCorrect' | 'questionId' | 'userAnswers'>;

export type SanitizedQuestion = {
  id: string;
  text: string;
  year: number;
  type: 'OBJECTIVE' | 'THEORY'; // Matches QuestionType enum
  imageUrl: string | null;
  sectionId: string | null;
  
  // Optional nested section data for display
  section?: {
    instruction: string; 
    passage: string | null;
  } | null;
  
  options: SanitizedOption[];
};

interface QuizState {
  // --- Data ---
  questions: SanitizedQuestion[];
  // Map of questionId -> selectedOptionId
  answers: Map<string, string>;
  
  // --- Navigation ---
  currentIndex: number;
  
  // --- Timer & Status ---
  status: 'loading' | 'active' | 'finished';
  startTime: Date | null;
  timeLimitMinutes: number; // Default 45 mins

  // --- Actions ---
  startQuiz: (questions: SanitizedQuestion[], timeLimit?: number) => void;
  selectAnswer: (questionId: string, optionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  finishQuiz: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  // --- Initial State ---
  questions: [],
  answers: new Map(),
  currentIndex: 0,
  status: 'loading',
  startTime: null,
  timeLimitMinutes: 45,

  // --- Actions ---

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