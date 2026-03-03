/**
 * Frontend language configuration.
 * Imports from convex/lib/languages.ts (single source of truth).
 */

import { LANGUAGES as LANGUAGES_CONFIG, type SupportedLanguageCode, SUPPORTED_LANGUAGE_CODES, DEFAULT_LANGUAGE_CODE, isSupportedLanguage } from '../../convex/lib/languages';

// Re-export for frontend use
export type SupportedLanguage = SupportedLanguageCode;
export const SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGE_CODES;
export const DEFAULT_LANGUAGE = DEFAULT_LANGUAGE_CODE;
export const LANGUAGES = LANGUAGES_CONFIG;
export { isSupportedLanguage as isSupported };

/**
 * Get full language name for display
 */
export function getLanguageName(code: SupportedLanguage, useNative = false): string {
  const lang = LANGUAGES[code];
  return useNative ? lang.nativeName : lang.name;
}

/**
 * Get language from browser settings, falling back to default
 */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const browserLang = navigator.language.split('-')[0];
  return isSupportedLanguage(browserLang) ? browserLang : DEFAULT_LANGUAGE;
}
