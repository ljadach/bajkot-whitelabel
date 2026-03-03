/**
 * JSON parsing utilities for handling LLM responses.
 *
 * LLMs often wrap JSON in markdown code blocks (```json ... ```) even when
 * instructed not to. These utilities safely extract and parse JSON from
 * such responses.
 */

/**
 * Strips markdown code fences from text.
 * Handles ```json, ```typescript, ``` and other language tags.
 *
 * @example
 * stripCodeFences('```json\n{"key": "value"}\n```') // '{"key": "value"}'
 */
export function stripCodeFences(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, '$1').trim();
}

/**
 * Attempts to extract a JSON object or array from text.
 * First strips code fences, then finds the first valid JSON structure.
 *
 * @returns The extracted JSON string, or null if none found
 *
 * @example
 * tryExtractJson('Here is the data: {"key": "value"} hope it helps!')
 * // '{"key": "value"}'
 */
export function tryExtractJson(text: string): string | null {
  const s = stripCodeFences(text).trim();

  // Try to find a JSON object
  const objMatch = s.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0];

  // Try to find a JSON array
  const arrMatch = s.match(/\[[\s\S]*\]/);
  if (arrMatch) return arrMatch[0];

  return null;
}

/**
 * Sanitize control characters inside JSON string values.
 * LLMs sometimes return literal control chars (0x00-0x1F) inside JSON strings
 * which causes `JSON.parse` to fail with "Bad control character in string literal".
 */
export function sanitizeJsonControlChars(text: string): string {
  // Replace control characters (0x00-0x1F) that appear inside string values
  // but preserve already-escaped sequences like \n, \t, \r, \\, \", etc.
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x1F]/g, (ch) => {
    switch (ch) {
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      default:
        return '';
    }
  });
}

/**
 * Safely parses JSON from LLM response text.
 * Handles markdown code blocks and extracts JSON even when surrounded by other text.
 *
 * @param text - Raw LLM response text
 * @returns Parsed JSON object/array
 * @throws Error if no valid JSON can be extracted
 *
 * @example
 * safeParseJson<{hook: string}>('```json\n{"hook": "test"}\n```')
 * // { hook: "test" }
 */
export function safeParseJson<T>(text: string): T {
  // First try: strip code fences and parse directly
  const stripped = stripCodeFences(text);
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Second try: extract JSON structure from text
    const extracted = tryExtractJson(text);
    if (extracted) {
      try {
        return JSON.parse(extracted) as T;
      } catch {
        // Third try: sanitize control chars that LLMs sometimes emit
        return JSON.parse(sanitizeJsonControlChars(extracted)) as T;
      }
    }
    throw new Error('Unable to parse JSON from text');
  }
}
