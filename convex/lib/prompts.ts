import { z } from 'zod';
import { fetchPrompt } from './langfusePrompts';
import type { PromptConfig } from './prompts/types';
import { PromptTemplate } from './prompts/types';
import { intakeFallbacks, INTAKE_SYSTEM_FALLBACK } from './prompts/intakeFallbacks';
import { courseFallbacks, PLAYBOOK_VIDEO_INSTRUCTIONS } from './prompts/courseFallbacks';
import { exerciseFallbacks, EXERCISE_TYPE_GUIDELINES } from './prompts/exerciseFallbacks';
import { toolFallbacks } from './prompts/toolFallbacks';

// Re-export everything consumers need
export { PromptTemplate } from './prompts/types';
export type { PromptConfig } from './prompts/types';
export { INTAKE_SYSTEM_FALLBACK } from './prompts/intakeFallbacks';
export { PLAYBOOK_VIDEO_INSTRUCTIONS } from './prompts/courseFallbacks';
export { EXERCISE_TYPE_GUIDELINES } from './prompts/exerciseFallbacks';

/**
 * Master switch for Langfuse prompt fetching.
 * When false, renderPrompt always uses inline fallbacks from this file.
 * Set to true to pull prompts from Langfuse (requires env credentials).
 */
export const USE_LANGFUSE_PROMPTS = false;

// Merge all domain fallbacks into one complete record.
// Each domain file exports a Partial<Record<PromptTemplate, PromptConfig>>.
const PROMPT_CONFIGS: Record<PromptTemplate, PromptConfig> = {
  ...Object.fromEntries(
    Object.values(PromptTemplate).map((key) => {
      const config = intakeFallbacks[key] ?? courseFallbacks[key] ?? exerciseFallbacks[key] ?? toolFallbacks[key];
      if (!config) throw new Error(`Missing prompt config for template: ${key}`);
      return [key, config];
    })
  ),
} as Record<PromptTemplate, PromptConfig>;

const PLACEHOLDER_REGEX = /{{([A-Z0-9_]+)}}/g;
const emptySchema = z.object({}).strict();

const templateSchemas: Record<PromptTemplate, z.ZodType<any>> = {
  [PromptTemplate.ProfileXmlDefinition]: emptySchema,
  [PromptTemplate.IntakeXmlSystem]: z
    .object({
      XML_DEFINITION: z.string(),
      LANGUAGE: z.string().default('English'),
    })
    .strict(),
  [PromptTemplate.IntakeXmlStreamingSystem]: z
    .object({
      XML_DEFINITION: z.string(),
      LANGUAGE: z.string().default('English'),
    })
    .strict(),
  [PromptTemplate.IntakeXmlUser]: z
    .object({
      CHAT_HISTORY_JSON: z.string(),
      PROFILE_JSON: z.string(),
      MISSING_FIELDS_JSON: z.string().default(''),
      FILLED_FIELDS_JSON: z.string().default(''),
      FIRST_MESSAGE_NOTE: z.string().default(''),
      QUESTION_NUMBER: z.string().default('1'),
    })
    .strict(),
  [PromptTemplate.ScoreSystem]: z
    .object({
      LANGUAGE: z.string().default('English'),
    })
    .strict(),
  [PromptTemplate.AssessmentXmlSystem]: z
    .object({
      LANGUAGE: z.string().default('English'),
    })
    .strict(),
  [PromptTemplate.AssessmentXmlUser]: z
    .object({
      PROFILE_XML: z.string(),
      SKILL_JSON: z.string(),
      CHAT_HISTORY_JSON: z.string(),
      AI_FLUENCY_JSON: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.PlaybookXmlSystem]: z
    .object({
      LANGUAGE: z.string().default('English'),
      VIDEO_INSTRUCTIONS: z.string().default(''),
      EDITORIAL_GUIDE: z.string().default(''),
      CURRENT_DATE: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.PlaybookXmlUser]: z
    .object({
      PROFILE_XML: z.string(),
      SKILL_JSON: z.string(),
      ASSESSMENT_MD: z.string(),
      VIDEO_CORPUS: z.string().default(''),
      MODULE_HINTS_JSON: z.string().default(''),
      AI_FLUENCY_JSON: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.HandbookSystem]: z
    .object({
      LANGUAGE: z.string().default('English'),
      EDITORIAL_GUIDE: z.string().default(''),
      CURRENT_DATE: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.HandbookUser]: z
    .object({
      PROFILE_XML: z.string(),
      OUTLINE_PAGE: z.string(),
      FULL_PLAN_PAGE: z.string(),
      ASSESSMENT_SUMMARY: z.string().default(''),
      SIBLING_MODULES: z.string().default(''),
      SKILL_VERIFICATION: z.string().default(''),
      AI_FLUENCY: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.HandbookSystemVideoEnhanced]: z
    .object({
      LANGUAGE: z.string().default('English'),
      EDITORIAL_GUIDE: z.string().default(''),
      CURRENT_DATE: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.HandbookUserVideoEnhanced]: z
    .object({
      PROFILE_XML: z.string(),
      OUTLINE_PAGE: z.string(),
      FULL_PLAN_PAGE: z.string(),
      VIDEO_CORPUS: z.string().default(''),
      ASSESSMENT_SUMMARY: z.string().default(''),
      SIBLING_MODULES: z.string().default(''),
      SKILL_VERIFICATION: z.string().default(''),
      AI_FLUENCY: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.PlaybookXmlSystemVideoEnhanced]: z
    .object({
      LANGUAGE: z.string().default('English'),
      EDITORIAL_GUIDE: z.string().default(''),
      CURRENT_DATE: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.PlaybookXmlUserVideoEnhanced]: z
    .object({
      PROFILE_XML: z.string(),
      SKILL_JSON: z.string(),
      ASSESSMENT_MD: z.string(),
      VIDEO_CORPUS: z.string().default(''),
      MODULE_HINTS_JSON: z.string().default(''),
      AI_FLUENCY_JSON: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.InferAiFluencySystem]: z
    .object({
      LANGUAGE: z.string().default('English'),
    })
    .strict(),
  [PromptTemplate.InferAiFluencyUser]: z
    .object({
      PROFILE_XML: z.string(),
      CHAT_HISTORY_JSON: z.string(),
    })
    .strict(),
  [PromptTemplate.QuickTipSystem]: z
    .object({
      LANGUAGE: z.string().default('English'),
      EDITORIAL_GUIDE: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.QuickTipUser]: z
    .object({
      PROFILE_XML: z.string(),
      CHAT_SUMMARY: z.string(),
      PERFORMANCE_SCORE: z.string(),
      FLUENCY_LEVEL: z.string(),
    })
    .strict(),
  [PromptTemplate.VideoSegmentExtractionSystem]: z
    .object({
      MIN_SEGMENT_SECONDS: z.string().default('1.0'),
      MAX_SEGMENT_SECONDS: z.string().default('120'),
    })
    .strict(),
  [PromptTemplate.VideoSegmentExtractionUser]: z
    .object({
      VIDEO_FILE_NAME: z.string(),
      TIME_RANGE_INSTRUCTION: z.string().default('Analyze the entire video.'),
    })
    .strict(),
  [PromptTemplate.VideoTeachingSegmentSystem]: z
    .object({
      MIN_SEGMENT_SECONDS: z.string().default('5'),
      MAX_SEGMENT_SECONDS: z.string().default('60'),
    })
    .strict(),
  [PromptTemplate.VideoTeachingSegmentUser]: z
    .object({
      VIDEO_FILE_NAME: z.string(),
      TIME_RANGE_INSTRUCTION: z.string().default('Analyze the entire video.'),
    })
    .strict(),
  [PromptTemplate.ExerciseEvaluationSystem]: z
    .object({
      TYPE_GUIDELINES: z.string().default(''),
      RUBRIC: z.string().default(''),
      LANGUAGE: z.string().default('English'),
    })
    .strict(),
  [PromptTemplate.ExerciseEvaluationUser]: z
    .object({
      MAX_POINTS: z.string(),
      EXERCISE_PROMPT: z.string(),
      SUBMISSION_TEXT: z.string(),
      LEARNER_CONTEXT: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.ExerciseGenerationSystem]: z
    .object({
      LANGUAGE: z.string().default('English'),
      EDITORIAL_GUIDE: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.ExerciseGenerationUser]: z
    .object({
      CHAPTER_TITLE: z.string(),
      CHAPTER_NUMBER: z.string().default(''),
      CHAPTER_CONTENT: z.string(),
      USER_CONTEXT: z.string().default(''),
      SIBLING_MODULES: z.string().default(''),
    })
    .strict(),
};

export async function renderPrompt(template: PromptTemplate, params: Record<string, string> = {}): Promise<string> {
  const config = PROMPT_CONFIGS[template];
  if (!config) {
    throw new Error(`Prompt template "${template}" not found`);
  }
  const schema = templateSchemas[template] ?? emptySchema;
  const parsed = schema.parse(params ?? {});

  if (USE_LANGFUSE_PROMPTS) {
    const langfuseVersion = await loadLangfusePrompt(template, config, parsed);
    if (langfuseVersion) {
      return langfuseVersion;
    }
  }
  return applyPlaceholders(config.fallback, parsed, template);
}

// Export prompt configs for debugging
export function getPromptConfigs(): Array<{ template: string; name: string; type: string; fallback: string }> {
  return Object.entries(PROMPT_CONFIGS).map(([template, config]) => ({
    template,
    name: config.name,
    type: config.type,
    fallback: config.fallback,
  }));
}

async function loadLangfusePrompt(template: PromptTemplate, config: PromptConfig, variables: Record<string, string>): Promise<string | null> {
  try {
    const prompt = await fetchPrompt(config.name, {
      type: config.type,
      variables,
    });
    if (!prompt) return null;
    if (typeof prompt.compiled === 'string') {
      return prompt.compiled;
    }
    if (typeof prompt.prompt === 'string') {
      return applyPlaceholders(prompt.prompt, variables, template);
    }
  } catch (error) {
    console.warn(`[langfuse-prompts] failed to load prompt ${config.name}`, error);
  }
  return null;
}

function applyPlaceholders(base: string, values: Record<string, string>, template: PromptTemplate): string {
  PLACEHOLDER_REGEX.lastIndex = 0;
  const placeholders = Array.from(base.matchAll(PLACEHOLDER_REGEX))
    .map((match) => match[1])
    .filter(Boolean);
  const missing = placeholders.filter((key) => !(key in values));
  if (missing.length > 0) {
    throw new Error(`Missing params for prompt ${template}: ${missing.join(', ')}`);
  }
  let output = base;
  for (const key of placeholders) {
    const value = values[key] ?? '';
    output = output.split(`{{${key}}}`).join(value);
  }
  return output;
}
