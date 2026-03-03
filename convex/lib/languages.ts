/**
 * Single source of truth for language configuration.
 * Used by both frontend (i18n) and backend (LLM prompts).
 *
 * To add a new language:
 * 1. Add entry to LANGUAGES object below
 * 2. Add the literal to schema.ts preferredLanguage union
 * 3. Create src/locales/{code}/ folder with translation JSON files
 */

export const LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  pl: { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', dir: 'ltr' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
} as const;

export type SupportedLanguageCode = keyof typeof LANGUAGES;

export const SUPPORTED_LANGUAGE_CODES = Object.keys(LANGUAGES) as SupportedLanguageCode[];

export const DEFAULT_LANGUAGE_CODE: SupportedLanguageCode = 'en';
export const DEFAULT_LANGUAGE_NAME = 'English';

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(code: string): code is SupportedLanguageCode {
  return code in LANGUAGES;
}

/**
 * Get full language name from code for LLM prompts.
 * Falls back to 'English' if code is unknown or not provided.
 */
export function getLanguageNameFromCode(code: string | undefined | null): string {
  if (!code) {
    return DEFAULT_LANGUAGE_NAME;
  }

  const normalized = code.trim().toLowerCase();

  // If it's already a full name, return properly cased version
  for (const lang of Object.values(LANGUAGES)) {
    if (lang.name.toLowerCase() === normalized) {
      return lang.name;
    }
  }

  // Convert code to name
  if (isSupportedLanguage(normalized)) {
    return LANGUAGES[normalized].name;
  }

  return DEFAULT_LANGUAGE_NAME;
}
