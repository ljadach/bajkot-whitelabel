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

/**
 * Per-attempt wall-clock cap on a single LLM request (overridable per stage
 * via `timeoutMs`). Without it a slow or hung OpenRouter request runs until
 * the Convex action limit kills the whole action — bypassing both the retry
 * loop and the caller's catch, so the order never flips to `failed` and just
 * sits in its current status with zero logged error (prod orders jn72f8b7…
 * and jn72repet…, both stuck at A5 on 2026-08-06/10). Longest healthy call
 * on record is ~204s (gemini-2.5-pro, A3), so 240s only cuts pathological
 * requests; the abort surfaces as a normal error → retried → caught →
 * order marked failed.
 */
const REQUEST_TIMEOUT_MS = 240_000;

/**
 * Total budget for all attempts of one call. Convex kills 'use node' actions
 * at 10 minutes with no catch and no trace; stopping ourselves at 8.5 leaves
 * room to store the error log and mark the order failed. An attempt never
 * gets a signal longer than what's left of this budget, and when under 10s
 * remain we skip straight to the failure path instead of starting an
 * attempt that can't finish.
 */
const OVERALL_DEADLINE_MS = 510_000;

/**
 * Reasoning toggle is forwarded to OpenRouter as a top-level `reasoning` field.
 * Per-model support varies (Gemini 2.5 supports it, GPT-4o doesn't); an
 * unrecognised field is ignored, so no stage-specific gating is needed.
 *
 * `reasoning === false` does NOT mean "send nothing". Gemini 2.5 Pro can't
 * disable thinking at all (min budget ~128, and OpenRouter's default is
 * *dynamic*). Sending no directive lets that dynamic budget run wild — on
 * unlucky inputs the model loops on repeated thought summaries for minutes
 * until OpenRouter's upstream idle timeout kills the request, producing zero
 * prose (prod orders jn70nt66rb3z…, 2026-07-15, and jn76evhtefmr…,
 * 2026-07-30 — the latter burned all 3 retries). So `false` pins the budget
 * to the floor (128 tokens), the lowest Gemini accepts.
 *
 * Per-model safety settings (formerly Google `BLOCK_ONLY_HIGH`) are dropped:
 * OpenAI-compat doesn't expose a uniform interface, and the original reason
 * for tweaking them — false positives on therapeutic content — is exactly
 * what motivated the OpenRouter switch (we're moving A5 to Claude precisely
 * because Gemini's hard `PROHIBITED_CONTENT` filter is unconfigurable).
 */
const MIN_REASONING_TOKENS = 128;

/**
 * OpenRouter takes the reasoning budget as a top-level `reasoning` field, which
 * no `@ai-sdk/openai` option maps to — `providerOptions.openai` is parsed
 * against a fixed zod schema and unknown keys (we used to send `extraBody`) are
 * dropped before the request is built. The only way in is to patch the body on
 * its way out.
 */
function reasoningFetch(reasoning: Record<string, unknown>): typeof globalThis.fetch {
  return async (input, init) => {
    if (typeof init?.body !== 'string') return fetch(input, init);
    const body = JSON.parse(init.body);
    body.reasoning = reasoning;
    // The SDK classifies every non-`gpt-*` id as a reasoning model (see
    // getOpenAILanguageModelCapabilities), which flips system messages to the
    // `developer` role. That's an OpenAI-only convention — send plain `system`
    // so Gemini/Claude get the prompt where they expect it.
    if (Array.isArray(body.messages)) {
      for (const message of body.messages) {
        if (message?.role === 'developer') message.role = 'system';
      }
    }
    return fetch(input, { ...init, body: JSON.stringify(body) });
  };
}

function makeProvider(reasoning: Record<string, unknown>) {
  return openrouterApiKey
    ? createOpenAI({
        apiKey: openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        fetch: reasoningFetch(reasoning),
      })
    : null;
}

/**
 * `reasoning: false` means "as little thinking as possible" — which differs
 * per provider. Claude can turn thinking off entirely (and pre-4.6 A5 ran on
 * claude-3.5-sonnet, which had none — that's the behavior being restored).
 * Gemini 2.5 Pro can't disable thinking at all, so it gets the budget floor
 * instead (see MIN_REASONING_TOKENS above); 128 is also below Anthropic's
 * minimum budget of 1024, so the floor must never be sent to Claude.
 */
function reasoningDirective(
  modelName: string,
  reasoning: boolean | undefined,
): Record<string, unknown> {
  if (reasoning !== false) return { enabled: true };
  return modelName.startsWith('anthropic/')
    ? { enabled: false }
    : { max_tokens: MIN_REASONING_TOKENS };
}

// Type for action context (simplified)
type ActionCtx = {
  runMutation: <T>(fn: any, args: any) => Promise<T>;
};

function ensureModel(modelName: string, reasoning: boolean | undefined) {
  const provider = makeProvider(reasoningDirective(modelName, reasoning));
  if (!provider) {
    throw new Error('OpenRouter not configured. Set OPENROUTER_API_KEY in Convex environment.');
  }
  // `.chat()` pins the OpenAI-compat chat-completions endpoint. The SDK
  // default is the Responses API, which OpenRouter serves in alpha and which
  // rejects a reasoning budget outright ("Reasoning is mandatory for this
  // endpoint and cannot be disabled", HTTP 400) — even `effort: 'minimal'`
  // still burned ~1.8k thinking tokens in a live probe, against 75 on
  // chat-completions with `max_tokens: 128`. Verified 2026-07-30.
  return provider.chat(modelName || fallbackModel);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  /** Per-attempt request timeout; defaults to REQUEST_TIMEOUT_MS. Raise for
   * stages whose healthy generation legitimately runs long (A5). */
  timeoutMs?: number;
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
    timeoutMs = REQUEST_TIMEOUT_MS,
    images,
  } = params;
  // `reasoning: false` still sends a floor thinking budget (see
  // MIN_REASONING_TOKENS), so track full-reasoning intent off the flag itself.
  const reasoningUsed = reasoning !== false;

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
      const deadline = startTime + OVERALL_DEADLINE_MS;
      let lastErr: any;

      for (let attempt = 0; attempt < retries; attempt++) {
        const remainingMs = deadline - Date.now();
        if (remainingMs < 10_000) {
          console.warn(
            `[${action}] Overall deadline reached — recording failure before Convex kills the action`,
          );
          break;
        }
        let rawText = '';
        try {
          span.update({
            attempt: attempt + 1,
            attempt_remaining: retries - attempt,
          });
          const response = await generateText({
            model: ensureModel(model, reasoning),
            temperature,
            abortSignal: AbortSignal.timeout(Math.min(timeoutMs, remainingMs)),
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
      timeoutMs: config.timeoutMs,
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
      timeoutMs: config.timeoutMs,
      action: stage,
      images: params.images,
    },
    config.retries,
    config.baseDelayMs,
    fallback,
    logContext,
  );
}
