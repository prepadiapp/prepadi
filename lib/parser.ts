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

const QUESTION_START_RE = /^(\d+)[\.\)\-]\s*(.+)/;

const BLOCK_SIGNAL_RES = [
  /^([A-E])[\.\)]\s+.+/i,
  /^TYPE\s*:\s*(OBJECTIVE|THEORY)/i,
  /^(?:Answer|Ans|Key|Correct)\s*:\s*([A-E])/i,
  /^(?:Explanation|Solution|Note)\s*:\s*(.*)/i,
  /^(?:MARKING_GUIDE|MARKING GUIDE|GUIDE)\s*:\s*(.*)/i,
  /^(?:Tags?|Topic|Category)\s*:\s*(.*)/i,
];

const SECTION_MARKER_RE = /^(?:SECTION|INSTRUCTION|PASSAGE|PART)\s*[:\-]?\s*(.*)/i;
const NO_SECTION_RE = /^#\s*NO\s*SECTION/i;

function isSignalLine(text: string): boolean {
  return BLOCK_SIGNAL_RES.some((re) => re.test(text));
}

function isSectionBoundaryLine(text: string): boolean {
  if (NO_SECTION_RE.test(text)) return true;
  return SECTION_MARKER_RE.test(text) && !/^\d+[\.\)\-]/.test(text);
}

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
 *
 * Passage handling: lines between a section header and its first question are
 * accumulated into the section (never dropped), and numbered lines that carry
 * no question signals (options or TYPE/Answer/Explanation/Guide/Tags markers)
 * are treated as passage text when a later real question exists under the same
 * section — so cloze gap numbers can't splinter a passage into phantom
 * questions. Bare numbered lists with no signals anywhere keep the legacy
 * behaviour and still parse as questions.
 */
export function parseBulkText(source: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = splitRichLines(source);

  // Pre-scan: a numbered line only starts a real question when its block
  // (up to the next numbered line) carries question signals — options or
  // TYPE/Answer/Explanation/Guide/Tags markers. Numbered lines inside a
  // passage (e.g. cloze gap numbers) carry no signals and are kept as
  // passage text, provided a later real question exists under the same
  // section. This keeps bare theory/markup-free lists working as before.
  const numberedPositions: number[] = [];
  lines.forEach((line, index) => {
    if (QUESTION_START_RE.test(cleanText(line.text))) numberedPositions.push(index);
  });

  const blockHasSignal = (position: number): boolean => {
    const positionIndex = numberedPositions.indexOf(position);
    const end = positionIndex >= 0 && positionIndex + 1 < numberedPositions.length
      ? numberedPositions[positionIndex + 1]
      : lines.length;
    for (let i = position + 1; i < end; i += 1) {
      if (isSignalLine(cleanText(lines[i].text))) return true;
    }
    return false;
  };

  const blockIsRealCache = new Map<number, boolean>();
  const laterRealBlockExists = (position: number): boolean => {
    const positionIndex = numberedPositions.indexOf(position);
    for (let n = positionIndex + 1; n < numberedPositions.length; n += 1) {
      const nextPos = numberedPositions[n];
      // A section boundary ends the current passage span.
      let hitBoundary = false;
      for (let i = position + 1; i < nextPos; i += 1) {
        if (isSectionBoundaryLine(cleanText(lines[i].text))) {
          hitBoundary = true;
          break;
        }
      }
      if (hitBoundary) return false;
      let isReal = blockIsRealCache.get(nextPos);
      if (isReal === undefined) {
        isReal = blockHasSignal(nextPos);
        blockIsRealCache.set(nextPos, isReal);
      }
      if (isReal) return true;
    }
    return false;
  };

  const lineStartsRealQuestion = (position: number): boolean => {
    let isReal = blockIsRealCache.get(position);
    if (isReal === undefined) {
      isReal = blockHasSignal(position);
      blockIsRealCache.set(position, isReal);
    }
    if (isReal) return true;
    // Non-signal numbered lines are passage text only when a later real
    // question exists under the same section; otherwise keep legacy
    // behaviour so bare theory lists still parse as questions.
    return !laterRealBlockExists(position);
  };

  let currentSection: string | null = null;
  let currentQuestion: WorkingQuestion | null = null;

  const pushCurrentQuestion = () => {
    const parsed = finalizeQuestion(currentQuestion);
    if (parsed) questions.push(parsed);
    currentQuestion = null;
  };

  const appendToSection = (html: string) => {
    const cleanPart = sanitizeRichHtml(html);
    if (!cleanPart) return;
    currentSection = sanitizeRichHtml(`${currentSection || ''}<br>${cleanPart}`);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const text = cleanText(line.text);
    if (!text) continue;

    if (NO_SECTION_RE.test(text)) {
      currentSection = null;
      continue;
    }

    const sectionMatch = text.match(SECTION_MARKER_RE);
    if (sectionMatch && !/^\d+[\.\)\-]/.test(text)) {
      const value = markerValueHtml(line, /^(?:SECTION|INSTRUCTION|PASSAGE|PART)\s*[:\-]?\s*/i);
      currentSection = sanitizeRichHtml(value || sectionMatch[1] || '');
      continue;
    }

    const questionMatch = text.match(QUESTION_START_RE);
    if (questionMatch && lineStartsRealQuestion(index)) {
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

    if (!currentQuestion) {
      // Between a section header and its first question: this is passage
      // body, not a question. Accumulate it into the section instead of
      // dropping it, so long passages survive intact.
      if (currentSection) appendToSection(line.html);
      continue;
    }

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
