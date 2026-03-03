/**
 * Simple parser for streaming intake chat responses.
 *
 * Format: message text, then delimiter, then JSON metadata.
 * Example:
 *   Great! **What tools do you use?** ✨
 *   <<<JSON_RESPONSE>>>
 *   {"widget":{"type":"multi-select","options":["ChatGPT","Claude"]},"profileXml":"...","complete":false}
 *
 * The delimiter uses triple angle brackets which are extremely unlikely to appear
 * in natural LLM output, making parsing more robust.
 *
 * For backward compatibility, we also support the legacy "---JSON---" delimiter.
 */

const JSON_DELIMITER = '<<<JSON_RESPONSE>>>';
const JSON_DELIMITER_LEGACY = '---JSON---';

/**
 * Find the delimiter position in text, checking both new and legacy formats.
 * Returns { index: number, delimiter: string } or { index: -1, delimiter: '' } if not found.
 */
function findDelimiter(text: string): { index: number; delimiter: string } {
  const newIndex = text.indexOf(JSON_DELIMITER);
  const legacyIndex = text.indexOf(JSON_DELIMITER_LEGACY);

  // If neither found
  if (newIndex === -1 && legacyIndex === -1) {
    return { index: -1, delimiter: '' };
  }

  // If only one found, use it
  if (newIndex === -1) {
    return { index: legacyIndex, delimiter: JSON_DELIMITER_LEGACY };
  }
  if (legacyIndex === -1) {
    return { index: newIndex, delimiter: JSON_DELIMITER };
  }

  // If both found, use whichever comes first
  if (newIndex < legacyIndex) {
    return { index: newIndex, delimiter: JSON_DELIMITER };
  }
  return { index: legacyIndex, delimiter: JSON_DELIMITER_LEGACY };
}

export interface ParsedStreamResult {
  message: string;
  widget: {
    type: 'single-select' | 'multi-select' | 'likert' | 'free-text';
    options?: string[];
  };
  profileXml: string;
  complete: boolean;
}

/**
 * Extract the message portion for display during streaming.
 * Returns all text before the JSON delimiter.
 */
export function extractStreamingMessage(partialText: string): string {
  const { index } = findDelimiter(partialText);
  if (index === -1) {
    // Still streaming the message, return what we have
    return partialText.trim();
  }
  // Message is complete, return up to delimiter
  return partialText.slice(0, index).trim();
}

/**
 * Check if the stream has reached the JSON metadata.
 */
export function isMessageComplete(partialText: string): boolean {
  const { index } = findDelimiter(partialText);
  return index !== -1;
}

/**
 * Parse the complete streamed response.
 * Returns null if parsing fails.
 */
export function parseStreamedIntakeResponse(fullText: string): ParsedStreamResult | null {
  const { index: delimiterIndex, delimiter } = findDelimiter(fullText);

  if (delimiterIndex === -1) {
    // No delimiter found - treat entire text as message
    console.warn('[streamParser] No JSON delimiter found');
    return null;
  }

  const message = fullText.slice(0, delimiterIndex).trim();
  let jsonPart = fullText.slice(delimiterIndex + delimiter.length).trim();

  if (!jsonPart) {
    console.error('[streamParser] No JSON after delimiter');
    return null;
  }

  // Strip markdown code fences if LLM wraps JSON in ```json ... ```
  jsonPart = jsonPart.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

  try {
    const data = JSON.parse(jsonPart) as {
      widget?: { type: string; options?: string[] };
      profileXml?: string;
      complete?: boolean;
    };

    return {
      message,
      widget: (data.widget as ParsedStreamResult['widget']) || {
        type: 'free-text',
      },
      profileXml: data.profileXml || '',
      complete: data.complete || false,
    };
  } catch (e) {
    console.error('[streamParser] Failed to parse JSON:', e);
    return null;
  }
}
