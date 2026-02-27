import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- INIT SDKs ONCE (IMPORTANT) ---
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// ------------------------------------

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageBase64 = formData.get("image") as string;
    const audioFile = formData.get("audio") as File | null;

    if (!imageBase64) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // -------------------------------
    // STEP 1: AUDIO → GROQ WHISPER
    // -------------------------------

    let transcription = "User did not provide audio context.";

    if (audioFile && audioFile.size > 0) {
      const transcriptionResponse = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        prompt: "Tailoring, sewing, dress, hem, seam, tear, fabric.",
        response_format: "json",
      });

      transcription = transcriptionResponse.text;
    }

    // -------------------------------
    // STEP 2: IMAGE → GEMINI FLASH
    // -------------------------------

    const base64Data = imageBase64.split(",")[1];
    const mimeType = imageBase64.substring(
      imageBase64.indexOf(":") + 1,
      imageBase64.indexOf(";"),
    );

    const visionPrompt = `
You are an expert tailor and seamstress.

The user said:
"${transcription}"

1. Identify the garment issue.
2. Explain clearly what is wrong.
3. Provide short technical observations only.
Keep it structured.
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const visionResult = await geminiFlash.generateContent([
      visionPrompt,
      imagePart,
    ]);

    const visionAnalysis = visionResult.response.text();

    // -------------------------------
    // STEP 3: GROQ LLAMA 70B REASONING
    // -------------------------------

    const reasoningResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are a master tailor giving step-by-step repair instructions.",
        },
        {
          role: "user",
          content: `
Based on this garment analysis:

${visionAnalysis}

Provide:
- Step-by-step repair instructions
- Tools required
- Beginner tips
- Encouragement

Format in clean markdown.
            `,
        },
      ],
    });

    const finalAnswer = reasoningResponse.choices[0].message.content;

    // -------------------------------
    // RETURN RESPONSE
    // -------------------------------

    return NextResponse.json({
      success: true,
      transcription,
      visionAnalysis,
      analysis: finalAnswer,
    });
  } catch (error) {
    console.error("Error analyzing dress:", error);
    return NextResponse.json(
      { error: "Failed to analyze the dress." },
      { status: 500 },
    );
  }
}
