/**
 * Convex validator for preferredLanguage field.
 * Single source of truth for language validation in schema and mutations.
 *
 * Keep in sync with LANGUAGES in languages.ts when adding new languages.
 */

import { v } from 'convex/values';

/**
 * Validator for supported language codes.
 * Use this in schema and mutation args for preferredLanguage field.
 */
export const languageCodeValidator = v.union(v.literal('en'), v.literal('pl'), v.literal('de'));

/**
 * Optional version for fields that may not be set.
 */
export const optionalLanguageCodeValidator = v.optional(languageCodeValidator);
