import { GoogleGenerativeAI } from "@google/generative-ai";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

const modelName = "gemini-2.5-flash";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    if (!userid || !role || !level || !type || !techstack || !amount) {
      return Response.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const questionAmount = Number(amount);
    if (!Number.isFinite(questionAmount) || questionAmount <= 0 || questionAmount > 20) {
      return Response.json(
        { success: false, error: "amount must be between 1 and 20." },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { success: false, error: "Missing GOOGLE_GENERATIVE_AI_API_KEY." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `Prepare interview questions for a ${role} role.
Experience level: ${level}.
Tech stack: ${techstack}.
Question focus: ${type}.
Number of questions: ${questionAmount}.

Return only valid JSON in this format:
["Question 1", "Question 2"]

Do not include markdown, code fences, or extra text.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const sanitized = responseText.replace(/^```json\s*|```$/g, "").trim();
    const parsed = JSON.parse(sanitized);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid questions format returned by Gemini.");
    }

    const interview = {
      role,
      type,
      level,
      techstack: String(techstack)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      questions: parsed,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(interview);

    return Response.json({ success: true, interviewId: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("Interview generation error:", error);
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Interview generator ready." }, { status: 200 });
}