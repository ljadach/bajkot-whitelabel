/**
 * Pipeline configuration — single source of truth for all LLM calls.
 *
 * Every call site reads temperature, retries, model, and feature flags from
 * this file. The Record<PipelineStage, StageConfig> enforces completeness.
 *
 * Model selection:
 * - Each stage has an explicit `model` field (no global DB lookup).
 * - `getLlmConfig()` reads `LLM_CONFIG_PROFILE` env var to pick prod/test.
 */

export type PipelineStage =
  | 'book.profiling' // A1 — Child Profiler
  | 'book.storyPlanning' // A2 — Story Architect
  | 'book.storyWriting' // A3 — Story Writer
  | 'book.psychReview' // A4 — Psych Reviewer
  | 'book.artDirection' // A5 — Art Director
  | 'book.visualQa' // A8 — Visual QA
  | 'book.finalQa'; // A10 — Final QA

export interface StageConfig {
  model: string;
  temperature: number;
  retries: number;
  baseDelayMs: number;
  reasoning?: boolean;
  /**
   * Hard cap on output tokens. Without this, OpenRouter applies a
   * provider-side default (~8192 for Gemini 2.5 Flash) which silently
   * truncates long prose — A3 (storyWriting) hit this cap when targeting
   * 4500 Polish words (~9000 tokens). Architectural max for Gemini 2.5
   * Flash is 65536; Claude Sonnet 4.6 is 64000. 16384 is enough for the
   * longest beat plan (9+ bracket).
   */
  maxTokens?: number;
  expect?: 'object' | 'array' | 'any';
}

export type LlmConfig = Record<PipelineStage, StageConfig>;

// ── Prod config ───────────────────────────────────────────────
//
// Models are namespaced for OpenRouter (`<provider>/<model-id>`). A5
// (`book.artDirection`) runs on Claude 3.5 Sonnet because Gemini's hard
// `PROHIBITED_CONTENT` filter trips deterministically on therapeutic
// child + body-description prompts even on Pro — not configurable. The
// rest of the pipeline stays on Gemini 2.5 Flash where the filters
// behave for narrative text.

const DEFAULT_LLM_CONFIG: LlmConfig = {
  'book.profiling': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.7,
    retries: 3,
    baseDelayMs: 250,
    expect: 'object',
  },
  'book.storyPlanning': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.6,
    retries: 3,
    baseDelayMs: 250,
    expect: 'object',
  },
  'book.storyWriting': {
    // Gemini 2.5 Pro: stronger than Flash (which undershot targets ~50%)
    // and faster than Claude Sonnet 4.6 (which kept hitting OpenRouter's
    // ~7-min timeout on long Polish prose, returning truncated JSON and
    // failing all 3 retries on bad luck). Pro typically completes in
    // 30-90s and won't trip the safety filter on narrative text.
    model: 'google/gemini-2.5-pro',
    temperature: 0.8,
    retries: 3,
    baseDelayMs: 500,
    expect: 'object',
    // A3 is pure prose generation — extended thinking just eats budget
    // without helping craft, and Pro's thinking is heavy.
    reasoning: false,
    maxTokens: 16384,
  },
  'book.psychReview': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.3,
    retries: 3,
    baseDelayMs: 250,
    expect: 'object',
  },
  'book.artDirection': {
    // claude-3.5-sonnet is deprecated on OpenRouter — sonnet-4.6 is the
    // current Anthropic flagship and was empirically verified to handle
    // the A5 prompt that Gemini hard-blocks (PROHIBITED_CONTENT).
    model: 'anthropic/claude-sonnet-4.6',
    temperature: 0.6,
    retries: 4,
    baseDelayMs: 250,
    expect: 'object',
  },
  'book.visualQa': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.3,
    retries: 3,
    baseDelayMs: 250,
    expect: 'object',
  },
  'book.finalQa': {
    model: 'google/gemini-2.5-flash',
    temperature: 0.2,
    retries: 3,
    baseDelayMs: 250,
    expect: 'object',
  },
};

// ── Test config — everything on cheapest/fastest model ─────

const TEST_LLM_CONFIG: Partial<LlmConfig> = Object.fromEntries(
  (Object.keys(DEFAULT_LLM_CONFIG) as PipelineStage[]).map((stage) => [
    stage,
    { model: 'google/gemini-2.0-flash-001' },
  ]),
) as Partial<LlmConfig>;

// ── Config builder ────────────────────────────────────────────

function buildLlmConfig(base: LlmConfig, ...overrides: Partial<LlmConfig>[]): LlmConfig {
  const result = { ...base };
  for (const override of overrides) {
    for (const key of Object.keys(override) as PipelineStage[]) {
      result[key] = { ...result[key], ...override[key] };
    }
  }
  return result;
}

function resolveProfileName(): string {
  return typeof process !== 'undefined' ? process.env.LLM_CONFIG_PROFILE || 'prod' : 'prod';
}

export function getLlmConfig(): LlmConfig {
  if (resolveProfileName() === 'test') {
    return buildLlmConfig(DEFAULT_LLM_CONFIG, TEST_LLM_CONFIG);
  }
  return DEFAULT_LLM_CONFIG;
}

export const ACTIVE_CONFIG_PROFILE: string = resolveProfileName();
export const PIPELINE_CONFIG: LlmConfig = getLlmConfig();

if (typeof process !== 'undefined' && typeof process.env === 'object') {
  if (ACTIVE_CONFIG_PROFILE === 'prod' && !process.env.LLM_CONFIG_PROFILE) {
    console.warn('[pipelineConfig] LLM_CONFIG_PROFILE not set — defaulting to "prod".');
  } else {
    console.info(
      `[pipelineConfig] LLM_CONFIG_PROFILE="${ACTIVE_CONFIG_PROFILE}" — model sample: ${PIPELINE_CONFIG['book.profiling'].model}`,
    );
  }
}

export function getStageConfig(stage: PipelineStage): StageConfig {
  return PIPELINE_CONFIG[stage];
}
