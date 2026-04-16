import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { startActiveObservation, Observation } from './langfuse';
import { internal } from '../_generated/api';
import { stripCodeFences, safeParseJson } from './jsonUtils';
import { type PipelineStage, getStageConfig } from './pipelineConfig';

const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const fallbackModel = 'gemini-2.0-flash-001';

const google = googleApiKey ? createGoogleGenerativeAI({ apiKey: googleApiKey }) : null;

// Type for action context (simplified)
type ActionCtx = {
  runMutation: <T>(fn: any, args: any) => Promise<T>;
};

function ensureModel(modelName: string) {
  if (!google) {
    throw new Error(
      'Google AI not configured. Set GOOGLE_GENERATIVE_AI_API_KEY in Convex environment.',
    );
  }
  return google(modelName || fallbackModel);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safety settings for Google AI. Therapeutic children's stories (e.g. potty training,
 * fears) can trigger overly sensitive default filters. We use BLOCK_ONLY_HIGH to
 * allow safe educational content while still blocking genuinely harmful material.
 */
const GOOGLE_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as const, threshold: 'BLOCK_ONLY_HIGH' as const },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as const, threshold: 'BLOCK_ONLY_HIGH' as const },
  { category: 'HARM_CATEGORY_HARASSMENT' as const, threshold: 'BLOCK_ONLY_HIGH' as const },
  { category: 'HARM_CATEGORY_HATE_SPEECH' as const, threshold: 'BLOCK_ONLY_HIGH' as const },
];

/** Build Google provider options (reasoning + safety). */
function buildProviderOptions(reasoning: boolean | undefined) {
  const base: Record<string, any> = { safetySettings: GOOGLE_SAFETY_SETTINGS };
  if (reasoning !== false) {
    base.reasoning = { enabled: true };
  }
  return { google: base } as any;
}

export interface ChatJsonParams {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  expect?: 'object' | 'array' | 'any';
  action?: string;
  reasoning?: boolean;
  images?: Array<{ data: Uint8Array; mimeType: string }>;
}

export interface LlmLogContext {
  ctx: ActionCtx;
  clerkUserId: string;
}

export async function chatJsonWithRetries<T = any>(
  params: ChatJsonParams,
  retries = 3,
  baseDelayMs = 250,
  fallback?: T,
  logContext?: LlmLogContext,
): Promise<T> {
  const {
    system,
    user,
    model = fallbackModel,
    temperature = 0.5,
    expect = 'any',
    action = 'llm.chat',
    reasoning,
    images,
  } = params;
  const providerOptions = buildProviderOptions(reasoning);
  const reasoningUsed = providerOptions !== undefined;

  // Build user content — plain text or multimodal with images
  const userContent:
    | string
    | Array<
        { type: 'text'; text: string } | { type: 'image'; image: Uint8Array; mimeType?: string }
      > =
    images && images.length > 0
      ? [
          { type: 'text' as const, text: user },
          ...images.map((img) => ({
            type: 'image' as const,
            image: img.data,
            mimeType: img.mimeType,
          })),
        ]
      : user;

  const spanAttributes = {
    action,
    model,
    temperature,
    expect,
    system_length: system?.length || 0,
    user_length: user?.length || 0,
    imageCount: images?.length ?? 0,
    retries,
  };

  const promptPreview = `${system}\n\n${user}`;
  const startTime = Date.now();

  const storeLog = async (response?: string, error?: string) => {
    if (!logContext) return;
    try {
      await logContext.ctx.runMutation(internal.llmLogs.storeLlmLog, {
        clerkUserId: logContext.clerkUserId,
        action,
        model,
        systemPrompt: system,
        userPrompt: user,
        response,
        error,
        durationMs: Date.now() - startTime,
        reasoningUsed,
      });
    } catch (e) {
      console.warn('Failed to store LLM log:', e);
    }
  };

  return startActiveObservation<T>(
    'llmClient.chatJsonWithRetries',
    async (span: Observation) => {
      span.update({ ...spanAttributes, input: promptPreview });
      let lastErr: any;

      for (let attempt = 0; attempt < retries; attempt++) {
        let rawText = '';
        try {
          span.update({
            attempt: attempt + 1,
            attempt_remaining: retries - attempt,
          });
          const response = await generateText({
            model: ensureModel(model),
            providerOptions,
            temperature,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: userContent },
            ],
          });
          rawText = response.text ?? '';
          const raw = stripCodeFences(rawText);
          span.update({
            finish_reason: response.finishReason ?? undefined,
            output_raw: raw,
          });
          const parsed = safeParseJson<T>(raw);
          span.update({ output: parsed });

          await storeLog(JSON.stringify(parsed, null, 2));

          return parsed;
        } catch (error: any) {
          lastErr = error;
          span.update({ error: error instanceof Error ? error.message : String(error) });
          if (error instanceof SyntaxError && rawText) {
            console.warn(
              `[${action}] JSON parse failed (attempt ${attempt + 1}/${retries}), raw: ${rawText.slice(0, 500)}`,
            );
          }
          // Log API-level errors with status code and response body
          if (error?.statusCode || error?.responseBody) {
            console.warn(
              `[${action}] API error (attempt ${attempt + 1}/${retries}): status=${error.statusCode}, body=${(error.responseBody ?? '').slice(0, 500)}`,
            );
          }
          if (attempt < retries - 1) {
            await sleep(baseDelayMs * Math.pow(2, attempt));
            continue;
          }
          console.error(`LLM call failed in ${action}`, error);
        }
      }

      // Build a richer error message for API errors (includes status code + response body)
      const baseMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
      const statusCode = lastErr?.statusCode;
      const responseBody = lastErr?.responseBody;
      const causeMsg = lastErr?.cause instanceof Error ? lastErr.cause.message : '';
      const parts = [baseMsg];
      if (statusCode) parts.push(`HTTP ${statusCode}`);
      if (causeMsg) parts.push(`cause: ${causeMsg}`);
      if (responseBody) parts.push(`body: ${String(responseBody).slice(0, 300)}`);
      const errMsg = parts.join(' | ');

      if (fallback !== undefined) {
        console.warn(`[${action}] All retries exhausted, using fallback. Last error: ${errMsg}`);
        await storeLog(JSON.stringify(fallback, null, 2) + '\n\n[FALLBACK USED]', errMsg);
        return fallback;
      }

      await storeLog(undefined, errMsg);
      throw new Error(errMsg);
    },
    { asType: 'generation' },
  );
}

// ── Stage-aware wrappers ─────────────────────────────────────

/**
 * Call LLM for a pipeline stage. All config (temperature, retries, model,
 * reasoning) comes from PIPELINE_CONFIG — no external model param needed.
 */
export async function chatJsonForStage<T = any>(
  stage: PipelineStage,
  params: { system: string; user: string },
  fallback?: T,
  logContext?: LlmLogContext,
): Promise<T> {
  const config = getStageConfig(stage);
  return chatJsonWithRetries<T>(
    {
      system: params.system,
      user: params.user,
      model: config.model,
      temperature: config.temperature,
      expect: config.expect,
      reasoning: config.reasoning,
      action: stage,
    },
    config.retries,
    config.baseDelayMs,
    fallback,
    logContext,
  );
}

/**
 * Call LLM for a pipeline stage with multimodal (image) input.
 * Used by A8 (Visual QA) and A10 (Final QA) to send actual images for review.
 */
export async function chatJsonForStageWithImages<T = any>(
  stage: PipelineStage,
  params: { system: string; user: string; images?: Array<{ data: Uint8Array; mimeType: string }> },
  fallback?: T,
  logContext?: LlmLogContext,
): Promise<T> {
  const config = getStageConfig(stage);
  return chatJsonWithRetries<T>(
    {
      system: params.system,
      user: params.user,
      model: config.model,
      temperature: config.temperature,
      expect: config.expect,
      reasoning: config.reasoning,
      action: stage,
      images: params.images,
    },
    config.retries,
    config.baseDelayMs,
    fallback,
    logContext,
  );
}
