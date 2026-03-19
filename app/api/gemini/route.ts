import { GoogleGenerativeAI } from "@google/generative-ai";

const modelName = "gemini-2.5-flash";

type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

export async function POST(request: Request) {
  try {
    const { messages, systemPrompt } = (await request.json()) as {
      messages?: ChatMessage[];
      systemPrompt?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "messages is required and must be a non-empty array." },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt?.trim() || "You are a helpful assistant.",
    });

    const normalized = messages
      .filter(
        (message): message is ChatMessage =>
          !!message?.content?.trim() && (message.role === "user" || message.role === "ai")
      )
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    const dedupedMessages = normalized.reduce<ChatMessage[]>((acc, current) => {
      if (acc.length === 0) return [current];

      const last = acc[acc.length - 1];
      if (last.role === current.role) {
        return [...acc.slice(0, -1), current];
      }

      return [...acc, current];
    }, []);

    const validMessages =
      dedupedMessages[0]?.role === "user"
        ? dedupedMessages
        : dedupedMessages.slice(1);

    if (validMessages.length === 0) {
      return Response.json(
        { error: "No valid message content was provided." },
        { status: 400 }
      );
    }

    const lastMessage = validMessages[validMessages.length - 1];
    if (lastMessage.role !== "user") {
      return Response.json(
        { error: "Last message must be from user." },
        { status: 400 }
      );
    }

    const history = validMessages.slice(0, -1).map((message) => ({
      role: message.role === "ai" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text().trim();

    if (!text) {
      return Response.json(
        { error: "Gemini returned an empty response." },
        { status: 500 }
      );
    }

    return Response.json({ response: text }, { status: 200 });
  } catch (error) {
    console.error("Gemini route error:", error);
    const message = error instanceof Error ? error.message : "Gemini API failed";
    return Response.json(
      { error: message || "Gemini API failed" },
      { status: 500 }
    );
  }
}