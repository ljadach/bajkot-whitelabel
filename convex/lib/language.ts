/**
 * Language utilities for backend LLM prompts.
 * Re-exports from languages.ts (single source of truth) with convenience helpers.
 */

import { getLanguageNameFromCode, DEFAULT_LANGUAGE_NAME } from './languages';

// Re-export for convenience
export { getLanguageNameFromCode as getLanguageName, DEFAULT_LANGUAGE_NAME };
export * from './languages';

/**
 * Get language name from a profile object.
 * Convenience wrapper for common pattern.
 *
 * @param profile - Object with optional preferredLanguage field
 * @returns Full language name for LLM prompts
 */
export function getLanguageFromProfile(profile: { preferredLanguage?: string | null } | null | undefined): string {
  return getLanguageNameFromCode(profile?.preferredLanguage);
}
