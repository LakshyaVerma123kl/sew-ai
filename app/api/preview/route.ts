import { NextResponse } from "next/server";

/**
 * Preview image generation — "what will it look like after the fix?"
 *
 * Provider priority:
 *  1. Gemini 2.0 Flash image generation (REST API — bypasses SDK type limitations)
 *  2. Replicate Stable Diffusion Inpainting (needs REPLICATE_API_TOKEN in .env.local)
 *  3. Graceful null — UI hides preview section instead of crashing
 *
 * To enable Replicate: add REPLICATE_API_TOKEN=r8_xxx to your .env.local
 */

// ── 1. Gemini image generation via REST (avoids SDK GenerationConfig type issue) ──
async function tryGeminiImageGen(
  base64Image: string,
  mimeType: string,
  issueDescription: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
            {
              text: `You are an expert fashion illustrator and photo editor.

The garment in this image has the following issue: "${issueDescription}"

Generate a photorealistic image of the EXACT SAME garment after it has been perfectly and professionally repaired:
- Fix the specific issue described above
- Keep the garment's style, color, fabric texture, and shape identical
- Keep the same background and lighting
- The result should look naturally repaired, not digitally manipulated
- Professional atelier quality finish`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        temperature: 1,
        topP: 0.95,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn("Gemini image gen HTTP error:", response.status, err);
      return null;
    }

    const data = await response.json();
    const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part.inline_data?.mime_type?.startsWith("image/")) {
        return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
      }
    }

    console.warn("Gemini image gen returned no image parts");
    return null;
  } catch (err: any) {
    console.warn("Gemini image gen failed:", err.message);
    return null;
  }
}

// ── 2. Replicate Stable Diffusion Inpainting ──
async function tryReplicate(
  base64Image: string,
  issueDescription: string,
): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  try {
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // SDXL img2img — better quality than SD inpainting for this use case
        version:
          "stability-ai/sdxl:39ed52f2146964a8895ccf3916c95c17d2b10b1a7b97a4e49be37d3b6a5ec2d0",
        input: {
          image: imageDataUrl,
          prompt: `professional tailoring repair, fixed garment, ${issueDescription}, photorealistic, high quality fashion photography, clean stitching, perfect finish`,
          negative_prompt:
            "damaged, torn, wrinkled, dirty, unprofessional, low quality, blurry",
          prompt_strength: 0.5, // Lower = more faithful to original
          num_inference_steps: 25,
          guidance_scale: 7.5,
          scheduler: "K_EULER",
        },
      }),
    });

    if (!createRes.ok) {
      console.warn("Replicate create failed:", await createRes.text());
      return null;
    }

    const prediction = await createRes.json();
    const predictionId: string = prediction.id;

    // Poll for result — max 30s
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        { headers: { Authorization: `Token ${token}` } },
      );
      const pollData = await pollRes.json();

      if (pollData.status === "succeeded") {
        const output = Array.isArray(pollData.output)
          ? pollData.output[0]
          : pollData.output;
        return output ?? null;
      }

      if (pollData.status === "failed" || pollData.status === "canceled") {
        console.warn("Replicate prediction failed:", pollData.error);
        return null;
      }
    }

    console.warn("Replicate timed out after 30s");
    return null;
  } catch (err: any) {
    console.warn("Replicate failed:", err.message);
    return null;
  }
}

// ── Route handler ──
export async function POST(req: Request) {
  try {
    const { originalImage, prompt } = await req.json();

    if (!originalImage) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const mimeType = originalImage.match(/data:([^;]+);/)?.[1] ?? "image/jpeg";
    const base64Data = originalImage.split(",")[1];
    const issueDescription =
      prompt ||
      "general garment damage — repair and restore to perfect condition";

    // Try in order
    let previewUrl: string | null = null;

    previewUrl = await tryGeminiImageGen(
      base64Data,
      mimeType,
      issueDescription,
    );

    if (!previewUrl) {
      previewUrl = await tryReplicate(base64Data, issueDescription);
    }

    if (!previewUrl) {
      // Return success:false so the UI can silently hide the preview section
      return NextResponse.json({
        success: false,
        message:
          "Preview generation unavailable. The analysis above is still complete.",
      });
    }

    return NextResponse.json({ success: true, previewUrl });
  } catch (error: any) {
    console.error("Preview API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate preview" },
      { status: 500 },
    );
  }
}
