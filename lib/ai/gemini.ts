import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ⚡ Fast + multimodal (images, quick responses)
export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// 🧠 Higher reasoning + better text generation
export const geminiPro = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
});
