import OpenAI from "openai";

type ParsedOption = {
  text: string;
  isCorrect: boolean;
};

type ParsedQuestion = {
  text: string;
  type: "OBJECTIVE" | "THEORY";
  options: ParsedOption[];
  explanation?: string | null;
  markingGuide?: string | null;
  tags: string[];
  section?: string | null;
};

type ParsedQuestionPayload = {
  questions: ParsedQuestion[];
};

type TheoryGradePayload = {
  isCorrect: boolean;
  score: number;
  feedback: string;
};

type TagPayload = {
  tags: string[];
};

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const openRouterClient = openRouterApiKey
  ? new OpenAI({
      apiKey: openRouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Prepadi",
      },
    })
  : null;

const MODEL_NAME = process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini";

const DEFAULT_COMPLETION_CONFIG = {
  model: MODEL_NAME,
  temperature: 0.2,
  response_format: { type: "json_object" as const },
};

function requireAiClient() {
  if (!openRouterClient) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  return openRouterClient;
}

function extractTextContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function safeJsonParse<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim()) as T;
    }

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as T;
    }

    throw new Error("AI response was not valid JSON");
  }
}

function normalizeQuestionPayload(payload: ParsedQuestionPayload): ParsedQuestionPayload {
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];

  return {
    questions: questions
      .map((question): ParsedQuestion => ({
        text: String(question?.text || "").trim(),
        type: question?.type === "THEORY" ? "THEORY" : "OBJECTIVE",
        options: Array.isArray(question?.options)
          ? question.options
              .map((option) => ({
                text: String(option?.text || "").trim(),
                isCorrect: Boolean(option?.isCorrect),
              }))
              .filter((option) => option.text.length > 0)
          : [],
        explanation: question?.explanation ? String(question.explanation).trim() : null,
        markingGuide: question?.markingGuide ? String(question.markingGuide).trim() : null,
        tags: Array.isArray(question?.tags)
          ? question.tags
              .map((tag) => String(tag || "").trim())
              .filter(Boolean)
              .slice(0, 5)
          : [],
        section: question?.section ? String(question.section).trim() : null,
      }))
      .filter((question) => question.text.length > 0),
  };
}

async function requestJson<T>(messages: Array<Record<string, unknown>>, maxTokens = 4000): Promise<T> {
  const client = requireAiClient();

  const response = await client.chat.completions.create({
    ...DEFAULT_COMPLETION_CONFIG,
    messages: messages as any,
    max_tokens: maxTokens,
  });

  const rawContent = extractTextContent(response.choices[0]?.message?.content);

  if (!rawContent) {
    throw new Error("AI response was empty");
  }

  return safeJsonParse<T>(rawContent);
}

/**
 * Parses a base64 image of a question paper (supports multiple questions per page).
 */
export async function parseQuestionImage(base64Image: string) {
  try {
    const prompt = `
Analyze this image of an exam paper and extract every visible question.

Return JSON only in this exact structure:
{
  "questions": [
    {
      "text": "Full question text",
      "type": "OBJECTIVE" or "THEORY",
      "options": [{"text": "Option A", "isCorrect": false}],
      "explanation": "Brief explanation if visible, otherwise empty string",
      "markingGuide": "Marking guide or key points if visible, otherwise empty string",
      "tags": ["1 to 3 short topic tags"],
      "section": "Shared instruction or passage text if applicable, otherwise empty string"
    }
  ]
}

Rules:
- Extract all questions on the page.
- If the correct option is not explicitly shown, leave all option isCorrect values as false.
- Preserve any shared passage/instruction in the "section" field for each related question.
- If a question is essay/theory based, use type "THEORY" and leave options as an empty array.
- Keep tags short and relevant.
- Do not omit questions just because formatting is messy.
`.trim();

    const parsed = await requestJson<ParsedQuestionPayload>(
      [
        {
          role: "system",
          content:
            "You extract exam questions from images into clean JSON for a CBT platform. Return JSON only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      6000
    );

    return normalizeQuestionPayload(parsed);
  } catch (error) {
    console.error("OpenRouter Image Parse Error:", error);
    return { questions: [] };
  }
}

/**
 * Parses raw text block containing multiple questions using AI.
 */
export async function parseBulkTextWithAI(rawText: string) {
  try {
    const prompt = `
Analyze the following raw exam text and extract all questions into structured JSON.

Raw Text:
"""
${rawText.substring(0, 30000)}
"""

Return JSON only in this exact structure:
{
  "questions": [
    {
      "text": "Full question text",
      "type": "OBJECTIVE" or "THEORY",
      "options": [{"text": "Option A", "isCorrect": false}],
      "explanation": "Brief explanation if provided, otherwise empty string",
      "markingGuide": "Marking guide or key points if provided, otherwise empty string",
      "tags": ["1 to 3 short topic tags"],
      "section": "Shared instruction or passage text if applicable, otherwise empty string"
    }
  ]
}

Rules:
- Correct obvious OCR or formatting mistakes where needed.
- Detect the correct answer only if it is clearly indicated.
- Support both objective and theory questions.
- Every question should have at least one useful topic tag if the subject matter is inferable.
- Keep the output strictly as JSON.
`.trim();

    const parsed = await requestJson<ParsedQuestionPayload>(
      [
        {
          role: "system",
          content:
            "You convert raw exam text into structured JSON for a CBT platform. Return JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      7000
    );

    return normalizeQuestionPayload(parsed);
  } catch (error) {
    console.error("OpenRouter Text Parse Error:", error);
    return { questions: [] };
  }
}

/**
 * Grades a theory answer against a marking guide using AI.
 */
export async function gradeTheoryAnswer(
  questionText: string,
  studentAnswer: string,
  markingGuide: string
) {
  try {
    const prompt = `
You are a strict but fair academic examiner. Grade the student's theory answer against the marking guide.

Question: ${questionText}
Marking Guide: ${markingGuide}
Student Answer: ${studentAnswer}

Return JSON only in this exact structure:
{
  "isCorrect": true,
  "score": 0,
  "feedback": "Short constructive feedback"
}

Rules:
- Score must be a number from 0 to 100.
- Set isCorrect to true only if score is 50 or higher.
- Feedback should be short, specific, and helpful.
`.trim();

    const result = await requestJson<TheoryGradePayload>(
      [
        {
          role: "system",
          content: "You grade theory answers and return JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      1200
    );

    const score = Number.isFinite(result?.score) ? Math.max(0, Math.min(100, Number(result.score))) : 0;

    return {
      isCorrect: score >= 50,
      score,
      feedback: String(result?.feedback || "No feedback generated.").trim(),
    };
  } catch (error) {
    console.error("OpenRouter Grading Error:", error);
    return { isCorrect: false, score: 0, feedback: "AI Service Unavailable" };
  }
}

export async function generateTags(questionText: string, subjectName: string): Promise<string[]> {
  try {
    const prompt = `
Generate 1 to 3 short topic tags for this ${subjectName} question.

Question:
${questionText}

Return JSON only in this exact structure:
{
  "tags": ["tag1", "tag2"]
}

Rules:
- Tags should be short and specific.
- Do not use the subject name itself unless it is genuinely the best topic tag.
- Return at least one tag when possible.
`.trim();

    const result = await requestJson<TagPayload>(
      [
        {
          role: "system",
          content: "You generate short topical tags for exam questions and return JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      600
    );

    return Array.isArray(result?.tags)
      ? result.tags.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 3)
      : [];
  } catch (error) {
    console.error("OpenRouter Tag Generation Error:", error);
    return [];
  }
}
