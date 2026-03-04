/**
 * Frontend language configuration — Polish only.
 */

export type SupportedLanguage = 'pl';

export function isSupported(code: string): code is SupportedLanguage {
  return code === 'pl';
}

export function detectBrowserLanguage(): SupportedLanguage {
  return 'pl';
}
