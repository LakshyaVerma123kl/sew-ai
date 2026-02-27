import { NextResponse } from "next/server";
import { geminiFlash } from "@/lib/ai/gemini";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Map frontend messages to Gemini's expected history format
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    const latestMessage = messages[messages.length - 1].content;

    const chat = geminiFlash.startChat({ history });
    const result = await chat.sendMessage(latestMessage);
    const responseText = result.response.text();

    return NextResponse.json({ success: true, message: responseText });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 },
    );
  }
}
