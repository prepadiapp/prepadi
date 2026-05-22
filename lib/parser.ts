import { QuestionType } from '@prisma/client';

import {
  decodeBasicEntities,
  hasHtmlMarkup,
  normalizeRichTextInput,
  richTextToPlainText,
  sanitizeRichHtml,
} from '@/lib/rich-text';

export interface ParsedQuestion {
  id: string;
  text: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  markingGuide?: string;
  tags: string[];
  type: QuestionType;
  section: string | null;
  error?: string;
}

type RichLine = {
  html: string;
  text: string;
};

type WorkingQuestion = {
  textParts: string[];
  options: { letter: string; text: string; isCorrect: boolean }[];
  explanation: string;
  markingGuide: string;
  tags: string[];
  section: string | null;
  forcedType?: QuestionType;
};

const cleanText = (text: string) => text.trim().replace(/\s+/g, ' ');

function newId() {
  return Math.random().toString(36).slice(2, 11);
}

function stripWrappingBlockTags(html: string) {
  return html
    .replace(/^<(p|div|li)[^>]*>/i, '')
    .replace(/<\/(p|div|li)>$/i, '')
    .trim();
}

function stripLeadingPatternFromHtml(html: string, pattern: RegExp) {
  let result = stripWrappingBlockTags(html);
  result = result.replace(pattern, '').trim();
  return result;
}

function stripTrailingAnswerMarker(html: string) {
  return html.replace(/\s*\*\s*$/g, '').trim();
}

function lineTextFromHtml(html: string) {
  return decodeBasicEntities(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
  ).trim();
}

function splitRichLines(source: string): RichLine[] {
  const normalized = normalizeRichTextInput(source);
  const sourceHasHtml = hasHtmlMarkup(source);

  if (!sourceHasHtml) {
    return source
      .split(/\r?\n/)
      .map((line) => ({ html: line.trim(), text: line.trim() }))
      .filter((line) => line.text.length > 0);
  }

  const htmlWithLineBreaks = sanitizeRichHtml(normalized)
    .replace(/<br\s*\/?>/gi, '<br>\n')
    .replace(/<\/(?:p|div|li)>/gi, '$&\n')
    .replace(/<\/(?:ol|ul)>/gi, '$&\n');

  return htmlWithLineBreaks
    .split(/\n+/)
    .map((line) => sanitizeRichHtml(line.trim()))
    .filter(Boolean)
    .map((html) => ({ html, text: lineTextFromHtml(html) }))
    .filter((line) => line.text.length > 0);
}

function markerValueHtml(line: RichLine, markerPattern: RegExp) {
  return stripLeadingPatternFromHtml(line.html, markerPattern);
}

function appendHtmlPart(parts: string[], nextPart: string) {
  const cleanPart = sanitizeRichHtml(nextPart);
  if (!cleanPart) return;
  parts.push(cleanPart);
}

function finalizeQuestion(question: WorkingQuestion | null): ParsedQuestion | null {
  if (!question) return null;

  const text = sanitizeRichHtml(question.textParts.join('<br>')).trim();
  const plainQuestionText = richTextToPlainText(text);
  if (!plainQuestionText) return null;

  const type =
    question.forcedType ||
    (question.options.length > 0 ? QuestionType.OBJECTIVE : QuestionType.THEORY);

  const options =
    type === QuestionType.OBJECTIVE
      ? question.options.map((option) => ({
          text: sanitizeRichHtml(option.text),
          isCorrect: option.isCorrect,
        }))
      : [];

  const correctCount = options.filter((option) => option.isCorrect).length;

  return {
    id: newId(),
    text,
    options,
    explanation: sanitizeRichHtml(question.explanation),
    markingGuide: sanitizeRichHtml(question.markingGuide),
    tags: question.tags,
    type,
    section: question.section,
    error:
      type === QuestionType.OBJECTIVE && correctCount !== 1
        ? 'No answer detected'
        : undefined,
  };
}

/**
 * Parses either plain text or sanitized HTML. Template markers are detected from
 * text content, while saved fields keep allowed formatting such as bold,
 * italics, underline, lists, subscript, and superscript.
 */
export function parseBulkText(source: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = splitRichLines(source);

  let currentSection: string | null = null;
  let currentQuestion: WorkingQuestion | null = null;

  const pushCurrentQuestion = () => {
    const parsed = finalizeQuestion(currentQuestion);
    if (parsed) questions.push(parsed);
    currentQuestion = null;
  };

  for (const line of lines) {
    const text = cleanText(line.text);
    if (!text) continue;

    if (/^#\s*NO\s*SECTION/i.test(text)) {
      currentSection = null;
      continue;
    }

    const sectionMatch = text.match(/^(?:SECTION|INSTRUCTION|PASSAGE|PART)\s*[:\-]?\s*(.*)/i);
    if (sectionMatch && !/^\d+[\.\)\-]/.test(text)) {
      const value = markerValueHtml(line, /^(?:SECTION|INSTRUCTION|PASSAGE|PART)\s*[:\-]?\s*/i);
      currentSection = sanitizeRichHtml(value || sectionMatch[1] || '');
      continue;
    }

    const questionMatch = text.match(/^(\d+)[\.\)\-]\s*(.+)/);
    if (questionMatch) {
      pushCurrentQuestion();
      currentQuestion = {
        textParts: [],
        options: [],
        explanation: '',
        markingGuide: '',
        tags: [],
        section: currentSection,
      };
      appendHtmlPart(currentQuestion.textParts, stripLeadingPatternFromHtml(line.html, /^\d+[\.\)\-]\s*/i));
      continue;
    }

    if (!currentQuestion) continue;

    const typeMatch = text.match(/^TYPE\s*:\s*(OBJECTIVE|THEORY)/i);
    if (typeMatch) {
      currentQuestion.forcedType =
        typeMatch[1].toUpperCase() === 'THEORY' ? QuestionType.THEORY : QuestionType.OBJECTIVE;
      continue;
    }

    const answerMatch = text.match(/^(?:Answer|Ans|Key|Correct)\s*:\s*([A-E])/i);
    if (answerMatch) {
      const answerLetter = answerMatch[1].toUpperCase();
      currentQuestion.options = currentQuestion.options.map((option) => ({
        ...option,
        isCorrect: option.letter === answerLetter,
      }));
      continue;
    }

    const explanationMatch = text.match(/^(?:Explanation|Solution|Note)\s*:\s*(.*)/i);
    if (explanationMatch) {
      currentQuestion.explanation = markerValueHtml(line, /^(?:Explanation|Solution|Note)\s*:\s*/i);
      continue;
    }

    const markingGuideMatch = text.match(/^(?:MARKING_GUIDE|MARKING GUIDE|GUIDE)\s*:\s*(.*)/i);
    if (markingGuideMatch) {
      currentQuestion.markingGuide = markerValueHtml(line, /^(?:MARKING_GUIDE|MARKING GUIDE|GUIDE)\s*:\s*/i);
      continue;
    }

    const tagMatch = text.match(/^(?:Tags?|Topic|Category)\s*:\s*(.*)/i);
    if (tagMatch) {
      currentQuestion.tags = tagMatch[1]
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      continue;
    }

    const optionMatch = text.match(/^([A-E])[\.\)]\s+(.+)/i);
    if (optionMatch) {
      const hasTrailingStar = /\*\s*$/.test(text);
      currentQuestion.options.push({
        letter: optionMatch[1].toUpperCase(),
        text: stripTrailingAnswerMarker(
          stripLeadingPatternFromHtml(line.html, /^[A-E][\.\)]\s*/i)
        ),
        isCorrect: hasTrailingStar,
      });
      continue;
    }

    if (currentQuestion.options.length === 0) {
      appendHtmlPart(currentQuestion.textParts, line.html);
    }
  }

  pushCurrentQuestion();

  return questions;
}
