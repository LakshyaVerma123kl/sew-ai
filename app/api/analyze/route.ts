import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- INIT SDKs ONCE ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Models with fallbacks
const VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];
const REASONING_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];
const WHISPER_MODELS = ["whisper-large-v3", "whisper-large-v3-turbo"];

// Helper: try Gemini vision with fallback
async function tryGeminiVision(
  prompt: string,
  imagePart: any,
): Promise<string> {
  for (const modelName of VISION_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([prompt, imagePart]);
      return result.response.text();
    } catch (err: any) {
      console.warn(`Gemini model ${modelName} failed:`, err.message);
    }
  }
  throw new Error("All Gemini vision models failed");
}

// Helper: try Groq chat with fallback
async function tryGroqChat(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  for (const model of REASONING_MODELS) {
    try {
      const response = await groq.chat.completions.create({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      return response.choices[0].message.content ?? "";
    } catch (err: any) {
      console.warn(`Groq model ${model} failed:`, err.message);
    }
  }
  throw new Error("All Groq reasoning models failed");
}

// Helper: try Whisper transcription with fallback
async function tryWhisperTranscription(audioFile: File): Promise<string> {
  for (const model of WHISPER_MODELS) {
    try {
      const response = await groq.audio.transcriptions.create({
        file: audioFile,
        model,
        prompt: "Tailoring, sewing, dress, hem, seam, tear, fabric, stitch.",
        response_format: "json",
      });
      return response.text;
    } catch (err: any) {
      console.warn(`Whisper model ${model} failed:`, err.message);
    }
  }
  return "Could not transcribe audio.";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const imageBase64 = formData.get("image") as string;
    const audioFile = formData.get("audio") as File | null;
    const textContext = formData.get("text") as string | null;

    if (!imageBase64) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // STEP 1: AUDIO → GROQ WHISPER
    let transcription =
      textContext || "User did not provide audio or text context.";

    if (audioFile && audioFile.size > 0) {
      const audioTranscription = await tryWhisperTranscription(audioFile);
      transcription = audioTranscription || transcription;
    }

    // STEP 2: IMAGE → GEMINI FLASH (with fallback)
    const base64Data = imageBase64.split(",")[1];
    const mimeType = imageBase64.substring(
      imageBase64.indexOf(":") + 1,
      imageBase64.indexOf(";"),
    );

    const visionPrompt = `You are an expert tailor and seamstress with 20+ years of experience.

The user said: "${transcription}"

Look carefully at the garment in this image. Provide:
1. **Garment Type**: What type of clothing is this?
2. **Issue Identified**: What specific problem do you see? (tears, loose seams, hem issues, fabric damage, fit problems, etc.)
3. **Severity**: Rate the issue (Minor / Moderate / Major)
4. **Location**: Where exactly on the garment is the issue?
5. **Technical Observations**: Brief, precise notes on the construction issue.

Be specific and professional. If you cannot clearly see an issue, say so.`;

    const imagePart = {
      inlineData: { data: base64Data, mimeType },
    };

    const visionAnalysis = await tryGeminiVision(visionPrompt, imagePart);

    // STEP 3: GROQ LLAMA → REPAIR INSTRUCTIONS
    const systemPrompt = `You are a master tailor with expert knowledge of garment repair, fabric care, and sewing techniques. You provide clear, encouraging, and actionable repair instructions.`;

    const userPrompt = `Based on this garment analysis:

${visionAnalysis}

Please provide a comprehensive repair guide in markdown format:

## 🔍 Issue Summary
[Brief summary of what was found]

## 🛠️ Tools & Materials Needed
- [List every tool and material required]

## 📋 Step-by-Step Repair Instructions
1. [Detailed step]
2. [Detailed step]
...

## 💡 Beginner Tips
- [Tips for someone new to sewing]

## ⚠️ Common Mistakes to Avoid
- [What NOT to do]

## ✅ Final Check
[How to verify the repair is done correctly]

## 💪 Encouragement
[A short motivating message]

Format everything in clean, readable markdown.`;

    const finalAnswer = await tryGroqChat(systemPrompt, userPrompt);

    return NextResponse.json({
      success: true,
      transcription,
      visionAnalysis,
      analysis: finalAnswer,
    });
  } catch (error: any) {
    console.error("Error analyzing dress:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze the garment." },
      { status: 500 },
    );
  }
}
