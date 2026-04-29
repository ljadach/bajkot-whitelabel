/**
 * Gemini native image generation via REST API.
 * Ported from trustee-book-pipeline/demo/src/lib/geminiImageGen.ts
 *
 * Uses gemini-2.5-flash-image with responseModalities: ["IMAGE"].
 * Returns base64 image data as a Uint8Array for Convex storage.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.5-flash-image';

/** Recommended delay between sequential generateImage() calls. The caller
 * (currently A7 illustrate loop) is responsible for spacing — module-level
 * state is unreliable in serverless because each Convex action invocation
 * may land on a fresh V8 context. */
export const IMAGE_GEN_MIN_INTERVAL_MS = 2_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate an image via Gemini Imagen API.
 * Returns raw PNG bytes as Uint8Array (suitable for Convex storage.store(new Blob(...))).
 * Returns null if generation fails (caller should handle gracefully).
 */
export async function generateImage(
  prompt: string,
  options: {
    width?: number;
    height?: number;
  } = {},
): Promise<Uint8Array | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn('[ImageGen] No GOOGLE_GENERATIVE_AI_API_KEY — skipping image generation');
    return null;
  }

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(
        `[ImageGen] Generating (attempt ${attempt + 1}): "${prompt.substring(0, 80)}..."`,
      );

      const response = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
          },
        }),
      });

      if (response.status === 429) {
        const waitSec = 30 * (attempt + 1);
        console.warn(`[ImageGen] Rate limited (429). Waiting ${waitSec}s...`);
        await sleep(waitSec * 1000);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data = await response.json();

      // Extract image from response parts
      const candidates = data.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            // Convert base64 to Uint8Array
            const binaryString = atob(part.inlineData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            console.log(
              `[ImageGen] Got image (${part.inlineData.mimeType}, ${(bytes.length / 1024).toFixed(0)}KB)`,
            );
            return bytes;
          }
        }
      }

      // Check for safety blocks
      if (data.promptFeedback?.blockReason) {
        console.warn(`[ImageGen] Blocked by safety filter: ${data.promptFeedback.blockReason}`);
      }

      throw new Error('No image data in response');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[ImageGen] Attempt ${attempt + 1} failed: ${msg}`);
      if (attempt < maxRetries - 1) {
        await sleep(5000);
        continue;
      }
    }
  }

  console.warn('[ImageGen] All attempts failed — returning null');
  return null;
}
