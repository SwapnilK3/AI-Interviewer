"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

const modelName = "gemini-2.5-flash";

const sanitizeJson = (input: string) =>
  input.replace(/^```json\s*|```$/g, "").trim();

const normalizeFeedbackShape = (raw: unknown) => {
  const data = raw as Partial<Feedback> & {
    categoryScores?: Array<{ name?: string; score?: number; comment?: string }>;
    strengths?: string[];
    areasForImprovement?: string[];
    finalAssessment?: string;
    totalScore?: number;
  };

  const expectedCategories = [
    "Communication Skills",
    "Technical Knowledge",
    "Problem Solving",
    "Cultural Fit",
    "Confidence and Clarity",
  ];

  const categoryScores = expectedCategories.map((name) => {
    const found = data.categoryScores?.find(
      (category) => category.name?.toLowerCase() === name.toLowerCase()
    );

    return {
      name,
      score: Number.isFinite(found?.score) ? Number(found?.score) : 0,
      comment: found?.comment?.trim() || "No detailed comment provided.",
    };
  });

  return {
    totalScore: Number.isFinite(data.totalScore) ? Number(data.totalScore) : 0,
    categoryScores,
    strengths:
      data.strengths?.filter((item): item is string => typeof item === "string") ||
      [],
    areasForImprovement:
      data.areasForImprovement?.filter(
        (item): item is string => typeof item === "string"
      ) || [],
    finalAssessment: data.finalAssessment || "No final assessment provided.",
  };
};

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY.");
    }

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are a professional interviewer analyzing a mock interview.
Evaluate strictly and provide actionable insights.

Transcript:
${formattedTranscript}

Return only valid JSON with this shape:
{
  "totalScore": number,
  "categoryScores": [
    { "name": "Communication Skills", "score": number, "comment": string },
    { "name": "Technical Knowledge", "score": number, "comment": string },
    { "name": "Problem Solving", "score": number, "comment": string },
    { "name": "Cultural Fit", "score": number, "comment": string },
    { "name": "Confidence and Clarity", "score": number, "comment": string }
  ],
  "strengths": string[],
  "areasForImprovement": string[],
  "finalAssessment": string
}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const rawObject = JSON.parse(sanitizeJson(rawText));
    const normalizedObject = normalizeFeedbackShape(rawObject);

    const parsedFeedback = feedbackSchema.safeParse(normalizedObject);
    if (!parsedFeedback.success) {
      throw new Error("Gemini response does not match feedback schema.");
    }

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: parsedFeedback.data.totalScore,
      categoryScores: parsedFeedback.data.categoryScores,
      strengths: parsedFeedback.data.strengths,
      areasForImprovement: parsedFeedback.data.areasForImprovement,
      finalAssessment: parsedFeedback.data.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  try {
    const { userId, limit = 20 } = params;

    const fetchLimit = Math.max(limit * 3, 20);

    const snapshot = await db
      .collection("interviews")
      .where("finalized", "==", true)
      .limit(fetchLimit)
      .get();

    const allFinalized = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];

    allFinalized.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return allFinalized
      .filter((interview) => interview.userId !== userId)
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting latest interviews:", error);
    return [];
  }
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  try {
    const snapshot = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .get();

    const interviews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];

    return interviews.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error getting interviews by user id:", error);
    return [];
  }
}
