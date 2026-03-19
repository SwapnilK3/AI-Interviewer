import { GoogleGenerativeAI } from "@google/generative-ai";

import { db } from "@/firebase/admin";

type Message = {
  role: "user" | "ai";
  content: string;
};

type FeedbackPayload = {
  totalScore: number;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
};

const modelName = "gemini-2.5-flash";

const stripMarkdownFences = (input: string) =>
  input.replace(/^```json\s*|```$/g, "").trim();

const isValidFeedback = (data: unknown): data is FeedbackPayload => {
  const obj = data as FeedbackPayload;

  return !!(
    obj &&
    typeof obj.totalScore === "number" &&
    Array.isArray(obj.categoryScores) &&
    obj.categoryScores.length > 0 &&
    obj.categoryScores.every(
      (category) =>
        typeof category?.name === "string" &&
        typeof category?.score === "number" &&
        typeof category?.comment === "string"
    ) &&
    Array.isArray(obj.strengths) &&
    obj.strengths.every((item) => typeof item === "string") &&
    Array.isArray(obj.areasForImprovement) &&
    obj.areasForImprovement.every((item) => typeof item === "string") &&
    typeof obj.finalAssessment === "string"
  );
};

export async function POST(request: Request) {
  try {
    const { messages, interviewId } = (await request.json()) as {
      messages?: Message[];
      interviewId?: string;
    };

    if (!interviewId?.trim()) {
      return Response.json({ error: "interviewId is required." }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages is required." }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY." },
        { status: 500 }
      );
    }

    const transcript = messages
      .filter(
        (message): message is Message =>
          !!message?.content?.trim() && (message.role === "user" || message.role === "ai")
      )
      .map((message) => `${message.role.toUpperCase()}: ${message.content.trim()}`)
      .join("\n");

    if (!transcript.trim()) {
      return Response.json({ error: "No valid messages to evaluate." }, { status: 400 });
    }

    const prompt = `You are a senior interview evaluator.
Evaluate the following mock interview transcript and return ONLY valid JSON.

Transcript:
${transcript}

Return exactly this JSON shape:
{
  "totalScore": number,
  "categoryScores": [
    { "name": "Communication", "score": number, "comment": string },
    { "name": "Technical Knowledge", "score": number, "comment": string },
    { "name": "Problem Solving", "score": number, "comment": string },
    { "name": "Confidence", "score": number, "comment": string }
  ],
  "strengths": string[],
  "areasForImprovement": string[],
  "finalAssessment": string
}

Rules:
- totalScore must be between 0 and 100.
- Keep comments concise and specific.
- Do not include markdown or code fences.`;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const parsed = JSON.parse(stripMarkdownFences(raw)) as unknown;

    if (!isValidFeedback(parsed)) {
      return Response.json(
        { error: "Generated feedback did not match required shape." },
        { status: 422 }
      );
    }

    const feedback: FeedbackPayload = {
      ...parsed,
      totalScore: Math.max(0, Math.min(100, Number(parsed.totalScore))),
      categoryScores: parsed.categoryScores.slice(0, 4),
    };

    await db.collection("feedback").doc(interviewId).set({
      ...feedback,
      interviewId,
      createdAt: new Date().toISOString(),
    });

    return Response.json({ success: true, feedback }, { status: 200 });
  } catch (error) {
    console.error("Generate feedback route error:", error);
    return Response.json(
      { error: "Failed to generate interview feedback." },
      { status: 500 }
    );
  }
}
