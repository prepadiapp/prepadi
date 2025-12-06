import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Parses a base64 image of a question paper into structured data.
 */
export async function parseQuestionImage(base64Image: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using vision capable model
      messages: [
        {
          role: "system",
          content: `You are an expert exam question parser. 
          Analyze the image and extract the question.
          If it is multiple choice, extract options and indicate the correct answer if marked.
          If it is theory, provide a sample marking guide.
          Return JSON format: { text: string, type: 'OBJECTIVE' | 'THEORY', options?: {text: string, isCorrect: boolean}[], explanation?: string, markingGuide?: string }`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the question from this image." },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content || "{}");
  } catch (error) {
    console.error("AI Image Parse Error:", error);
    return null;
  }
}

/**
 * Generates relevant tags for a question based on its text and subject.
 */
export async function generateTags(questionText: string, subjectName: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cheaper model for text tasks
      messages: [
        {
          role: "system",
          content: `You are an academic classifier. Generate 1-3 short, relevant tags (topics) for this ${subjectName} question. Return JSON: { tags: string[] }`
        },
        {
          role: "user",
          content: questionText
        }
      ],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return data.tags || [];
  } catch (error) {
    console.error("AI Tag Gen Error:", error);
    return [];
  }
}

/**
 * Grades a theory answer against a marking guide.
 */
export async function gradeTheoryAnswer(questionText: string, studentAnswer: string, markingGuide: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a WAEC examiner. Grade the student's answer based strictly on the marking guide.
          Question: ${questionText}
          Marking Guide: ${markingGuide}
          
          Provide:
          1. A boolean "isCorrect" (True if they got at least 50% of the points).
          2. A "score" percentage (0-100).
          3. Short "feedback" explaining the score.
          
          Return JSON.`
        },
        {
          role: "user",
          content: `Student Answer: ${studentAnswer}`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("AI Grading Error:", error);
    return { isCorrect: false, score: 0, feedback: "AI Service Unavailable" };
  }
}