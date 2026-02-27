import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash"];
const GROQ_FALLBACK_MODELS = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"];

const TAILOR_SYSTEM_PROMPT = `You are Tailor AI — a friendly, expert virtual tailor and sewing assistant. 
You help users with:
- Garment repairs and alterations
- Fabric selection and care
- Sewing techniques and tools
- Pattern reading and adjustments
- Fashion advice

Always be encouraging, clear, and practical. Use markdown formatting for structured responses.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    const latestMessage = messages[messages.length - 1].content;

    // Try Gemini models first
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: TAILOR_SYSTEM_PROMPT,
        });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(latestMessage);
        const responseText = result.response.text();
        return NextResponse.json({ success: true, message: responseText });
      } catch (err: any) {
        console.warn(`Gemini chat model ${modelName} failed:`, err.message);
      }
    }

    // Fallback to Groq
    for (const model of GROQ_FALLBACK_MODELS) {
      try {
        const groqMessages = [
          { role: "system" as const, content: TAILOR_SYSTEM_PROMPT },
          ...messages.map((m: any) => ({
            role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          })),
        ];
        const response = await groq.chat.completions.create({
          model,
          messages: groqMessages,
          temperature: 0.7,
        });
        const responseText = response.choices[0].message.content ?? "";
        return NextResponse.json({ success: true, message: responseText });
      } catch (err: any) {
        console.warn(`Groq fallback model ${model} failed:`, err.message);
      }
    }

    throw new Error("All chat models failed");
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat" },
      { status: 500 },
    );
  }
}
