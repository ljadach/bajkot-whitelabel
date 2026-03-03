import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Streaming-safe inline markdown processing.
 * Only applies formatting when tokens are properly closed.
 *
 * This prevents flickering during streaming by ensuring unclosed
 * tokens like "**bold" don't affect the rest of the text.
 */
function inlineMdStreaming(s: string): string {
  // Process inline code first (highest priority)
  s = applyPairedTokens(s, '`', '<code>', '</code>');

  // Process bold ** before italic * (** must not be split into two *)
  s = applyPairedTokens(s, '**', '<strong>', '</strong>');

  // Process italic _
  s = applyPairedTokens(s, '_', '<em>', '</em>');

  // Process italic * (after ** so we don't confuse them)
  // Need special handling: only match standalone *, not part of **
  s = applyPairedSingleAsterisk(s);

  return s;
}

/**
 * Apply formatting only to properly paired tokens.
 * Unpaired tokens are left as plain text (not rendered as formatting).
 */
function applyPairedTokens(text: string, token: string, openTag: string, closeTag: string): string {
  // Find all token positions
  const positions: number[] = [];
  let pos = 0;
  while ((pos = text.indexOf(token, pos)) !== -1) {
    positions.push(pos);
    pos += token.length;
  }

  // Need at least 2 tokens to form a pair
  if (positions.length < 2) {
    return text;
  }

  // Process pairs from end to start (to preserve indices)
  // Only process complete pairs - ignore last token if odd count
  const pairCount = Math.floor(positions.length / 2);
  let result = text;

  for (let i = pairCount - 1; i >= 0; i--) {
    const openPos = positions[i * 2];
    const closePos = positions[i * 2 + 1];

    // Extract content between tokens
    const before = result.slice(0, openPos);
    const content = result.slice(openPos + token.length, closePos);
    const after = result.slice(closePos + token.length);

    result = before + openTag + content + closeTag + after;
  }

  // Remove any unpaired trailing token
  if (positions.length % 2 === 1) {
    const unpaired = result.lastIndexOf(token);
    if (unpaired !== -1) {
      result = result.slice(0, unpaired) + result.slice(unpaired + token.length);
    }
  }

  return result;
}

/**
 * Handle single * for italic, being careful not to match **
 */
function applyPairedSingleAsterisk(text: string): string {
  // Temporarily replace ** to avoid confusion
  const placeholder = '\x00DBL\x00';
  let temp = text.replace(/\*\*/g, placeholder);

  // Now apply pairing logic for single *
  temp = applyPairedTokens(temp, '*', '<em>', '</em>');

  // Restore **
  return temp.split(placeholder).join('**');
}

// Minimal markdown renderer for bold/italic/code and safe underline via <u>.
// - Escapes HTML by default
// - Allows <u> tags if present in input (from LLM) by un-escaping them
// - Supports **bold**, *italic* or _italic_, `code`, and newlines -> <br/>
// - Intentionally simple to avoid pulling extra deps
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function inlineMd(s: string): string {
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/_(.+?)_/g, '<em>$1</em>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return s;
}

/**
 * Core markdown renderer with configurable inline processor.
 */
function renderMarkdownCore(input: string, inlineProcessor: (s: string) => string): string {
  if (!input) return '';
  const text = input.replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  const out: string[] = [];
  let inList = false;

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const raw of lines) {
    let line = escapeHtml(raw);
    // Allow underline HTML
    line = line.replace(/&lt;u&gt;/g, '<u>').replace(/&lt;\/u&gt;/g, '</u>');

    // Headings
    if (/^######\s+/.test(line)) {
      flushList();
      out.push(`<h6>${inlineProcessor(line.replace(/^######\s+/, ''))}</h6>`);
      continue;
    }
    if (/^#####\s+/.test(line)) {
      flushList();
      out.push(`<h5>${inlineProcessor(line.replace(/^#####\s+/, ''))}</h5>`);
      continue;
    }
    if (/^####\s+/.test(line)) {
      flushList();
      out.push(`<h4>${inlineProcessor(line.replace(/^####\s+/, ''))}</h4>`);
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushList();
      out.push(`<h3>${inlineProcessor(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushList();
      out.push(`<h2>${inlineProcessor(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushList();
      out.push(`<h1>${inlineProcessor(line.replace(/^#\s+/, ''))}</h1>`);
      continue;
    }

    // Horizontal rule
    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      flushList();
      out.push('<hr/>');
      continue;
    }

    // Unordered list item
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineProcessor(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }

    // Paragraph or blank
    flushList();
    if (line.trim().length === 0) {
      out.push('');
    } else {
      out.push(`<p>${inlineProcessor(line)}</p>`);
    }
  }

  flushList();
  return out.join('\n');
}

export function renderMarkdown(input: string): string {
  return renderMarkdownCore(input, inlineMd);
}

/**
 * Streaming-safe markdown renderer.
 * Only applies formatting when tokens are properly closed.
 * Prevents flickering when streaming partial markdown.
 */
export function renderMarkdownStreaming(input: string): string {
  return renderMarkdownCore(input, inlineMdStreaming);
}
