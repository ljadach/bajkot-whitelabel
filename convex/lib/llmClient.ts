import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { startActiveObservation, Observation } from './langfuse';
import { internal } from '../_generated/api';
import { stripCodeFences, safeParseJson } from './jsonUtils';
import { type PipelineStage, getStageConfig } from './pipelineConfig';

/**
 * All LLM calls go through OpenRouter — a single OpenAI-compatible endpoint
 * that proxies to Anthropic/Google/OpenAI/etc. Model IDs are namespaced
 * (`google/gemini-2.5-flash`, `anthropic/claude-3.5-sonnet`, ...) and live in
 * `pipelineConfig.ts`. Image generation is unaffected — `geminiImageGen.ts`
 * still hits Google directly because OpenRouter doesn't proxy image output.
 *
 * Why OpenAI-compat instead of `@openrouter/ai-sdk-provider`: that package
 * peers on `ai@^6`, we're on `ai@5`. OpenRouter's OpenAI-compat endpoint lets
 * us stay on the existing `@ai-sdk/openai@3` we already ship.
 */
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const fallbackModel = 'google/gemini-2.0-flash-001';

const openrouter = openrouterApiKey
  ? createOpenAI({
      apiKey: openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  : null;

// Type for action context (simplified)
type ActionCtx = {
  runMutation: <T>(fn: any, args: any) => Promise<T>;
};

function ensureModel(modelName: string) {
  if (!openrouter) {
    throw new Error('OpenRouter not configured. Set OPENROUTER_API_KEY in Convex environment.');
  }
  return openrouter(modelName || fallbackModel);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reasoning toggle is forwarded to OpenRouter via `extraBody`. Per-model
 * support varies (Gemini 2.5 supports it, GPT-4o doesn't). When the provider
 * doesn't recognize the field it's silently ignored, so no stage-specific
 * gating is needed.
 *
 * Per-model safety settings (formerly Google `BLOCK_ONLY_HIGH`) are dropped:
 * OpenAI-compat doesn't expose a uniform interface, and the original reason
 * for tweaking them — false positives on therapeutic content — is exactly
 * what motivated the OpenRouter switch (we're moving A5 to Claude precisely
 * because Gemini's hard `PROHIBITED_CONTENT` filter is unconfigurable).
 */
function buildProviderOptions(reasoning: boolean | undefined) {
  if (reasoning === false) return undefined;
  return {
    openai: {
      // The AI SDK forwards unknown keys as part of the request body, which
      // is what OpenRouter expects for non-standard params.
      extraBody: { reasoning: { enabled: true } },
    },
  } as any;
}

export interface ChatJsonParams {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  expect?: 'object' | 'array' | 'any';
  action?: string;
  reasoning?: boolean;
  /** Hard cap on output tokens. Forwarded to the model as `maxOutputTokens`
   * so prose generation isn't silently truncated by OpenRouter's default. */
  maxTokens?: number;
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
    maxTokens,
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

  const storeLog = async (
    response?: string,
    error?: string,
    extra?: {
      finishReason?: string;
      safetyBlockReason?: string;
      retryCount?: number;
      traceId?: string;
    },
  ) => {
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
        finishReason: extra?.finishReason,
        safetyBlockReason: extra?.safetyBlockReason,
        retryCount: extra?.retryCount,
        traceId: extra?.traceId,
      });
    } catch (e) {
      console.warn('Failed to store LLM log:', e);
    }
  };

  return startActiveObservation<T>(
    'llmClient.chatJsonWithRetries',
    async (span: Observation) => {
      span.update({ ...spanAttributes, input: promptPreview });
      const traceId = span.context().traceId || undefined;
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
            ...(maxTokens !== undefined ? { maxOutputTokens: maxTokens } : {}),
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

          await storeLog(JSON.stringify(parsed, null, 2), undefined, {
            finishReason: response.finishReason ?? undefined,
            retryCount: attempt,
            traceId,
          });

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

      // Surface Gemini's PROHIBITED_CONTENT / SAFETY block (if any) as a
      // structured field so admin debugging doesn't have to grep error text.
      const responseBodyStr = typeof responseBody === 'string' ? responseBody : '';
      const blockMatch = /"blockReason"\s*:\s*"([^"]+)"/.exec(responseBodyStr);
      const safetyBlockReason = blockMatch ? blockMatch[1] : undefined;

      if (fallback !== undefined) {
        console.warn(`[${action}] All retries exhausted, using fallback. Last error: ${errMsg}`);
        await storeLog(JSON.stringify(fallback, null, 2) + '\n\n[FALLBACK USED]', errMsg, {
          safetyBlockReason,
          retryCount: retries,
          traceId,
        });
        return fallback;
      }

      await storeLog(undefined, errMsg, { safetyBlockReason, retryCount: retries, traceId });
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
      maxTokens: config.maxTokens,
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
      maxTokens: config.maxTokens,
      action: stage,
      images: params.images,
    },
    config.retries,
    config.baseDelayMs,
    fallback,
    logContext,
  );
}
