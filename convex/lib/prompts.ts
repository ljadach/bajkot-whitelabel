import { z } from 'zod';
import type { PromptConfig } from './prompts/types';
import { PromptTemplate } from './prompts/types';

// Re-export everything consumers need
export { PromptTemplate } from './prompts/types';
export type { PromptConfig } from './prompts/types';

const PLACEHOLDER_REGEX = /{{([A-Z0-9_]+)}}/g;
const emptySchema = z.object({}).strict();

export const templateSchemas: Record<PromptTemplate, z.ZodType<any>> = {
  [PromptTemplate.BookIntake]: emptySchema,
  [PromptTemplate.BookChildProfiler]: z
    .object({
      ORDER_JSON: z.string(),
      ART_STYLE_SPEC: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.BookStoryArchitect]: z
    .object({
      ORDER_JSON: z.string(),
      CHARACTER_PROFILE: z.string(),
    })
    .strict(),
  [PromptTemplate.BookStoryWriter]: z
    .object({
      STORY_BLUEPRINT: z.string(),
      CHARACTER_PROFILE: z.string(),
    })
    .strict(),
  [PromptTemplate.BookPsychReviewer]: z
    .object({
      ORDER_JSON: z.string(),
      CHARACTER_PROFILE: z.string(),
      STORY_BLUEPRINT: z.string(),
      STORY_DRAFT: z.string(),
    })
    .strict(),
  [PromptTemplate.BookArtDirector]: z
    .object({
      CHARACTER_PROFILE: z.string(),
      STORY_BLUEPRINT: z.string(),
      STORY_DRAFT: z.string(),
      ART_STYLE: z.string().default(''),
      ART_MODIFIERS: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.BookCharacterDesigner]: z
    .object({
      CHARACTER_DESCRIPTION_EN: z.string(),
      GUIDE_DESCRIPTION_EN: z.string().default(''),
      VISUAL_ANCHOR: z.string(),
      ART_STYLE: z.string().default(''),
      ART_MODIFIERS: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.BookStyleVote]: emptySchema,
  [PromptTemplate.BookIllustrator]: z
    .object({
      ART_STYLE: z.string().default(''),
      ART_MODIFIERS: z.string().default(''),
      ILLUSTRATION_ID: z.string().default(''),
      ILLUSTRATION_PROMPT: z.string().default(''),
      VISUAL_ANCHOR: z.string().default(''),
      ASPECT_RATIO: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.BookVisualQa]: z
    .object({
      VISUAL_ANCHOR: z.string(),
      CHARACTER_DESCRIPTION_EN: z.string(),
      GUIDE_DESCRIPTION_EN: z.string().default(''),
      ILLUSTRATION_PLAN: z.string(),
    })
    .strict(),
  [PromptTemplate.BookComposer]: z
    .object({
      MOOD_PALETTE_0: z.string().default('#F5C35E'),
      MOOD_PALETTE_1: z.string().default('#C9A0DC'),
    })
    .strict(),
  [PromptTemplate.BookFinalQa]: z.object({}).strict(),
  [PromptTemplate.BookDelivery]: z
    .object({
      CHILD_NAME: z.string().default(''),
      BOOK_TITLE: z.string().default(''),
      DOWNLOAD_URL: z.string().default(''),
      DOWNLOAD_EXPIRY: z.string().default('48 godzin'),
      UPSELL_URL: z.string().default(''),
    })
    .strict(),
  [PromptTemplate.BookPipelineIndex]: emptySchema,
};

export function applyPlaceholders(
  base: string,
  values: Record<string, string>,
  template: PromptTemplate,
): string {
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
