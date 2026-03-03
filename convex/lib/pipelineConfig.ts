/**
 * Unified pipeline configuration — single source of truth for all LLM calls.
 *
 * Every call site reads temperature, retries, model, and feature flags from
 * this file. The Record<PipelineStage, StageConfig> enforces completeness —
 * adding a stage and forgetting a field is a TS error.
 *
 * Model selection:
 * - Each stage has an explicit `model` field (no global DB lookup).
 * - `getLlmConfig()` reads `LLM_CONFIG_PROFILE` env var to pick prod/test.
 * - In test profile every stage uses the cheapest fast model.
 */

export type PipelineStage =
  | 'intake'
  | 'intake_stream'
  | 'scorePrompt'
  | 'inferAiFluency'
  | 'assessment'
  | 'playbook'
  | 'handbook'
  | 'exerciseGeneration'
  | 'exerciseEvaluation'
  | 'quickTip'
  | 'diaryEntry'
  | 'contrapositor'
  | 'probes'
  | 'conceptRadar'
  | 'skeletonKey'
  | 'tomorrowTasks'
  | 'exploration.sketch'
  | 'exploration.expanded'
  | 'exploration.full'
  | 'exploreQa'
  | 'autoFill'
  | 'feynmanQuestions';

export interface StageConfig {
  model: string;
  temperature: number;
  retries: number;
  baseDelayMs: number;
  webSearch?: { enabled: true; maxResults: number };
  /** Per-stage reasoning toggle. Default: true (inherit global). Set false to disable. */
  reasoning?: boolean;
  expect?: 'object' | 'array' | 'any';
}

export type LlmConfig = Record<PipelineStage, StageConfig>;

// ── Prod config ───────────────────────────────────────────────

const DEFAULT_LLM_CONFIG: LlmConfig = {
  // ── Intake ───────────────────────────────────────────────
  intake: { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 3, baseDelayMs: 250, expect: 'object' },
  intake_stream: { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 1, baseDelayMs: 0 },

  // ── Scoring & Assessment ─────────────────────────────────
  scorePrompt: { model: 'google/gemini-2.5-flash', temperature: 0.3, retries: 3, baseDelayMs: 250, expect: 'object' },
  inferAiFluency: { model: 'google/gemini-2.5-flash', temperature: 0.3, retries: 3, baseDelayMs: 250, expect: 'object' },
  assessment: { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 3, baseDelayMs: 250, expect: 'object' },

  // ── Plan & Course ────────────────────────────────────────
  playbook: { model: 'google/gemini-3.1-pro-preview', temperature: 0.4, retries: 3, baseDelayMs: 250, expect: 'object', webSearch: { enabled: true, maxResults: 10 } },
  handbook: { model: 'google/gemini-3.1-pro-preview', temperature: 0.4, retries: 3, baseDelayMs: 250, expect: 'object', webSearch: { enabled: true, maxResults: 10 } },
  exerciseGeneration: { model: 'google/gemini-2.5-flash', temperature: 0.4, retries: 3, baseDelayMs: 250, expect: 'object' },
  exerciseEvaluation: { model: 'google/gemini-2.5-flash', temperature: 0.3, retries: 3, baseDelayMs: 250, expect: 'object' },

  // ── Quick Tip (web search, fast model) ─────────────────
  quickTip: { model: 'google/gemini-2.5-flash', temperature: 0.7, retries: 3, baseDelayMs: 250, expect: 'object', webSearch: { enabled: true, maxResults: 5 } },
  diaryEntry: { model: 'google/gemini-2.5-flash', temperature: 0.8, retries: 3, baseDelayMs: 250, expect: 'object' },

  // ── Instrument tools ─────────────────────────────────────
  contrapositor: { model: 'google/gemini-2.5-flash', temperature: 0.3, retries: 3, baseDelayMs: 250, expect: 'object' },
  probes: { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 3, baseDelayMs: 250, expect: 'array' },
  conceptRadar: { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 3, baseDelayMs: 250, expect: 'array' },
  skeletonKey: { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 3, baseDelayMs: 250, expect: 'object' },
  tomorrowTasks: { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 3, baseDelayMs: 250, expect: 'array' },
  feynmanQuestions: { model: 'google/gemini-2.5-flash', temperature: 0.6, retries: 3, baseDelayMs: 250, expect: 'array' },

  // ── Exploration chapters ─────────────────────────────────
  'exploration.sketch': { model: 'google/gemini-2.5-flash', temperature: 0.6, retries: 3, baseDelayMs: 250, expect: 'object' },
  'exploration.expanded': { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 3, baseDelayMs: 250, expect: 'object' },
  'exploration.full': { model: 'google/gemini-2.5-flash', temperature: 0.4, retries: 3, baseDelayMs: 250, expect: 'object' },

  // ── Explore Q&A ──────────────────────────────────────────
  exploreQa: { model: 'google/gemini-2.5-flash', temperature: 0.5, retries: 3, baseDelayMs: 250, expect: 'object' },

  // ── Admin auto-fill (no reasoning, cheap model) ──────────
  autoFill: { model: 'anthropic/claude-haiku-4-5', temperature: 0.7, retries: 3, baseDelayMs: 250, reasoning: false },
};

// ── Test config — everything on cheapest/fastest model ─────

const TEST_LLM_CONFIG: Partial<LlmConfig> = Object.fromEntries((Object.keys(DEFAULT_LLM_CONFIG) as PipelineStage[]).map((stage) => [stage, { model: 'google/gemini-2.5-flash' }])) as Partial<LlmConfig>;

// ── Config builder ────────────────────────────────────────────

/** Deep-merge base config with partial overrides per stage. */
export function buildLlmConfig(base: LlmConfig, ...overrides: Partial<LlmConfig>[]): LlmConfig {
  const result = { ...base };
  for (const override of overrides) {
    for (const key of Object.keys(override) as PipelineStage[]) {
      result[key] = { ...result[key], ...override[key] };
    }
  }
  return result;
}

/** Resolve config profile name once — guards against frontend where process.env is undefined. */
function resolveProfileName(): string {
  return typeof process !== 'undefined' ? process.env.LLM_CONFIG_PROFILE || 'prod' : 'prod';
}

/** Get the active LLM config based on `LLM_CONFIG_PROFILE` env var. */
export function getLlmConfig(): LlmConfig {
  if (resolveProfileName() === 'test') {
    return buildLlmConfig(DEFAULT_LLM_CONFIG, TEST_LLM_CONFIG);
  }
  return DEFAULT_LLM_CONFIG;
}

// ── Convenience exports ───────────────────────────────────────

/** Active profile name for display purposes. */
export const ACTIVE_CONFIG_PROFILE: string = resolveProfileName();

/** Exported config object — result of getLlmConfig(). */
export const PIPELINE_CONFIG: LlmConfig = getLlmConfig();

// ── Startup banner (server-side only) ────────────────────────
if (typeof process !== 'undefined' && typeof process.env === 'object') {
  if (ACTIVE_CONFIG_PROFILE === 'prod' && !process.env.LLM_CONFIG_PROFILE) {
    console.warn('[pipelineConfig] ⚠ LLM_CONFIG_PROFILE not set — defaulting to "prod". Set via: convex env set LLM_CONFIG_PROFILE prod|test');
  } else {
    console.info(`[pipelineConfig] LLM_CONFIG_PROFILE="${ACTIVE_CONFIG_PROFILE}" — model sample: ${PIPELINE_CONFIG.intake.model}`);
  }
}

export function getStageConfig(stage: PipelineStage): StageConfig {
  return PIPELINE_CONFIG[stage];
}

/** Resolve the model for a stage, appending :online for web-search stages. */
export function resolveStageModel(stage: PipelineStage): string {
  const config = PIPELINE_CONFIG[stage];
  if (config.webSearch?.enabled) {
    return config.model.includes(':online') ? config.model : `${config.model}:online`;
  }
  return config.model;
}
