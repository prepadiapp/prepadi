import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Use the preview model available in the environment
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

const GENERATION_CONFIG = {
  temperature: 0.5, // Lower temperature for more consistent formatting
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

/**
 * Parses a base64 image of a question paper (supports multiple questions per page).
 */
export async function parseQuestionImage(base64Image: string) {
  if (!genAI) throw new Error("GEMINI_API_KEY is not set");

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    const base64Data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const prompt = `
      Analyze this image of an exam paper. It may contain MULTIPLE questions.
      Extract ALL questions found on the page into a structured JSON array.
      
      Return a JSON object with this structure:
      {
        "questions": [
          {
            "text": "Full question text",
            "type": "OBJECTIVE" or "THEORY",
            "options": [{"text": "Option A", "isCorrect": false}, ...], 
            "explanation": "Brief explanation if visible",
            "markingGuide": "Key points if theory",
            "tags": ["tag1", "tag2"],
            "section": "Instruction or Passage text if applicable"
          }
        ]
      }
      
      Rules:
      1. If objective, mark the correct answer if indicated, otherwise all false.
      2. If questions share a common instruction (e.g., "Questions 1-5 refer to this passage"), include it in the "section" field for each question.
      3. Generate 1-3 relevant subject tags for EACH question based on its content (e.g., "Algebra", "Cell Biology").
    `;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        }
      ],
      generationConfig: GENERATION_CONFIG,
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Image Parse Error:", error);
    return { questions: [] };
  }
}

/**
 * Parses raw text block containing multiple questions using AI.
 * This is more flexible than Regex.
 */
export async function parseBulkTextWithAI(rawText: string) {
  if (!genAI) throw new Error("GEMINI_API_KEY is not set");

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      Analyze the following raw text which contains exam questions.
      Extract all questions into a structured JSON array.
      
      Raw Text:
      """
      ${rawText.substring(0, 30000)} 
      """
      
      Return a JSON object with this structure:
      {
        "questions": [
          {
            "text": "Full question text",
            "type": "OBJECTIVE" or "THEORY",
            "options": [{"text": "Option A", "isCorrect": false}, ...], 
            "explanation": "Brief explanation if provided",
            "markingGuide": "Key points if theory",
            "tags": ["tag1", "tag2"],
            "section": "Instruction or Passage text if applicable"
          }
        ]
      }
      
      Rules:
      1. Correct typos if obvious.
      2. Identify the correct answer if marked (e.g., by asterisk, bold, or separate answer key at bottom).
      3. Handle both multiple choice and essay questions.
      4. CRITICAL: Generate 1-3 relevant topic tags for EACH question based on the content (e.g. "Geometry", "Photosynthesis", "Microeconomics"). Do not leave the tags array empty.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: GENERATION_CONFIG,
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Text Parse Error:", error);
    return { questions: [] };
  }
}

/**
 * Grades a theory answer against a marking guide using Gemini.
 */
export async function gradeTheoryAnswer(questionText: string, studentAnswer: string, markingGuide: string) {
  if (!genAI) return { isCorrect: false, score: 0, feedback: "AI Configuration Error" };

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      You are a strict academic examiner. Grade this student's answer.
      
      Question: "${questionText}"
      Marking Guide/Key Points: "${markingGuide}"
      Student Answer: "${studentAnswer}"

      Return JSON:
      {
        "isCorrect": boolean (true if score >= 50),
        "score": number (0-100),
        "feedback": "Short constructive feedback explaining the score"
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: GENERATION_CONFIG,
    });

    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("Gemini Grading Error:", error);
    return { isCorrect: false, score: 0, feedback: "AI Service Unavailable" };
  }
}

export async function generateTags(questionText: string, subjectName: string): Promise<string[]> {
  if (!genAI) return [];
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Generate 1-3 short topic tags for this ${subjectName} question: "${questionText}". Return JSON: { "tags": ["tag1"] }`;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: GENERATION_CONFIG,
    });
    return JSON.parse(result.response.text()).tags || [];
  } catch (error) {
    return [];
  }
}