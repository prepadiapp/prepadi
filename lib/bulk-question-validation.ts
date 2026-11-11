export type BulkQuestionIssue = {
  questionNumber: number;
  field: 'question text' | 'options' | 'correct answer' | 'explanation';
  message: string;
};

function hasText(value: unknown) {
  return typeof value === 'string' && value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim().length > 0;
}

export function validateBulkQuestions(
  questions: unknown[],
  options: { requireObjectiveExplanation?: boolean } = {}
): BulkQuestionIssue[] {
  const issues: BulkQuestionIssue[] = [];

  questions.forEach((value, index) => {
    const question = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const questionNumber = index + 1;

    if (!hasText(question.text)) {
      issues.push({
        questionNumber,
        field: 'question text',
        message: 'Add the question text.',
      });
    }

    if (question.type === 'THEORY') return;

    const questionOptions = Array.isArray(question.options) ? question.options : [];
    const usableOptions = questionOptions.filter((option) => {
      if (!option || typeof option !== 'object') return false;
      return hasText((option as Record<string, unknown>).text);
    });

    if (usableOptions.length < 2) {
      issues.push({
        questionNumber,
        field: 'options',
        message: 'Add at least two non-empty answer options.',
      });
    } else {
      const correctCount = usableOptions.filter(
        (option) => (option as Record<string, unknown>).isCorrect === true
      ).length;

      if (correctCount !== 1) {
        issues.push({
          questionNumber,
          field: 'correct answer',
          message: correctCount === 0
            ? 'Mark one option as the correct answer.'
            : 'Mark only one option as the correct answer.',
        });
      }
    }

    if (options.requireObjectiveExplanation && !hasText(question.explanation)) {
      issues.push({
        questionNumber,
        field: 'explanation',
        message: 'Add an explanation for this objective question.',
      });
    }
  });

  return issues;
}
