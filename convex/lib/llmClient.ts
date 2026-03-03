import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { startActiveObservation, Observation } from './langfuse';
import { internal } from '../_generated/api';
import { stripCodeFences, safeParseJson } from './jsonUtils';
import { type PipelineStage, getStageConfig, resolveStageModel } from './pipelineConfig';

const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const fallbackModel = 'google/gemini-2.0-flash-001';

const openrouter = openrouterApiKey
  ? createOpenRouter({
      apiKey: openrouterApiKey,
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

/** Build Google reasoning provider options. Enabled when stage allows it and model is Google. */
function buildProviderOptions(reasoning: boolean | undefined, model: string) {
  if (reasoning === false) return undefined;
  if (!model.startsWith('google/')) return undefined;
  return { google: { reasoning: { enabled: true } } };
}

export interface ChatJsonParams {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  expect?: 'object' | 'array' | 'any';
  action?: string;
  reasoning?: boolean;
}

export interface LlmLogContext {
  ctx: ActionCtx;
  clerkUserId: string;
}

export async function chatJsonWithRetries<T = any>(params: ChatJsonParams, retries = 3, baseDelayMs = 250, fallback?: T, logContext?: LlmLogContext): Promise<T> {
  const { system, user, model = fallbackModel, temperature = 0.5, expect = 'any', action = 'llm.chat', reasoning } = params;
  const providerOptions = buildProviderOptions(reasoning, model);
  const reasoningUsed = providerOptions !== undefined;

  const spanAttributes = {
    action,
    model,
    temperature,
    expect,
    system_length: system?.length || 0,
    user_length: user?.length || 0,
    retries,
  };

  const promptPreview = `${system}\n\n${user}`;
  const startTime = Date.now();
  const isWebSearch = model.includes(':online');

  const storeLog = async (response?: string, error?: string, sources?: string[]) => {
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
        webSearchUsed: isWebSearch,
        webSearchSources: sources && sources.length > 0 ? sources : undefined,
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
              { role: 'user', content: user },
            ],
          });
          rawText = response.text ?? '';
          const raw = stripCodeFences(rawText);
          const sources = isWebSearch ? extractSources(response) : [];
          span.update({
            finish_reason: response.finishReason ?? undefined,
            output_raw: raw,
            webSearchSources: sources.length > 0 ? sources : undefined,
          });
          const parsed = safeParseJson<T>(raw);
          span.update({ output: parsed });

          await storeLog(JSON.stringify(parsed, null, 2), undefined, sources);

          return parsed;
        } catch (error) {
          lastErr = error;
          span.update({ error: error instanceof Error ? error.message : String(error) });
          if (error instanceof SyntaxError && rawText) {
            console.warn(`[${action}] JSON parse failed (attempt ${attempt + 1}/${retries}), raw: ${rawText.slice(0, 500)}`);
          }
          if (attempt < retries - 1) {
            await sleep(baseDelayMs * Math.pow(2, attempt));
            continue;
          }
          console.error(`LLM call failed in ${action}`, error);
        }
      }

      const errMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
      if (fallback !== undefined) {
        console.warn(`[${action}] All retries exhausted, using fallback. Last error: ${errMsg}`);
        await storeLog(JSON.stringify(fallback, null, 2) + '\n\n[FALLBACK USED]', errMsg);
        return fallback;
      }

      await storeLog(undefined, lastErr instanceof Error ? lastErr.message : String(lastErr));
      // @ts-ignore
      throw lastErr || new Error('LLM call failed');
    },
    { asType: 'generation' }
  );
}

// ── Stage-aware wrappers ─────────────────────────────────────

/**
 * Call LLM for a pipeline stage. All config (temperature, retries, model,
 * reasoning) comes from PIPELINE_CONFIG — no external model param needed.
 */
export async function chatJsonForStage<T = any>(stage: PipelineStage, params: { system: string; user: string }, fallback?: T, logContext?: LlmLogContext): Promise<T> {
  const config = getStageConfig(stage);
  const model = resolveStageModel(stage);

  return chatJsonWithRetries<T>(
    {
      system: params.system,
      user: params.user,
      model,
      temperature: config.temperature,
      expect: config.expect,
      reasoning: config.reasoning,
      action: stage,
    },
    config.retries,
    config.baseDelayMs,
    fallback,
    logContext
  );
}

/**
 * Like chatJsonForStage but returns `{ data, sources }`.
 * Adds `:online` suffix when webSearch is enabled and extracts
 * url_citation annotations from the OpenRouter response.
 */
export async function chatJsonForStageWithSources<T = any>(stage: PipelineStage, params: { system: string; user: string }, fallback?: T, logContext?: LlmLogContext): Promise<{ data: T; sources: string[] }> {
  const config = getStageConfig(stage);
  const model = resolveStageModel(stage);
  const action = stage;
  const { system, user } = params;
  const providerOptions = buildProviderOptions(config.reasoning, model);
  const reasoningUsed = providerOptions !== undefined;

  const spanAttributes = {
    action,
    model,
    temperature: config.temperature,
    expect: config.expect,
    system_length: system?.length || 0,
    user_length: user?.length || 0,
    retries: config.retries,
    webSearch: true,
  };

  const startTime = Date.now();

  const storeLog = async (response?: string, error?: string, sources?: string[]) => {
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
        webSearchUsed: true,
        webSearchSources: sources && sources.length > 0 ? sources : undefined,
        reasoningUsed,
      });
    } catch (e) {
      console.warn('Failed to store LLM log:', e);
    }
  };

  return startActiveObservation<{ data: T; sources: string[] }>(
    'llmClient.chatJsonForStageWithSources',
    async (span: Observation) => {
      span.update({ ...spanAttributes, input: `${system}\n\n${user}` });
      let lastErr: any;

      for (let attempt = 0; attempt < config.retries; attempt++) {
        let rawText = '';
        try {
          span.update({ attempt: attempt + 1, attempt_remaining: config.retries - attempt });

          const response = await generateText({
            model: ensureModel(model),
            providerOptions,
            temperature: config.temperature,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          });

          rawText = response.text ?? '';
          const raw = stripCodeFences(rawText);
          const sources = extractSources(response);

          span.update({ finish_reason: response.finishReason ?? undefined, output_raw: raw });

          const parsed = safeParseJson<T>(raw);

          span.update({ output: parsed, sourcesCount: sources.length });
          await storeLog(JSON.stringify(parsed, null, 2), undefined, sources);

          return { data: parsed, sources };
        } catch (error) {
          lastErr = error;
          span.update({ error: error instanceof Error ? error.message : String(error) });
          if (error instanceof SyntaxError && rawText) {
            console.warn(`[${action}] JSON parse failed (attempt ${attempt + 1}/${config.retries}), raw: ${rawText.slice(0, 500)}`);
          }
          if (attempt < config.retries - 1) {
            await sleep(config.baseDelayMs * Math.pow(2, attempt));
            continue;
          }
          console.error(`LLM call failed in ${action}`, error);
        }
      }

      const errMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
      if (fallback !== undefined) {
        console.warn(`[${action}] All retries exhausted, using fallback. Last error: ${errMsg}`);
        await storeLog(JSON.stringify(fallback, null, 2) + '\n\n[FALLBACK USED]', errMsg);
        return { data: fallback, sources: [] };
      }

      await storeLog(undefined, errMsg);
      // @ts-ignore
      throw lastErr || new Error('LLM call failed');
    },
    { asType: 'generation' }
  );
}

/** Extract web-search source URLs from an OpenRouter :online response. */
function extractSources(response: any): string[] {
  const urls: string[] = [];

  // AI SDK v5 sources array
  try {
    if (Array.isArray(response.sources)) {
      for (const s of response.sources) {
        if (s.url) urls.push(s.url);
      }
    }
  } catch {
    /* ignore */
  }

  // OpenRouter annotations in response messages
  try {
    const messages = response.response?.messages ?? response.responseMessages;
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        const annotations = (msg as any).annotations;
        if (Array.isArray(annotations)) {
          for (const ann of annotations) {
            if (ann.type === 'url_citation' && ann.url_citation?.url) {
              urls.push(ann.url_citation.url);
            }
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  return [...new Set(urls)];
}
