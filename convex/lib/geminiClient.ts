import { startActiveObservation, Observation } from './langfuse';
import { internal } from '../_generated/api';

// ── Types ──────────────────────────────────────────────────────

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';

export interface GeminiUploadResponse {
  file: {
    name: string;
    uri: string;
    mimeType: string;
    state: string;
  };
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message: string };
}

export interface GeminiGenerateParams {
  model: string;
  fileUri: string;
  fileMimeType: string;
  systemPrompt: string;
  userPrompt: string;
  apiKey: string;
  temperature?: number;
  maxOutputTokens?: number;
  action?: string;
}

export interface GeminiLogContext {
  ctx: { runMutation: <T>(fn: any, args: any) => Promise<T> };
  clerkUserId: string;
}

// ── Helpers ────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Upload file to Gemini File API ────────────────────────────

export async function uploadFile(videoBuffer: Uint8Array, fileName: string, apiKey: string): Promise<GeminiUploadResponse> {
  const sizeMb = (videoBuffer.length / 1024 / 1024).toFixed(1);
  console.log(`[geminiClient] uploadFile: ${fileName} (${sizeMb} MB)`);

  return startActiveObservation<GeminiUploadResponse>(
    'geminiClient.uploadFile',
    async (span: Observation) => {
      span.update({ fileName, buffer_size_mb: sizeMb });

      const metadata = JSON.stringify({ file: { displayName: fileName } });
      const boundary = '---gemini-upload-boundary---';

      const encoder = new TextEncoder();
      const part1 = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`);
      const part2 = encoder.encode(`--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`);
      const ending = encoder.encode(`\r\n--${boundary}--\r\n`);

      const bodyBlob = new Blob([part1, part2, videoBuffer as BlobPart, ending]);

      const response = await fetch(`${GEMINI_API_BASE}/upload/v1beta/files?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(bodyBlob.size),
          'X-Goog-Upload-Protocol': 'multipart',
        },
        body: bodyBlob,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const msg = `Gemini File upload failed (${response.status}): ${errorText.slice(0, 300)}`;
        console.error(`[geminiClient] ${msg}`);
        throw new Error(msg);
      }

      const result = (await response.json()) as GeminiUploadResponse;
      span.update({ file_uri: result.file.uri, file_state: result.file.state });
      console.log(`[geminiClient] uploadFile OK: ${result.file.name} → ${result.file.state}`);
      return result;
    },
    { asType: 'span' }
  );
}

// ── Wait for file to become ACTIVE ────────────────────────────

export async function waitForFileActive(fileName: string, apiKey: string, maxWaitMs = 120000): Promise<void> {
  console.log(`[geminiClient] waitForFileActive: ${fileName}`);

  return startActiveObservation<void>(
    'geminiClient.waitForFileActive',
    async (span: Observation) => {
      span.update({ fileName, max_wait_ms: maxWaitMs });
      let pollCount = 0;
      const start = Date.now();

      while (Date.now() - start < maxWaitMs) {
        pollCount++;
        const response = await fetch(`${GEMINI_API_BASE}/v1beta/${fileName}?key=${apiKey}`);
        if (!response.ok) {
          const msg = `Failed to check file status: ${response.status}`;
          console.error(`[geminiClient] ${msg}`);
          throw new Error(msg);
        }
        const data = await response.json();

        if (data.state === 'ACTIVE') {
          span.update({ poll_count: pollCount, final_state: 'ACTIVE' });
          console.log(`[geminiClient] File ACTIVE after ${pollCount} polls`);
          return;
        }
        if (data.state === 'FAILED') {
          span.update({ poll_count: pollCount, final_state: 'FAILED' });
          const msg = `Gemini file processing failed: ${data.error?.message ?? 'unknown'}`;
          console.error(`[geminiClient] ${msg}`);
          throw new Error(msg);
        }

        await sleep(3000);
      }

      span.update({ poll_count: pollCount, final_state: 'TIMEOUT' });
      console.error(`[geminiClient] Timeout waiting for file ACTIVE (${pollCount} polls)`);
      throw new Error('Timeout waiting for Gemini file to become ACTIVE');
    },
    { asType: 'span' }
  );
}

// ── Generate content with retry ───────────────────────────────

export async function generateContent(params: GeminiGenerateParams, logContext?: GeminiLogContext, retries = 3, baseDelayMs = 500): Promise<{ text: string; finishReason: string | undefined }> {
  const { model, fileUri, fileMimeType, systemPrompt, userPrompt, apiKey, temperature = 0.2, maxOutputTokens = 65536, action = 'geminiClient.generateContent' } = params;

  const startTime = Date.now();

  const storeLog = async (response?: string, error?: string) => {
    if (!logContext) return;
    try {
      await logContext.ctx.runMutation(internal.llmLogs.storeLlmLog, {
        clerkUserId: logContext.clerkUserId,
        action,
        model,
        systemPrompt,
        userPrompt,
        response,
        error,
        durationMs: Date.now() - startTime,
      });
    } catch (e) {
      console.warn('Failed to store Gemini LLM log:', e);
    }
  };

  return startActiveObservation<{ text: string; finishReason: string | undefined }>(
    'geminiClient.generateContent',
    async (span: Observation) => {
      span.update({
        action,
        model,
        temperature,
        system_length: systemPrompt.length,
        user_length: userPrompt.length,
        retries,
      });

      let lastErr: unknown;

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          span.update({ attempt: attempt + 1 });

          const body = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              {
                role: 'user',
                parts: [{ file_data: { mime_type: fileMimeType, file_uri: fileUri } }, { text: userPrompt }],
              },
            ],
            generationConfig: { temperature, maxOutputTokens, responseMimeType: 'text/plain' },
          };

          const response = await fetch(`${GEMINI_API_BASE}/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`Gemini generateContent failed (${response.status}): ${errorText.slice(0, 300)}`);
          }

          const data = (await response.json()) as GeminiGenerateResponse;

          if (data.error) {
            throw new Error(`Gemini API error: ${data.error.message}`);
          }

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          const finishReason = data.candidates?.[0]?.finishReason;

          if (!text) {
            throw new Error('Gemini returned empty response');
          }

          if (finishReason && finishReason !== 'STOP') {
            console.warn(`[geminiClient] finishReason=${finishReason} (response may be truncated, ${text.length} chars)`);
          }
          span.update({ finish_reason: finishReason, output_length: text.length });
          await storeLog(text);
          return { text, finishReason };
        } catch (error) {
          lastErr = error;
          span.update({ error: error instanceof Error ? error.message : String(error) });
          if (attempt < retries - 1) {
            await sleep(baseDelayMs * Math.pow(2, attempt));
            continue;
          }
          console.error(`Gemini generateContent failed in ${action}:`, error);
        }
      }

      await storeLog(undefined, lastErr instanceof Error ? (lastErr as Error).message : String(lastErr));
      throw lastErr || new Error('Gemini generateContent failed after retries');
    },
    { asType: 'generation' }
  );
}
