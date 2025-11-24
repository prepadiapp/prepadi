import { QuestionType } from '@/lib/generated/prisma/enums';

export interface ParsedQuestion {
  id: string;
  text: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
  tags: string[];
  type: QuestionType;
  section: string | null;
  error?: string;
}

const clean = (text: string) => text.trim().replace(/\s+/g, ' ');

/**
 * Main entry point
 */
export function parseBulkText(rawText: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  // 1. Split by Headers OR the Reset Marker (#NO SECTION)
  const sectionParts = rawText.split(/^(?=SECTION|INSTRUCTION|#\s*NO\s*SECTION)/im);

  let currentSection: string | null = null;

  sectionParts.forEach((part) => {
    if (!part.trim()) return;

    // --- HANDLE SECTION HEADERS ---
    if (part.match(/^#\s*NO\s*SECTION/i)) {
      currentSection = null; // Reset section
      part = part.replace(/^#\s*NO\s*SECTION.*/i, ''); // Remove marker
    } else {
      const sectionMatch = part.match(/^(?:SECTION|INSTRUCTION).*?[:\n](.*)/i);
      if (sectionMatch) {
        const lines = part.split('\n');
        // Capture instruction (remove "SECTION:" prefix)
        currentSection = lines[0].replace(/^(SECTION|INSTRUCTION)\s*\w*[:\.]?\s*/i, '').trim();
        // Remove the header line from content
        part = lines.slice(1).join('\n');
      }
    }

    // 2. Split by Question Numbers (e.g., "1.", "42)")
    // Look for newline + number + dot/paren
    const questionBlocks = part.split(/\n(?=\d+[\.\)\-])/);

    questionBlocks.forEach((block) => {
      if (!block.trim()) return;
      const parsed = parseSingleBlock(block, currentSection);
      if (parsed) {
        questions.push(parsed);
      }
    });
  });

  return questions;
}

/**
 * UPDATED: Line-by-Line Parsing Logic
 */
function parseSingleBlock(block: string, section: string | null): ParsedQuestion | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  
  let questionText = '';
  const tempOptions: { letter: string; text: string }[] = [];
  let answerLetter = '';
  let explanation = '';
  let tags: string[] = []; // --- NEW VARIABLE ---

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Check for Answer
    const ansMatch = line.match(/^(?:Answer|Ans|Key):\s*([A-E])/i);
    if (ansMatch) {
      answerLetter = ansMatch[1].toUpperCase();
      continue;
    }

    // 2. Check for Explanation
    const expMatch = line.match(/^(?:Explanation|Solution|Note):\s*(.*)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
      continue;
    }

    // --- 3. NEW: Check for Tags ---
    // Matches "Tags: algebra, math" or "Topic: geometry"
    const tagMatch = line.match(/^(?:Tags?|Topic|Category):\s*(.*)/i);
    if (tagMatch) {
      // Split by comma, trim whitespace, and lower case
      tags = tagMatch[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      continue;
    }
    // ------------------------------

    // 4. Check for Option
    const optMatch = line.match(/^([A-E])[\.\)]\s+(.*)/i);
    if (optMatch) {
      tempOptions.push({
        letter: optMatch[1].toUpperCase(),
        text: optMatch[2].trim()
      });
      continue;
    }

    // 5. Question Text
    if (tempOptions.length === 0) {
      const cleanLine = line.replace(/^\d+[\.\)\-]\s*/, '');
      questionText += (questionText ? ' ' : '') + cleanLine;
    }
  }

  if (!questionText) return null;

  const type = tempOptions.length > 0 ? QuestionType.OBJECTIVE : QuestionType.THEORY;

  const options = tempOptions.map(opt => ({
    text: opt.text,
    isCorrect: opt.letter === answerLetter,
  }));

  return {
    id: Math.random().toString(36).substr(2, 9),
    text: clean(questionText),
    options,
    explanation: clean(explanation),
    tags, // --- Return tags ---
    type,
    section,
    error: type === QuestionType.OBJECTIVE && !answerLetter ? 'No answer detected' : undefined
  };
}