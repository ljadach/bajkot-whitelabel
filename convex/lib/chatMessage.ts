/**
 * Shared chat message type definition.
 * Single source of truth for chat message structure across the codebase.
 */
import { v } from 'convex/values';

/**
 * Convex validator for chat message records.
 * Use this in all places that need to validate chat messages.
 */
export const chatMessageValidator = v.object({
  id: v.string(),
  type: v.union(v.literal('question'), v.literal('answer')),
  content: v.string(),
  widgetType: v.optional(v.union(v.literal('single-select'), v.literal('multi-select'), v.literal('likert'), v.literal('free-text'))),
  options: v.optional(v.array(v.string())),
  answer: v.optional(v.union(v.string(), v.array(v.string()), v.number())),
  timestamp: v.number(),
});

/**
 * TypeScript type for chat message records.
 * Inferred from the validator for type safety.
 */
export type ChatMessage = {
  id: string;
  type: 'question' | 'answer';
  content: string;
  widgetType?: 'single-select' | 'multi-select' | 'likert' | 'free-text';
  options?: string[];
  answer?: string | string[] | number;
  timestamp: number;
};
