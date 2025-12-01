import { create } from 'zustand';
import { Option } from '@prisma/client';

export type SanitizedOption = Omit<Option, 'isCorrect' | 'questionId' | 'userAnswers'>;

export type SanitizedQuestion = {
  id: string;
  text: string;
  year: number;
  type: 'OBJECTIVE' | 'THEORY'; 
  imageUrl: string | null;
  sectionId: string | null;
  section?: {
    instruction: string; 
    passage: string | null;
  } | null;
  options: SanitizedOption[];
};

export type QuizMode = 'EXAM' | 'PRACTICE';

interface QuizState {
  questions: SanitizedQuestion[];
  answers: Map<string, string>;
  currentIndex: number;
  
  status: 'loading' | 'active' | 'finished';
  startTime: Date | null;
  timeLimitMinutes: number;
  
  mode: QuizMode;

  startQuiz: (questions: SanitizedQuestion[], mode: QuizMode, timeLimit?: number) => void;
  selectAnswer: (questionId: string, optionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  finishQuiz: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  answers: new Map(),
  currentIndex: 0,
  status: 'loading',
  startTime: null,
  timeLimitMinutes: 45,
  mode: 'EXAM',

  startQuiz: (questions, mode, timeLimit) => {
    set({
      questions,
      answers: new Map(),
      currentIndex: 0,
      status: 'active',
      startTime: new Date(),
      mode: mode,
      timeLimitMinutes: timeLimit || 45,
    });
  },

  selectAnswer: (questionId, optionId) => {
    set((state) => ({
      answers: new Map(state.answers).set(questionId, optionId),
    }));
  },

  goToQuestion: (index) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) {
      set({ currentIndex: index });
    }
  },

  nextQuestion: () => {
    set((state) => {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex < state.questions.length) {
        return { currentIndex: nextIndex };
      }
      return {}; 
    });
  },

  prevQuestion: () => {
    set((state) => {
      const prevIndex = state.currentIndex - 1;
      if (prevIndex >= 0) {
        return { currentIndex: prevIndex };
      }
      return {}; 
    });
  },

  finishQuiz: () => {
    set({ status: 'finished' });
  },

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