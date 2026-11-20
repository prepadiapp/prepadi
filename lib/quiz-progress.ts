import type { SanitizedQuestion, QuizMode } from '@/stores/quizStore';

const STORAGE_PREFIX = 'prepadi:quiz-progress:v1:';

type SavedQuizProgress = {
  version: 1;
  identity: string;
  questionIds: string[];
  answers: [string, string][];
  currentIndex: number;
  startTime: string;
  expiresAt: string | null;
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export function getQuizProgressKey(identity: string, questions: SanitizedQuestion[]) {
  const questionIds = questions.map((question) => question.id).join(',');
  return `${STORAGE_PREFIX}${hash(identity)}:${hash(questionIds)}`;
}

export function loadQuizProgress(
  key: string,
  identity: string,
  questions: SanitizedQuestion[],
  mode: QuizMode,
) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const saved = JSON.parse(raw) as SavedQuizProgress;
    const questionIds = questions.map((question) => question.id);
    if (
      saved.version !== 1 ||
      saved.identity !== identity ||
      JSON.stringify(saved.questionIds) !== JSON.stringify(questionIds) ||
      !Array.isArray(saved.answers) ||
      !Number.isInteger(saved.currentIndex) ||
      saved.currentIndex < 0 ||
      saved.currentIndex >= questions.length
    ) {
      window.localStorage.removeItem(key);
      return null;
    }

    const startTime = new Date(saved.startTime);
    const expiresAt = saved.expiresAt ? new Date(saved.expiresAt) : null;
    if (Number.isNaN(startTime.getTime()) || (mode === 'EXAM' && (!expiresAt || Number.isNaN(expiresAt.getTime())))) {
      window.localStorage.removeItem(key);
      return null;
    }

    const validAnswers = new Map<string, string>();
    const questionById = new Map(questions.map((question) => [question.id, question]));
    for (const [questionId, answer] of saved.answers) {
      const question = questionById.get(questionId);
      if (!question || typeof answer !== 'string') continue;
      if (question.type === 'THEORY' || question.options.some((option) => option.id === answer)) {
        validAnswers.set(questionId, answer);
      }
    }

    return { answers: validAnswers, currentIndex: saved.currentIndex, startTime, expiresAt };
  } catch {
    return null;
  }
}

export function saveQuizProgress(
  key: string,
  identity: string,
  questions: SanitizedQuestion[],
  answers: Map<string, string>,
  currentIndex: number,
  startTime: Date,
  expiresAt: Date | null,
) {
  try {
    const progress: SavedQuizProgress = {
      version: 1,
      identity,
      questionIds: questions.map((question) => question.id),
      answers: Array.from(answers.entries()),
      currentIndex,
      startTime: startTime.toISOString(),
      expiresAt: expiresAt?.toISOString() ?? null,
    };
    window.localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // Storage can be unavailable or full; the current quiz should still work.
  }
}

export function clearQuizProgress(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable; submission should still complete.
  }
}

export function createQuizProgressIdentity({
  userId,
  assignmentId,
  examName,
  subjectName,
  year,
  mode,
}: {
  userId: string;
  assignmentId?: string | null;
  examName: string;
  subjectName: string;
  year: number | string;
  mode: QuizMode;
}) {
  return JSON.stringify([userId, assignmentId ?? null, examName, subjectName, String(year), mode]);
}
