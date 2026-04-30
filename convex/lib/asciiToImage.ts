'use node';

/**
 * Dev-only "fast image" placeholder generator.
 *
 * Replaces the slow Gemini Flash image call (2–3 s + 2 s rate-limit gap)
 * with a local PNG render — deterministic geometric placeholder that
 * varies per-prompt (hash-seeded stripe pattern) so admins can see the
 * pipeline reaches the illustrate step without burning image budget.
 *
 * Pure-JS via `pngjs` so it bundles cleanly into Convex (no native .node
 * binaries — the Convex bundler can't load those).
 */

import { PNG } from 'pngjs';

// 8×8 bitmap font for "DEV". 1 = pixel on, 0 = off.
// Order: rows top→bottom, columns left→right.
const GLYPH_D: number[] = [
  0b11111100, 0b10000110, 0b10000011, 0b10000011, 0b10000011, 0b10000011, 0b10000110, 0b11111100,
];
const GLYPH_E: number[] = [
  0b11111111, 0b10000000, 0b10000000, 0b11111110, 0b11111110, 0b10000000, 0b10000000, 0b11111111,
];
const GLYPH_V: number[] = [
  0b10000001, 0b10000001, 0b10000001, 0b01000010, 0b01000010, 0b00100100, 0b00011000, 0b00011000,
];

const GLYPHS = [GLYPH_D, GLYPH_E, GLYPH_V];

/** djb2 hash → 32-bit unsigned int. Deterministic per prompt. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

function fillRect(
  buf: Buffer,
  width: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const idx = (yy * width + xx) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }
}

/** Draw "DEV" centered at (cx, cy) using 8×8 glyphs scaled by `scale`. */
function drawDev(buf: Buffer, width: number, cx: number, cy: number, scale: number) {
  const charW = 8 * scale;
  const charH = 8 * scale;
  const gap = scale * 2;
  const totalW = charW * 3 + gap * 2;
  const startX = cx - Math.floor(totalW / 2);
  const startY = cy - Math.floor(charH / 2);
  for (let i = 0; i < GLYPHS.length; i++) {
    const glyph = GLYPHS[i];
    const gx = startX + i * (charW + gap);
    for (let row = 0; row < 8; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 8; col++) {
        if ((bits >> (7 - col)) & 1) {
          fillRect(buf, width, gx + col * scale, startY + row * scale, scale, scale, 0, 0, 0);
        }
      }
    }
  }
}

export function asciiPlaceholderPng(
  prompt: string,
  opts: { width: number; height: number },
): Uint8Array {
  const width = Math.max(64, opts.width);
  const height = Math.max(64, opts.height);
  const png = new PNG({ width, height });
  const buf = png.data;

  // White background.
  fillRect(buf, width, 0, 0, width, height, 255, 255, 255);

  // Outer black border (~1% of width).
  const border = Math.max(3, Math.floor(width * 0.012));
  fillRect(buf, width, 0, 0, width, border, 0, 0, 0);
  fillRect(buf, width, 0, height - border, width, border, 0, 0, 0);
  fillRect(buf, width, 0, 0, border, height, 0, 0, 0);
  fillRect(buf, width, width - border, 0, border, height, 0, 0, 0);

  // Hash-seeded horizontal stripes so different prompts look distinct.
  const seed = hash(prompt);
  const stripeCount = 6;
  const stripeBand = Math.floor(height * 0.18);
  const stripeStart = Math.floor(height * 0.78);
  for (let i = 0; i < stripeCount; i++) {
    const w = ((seed >> (i * 4)) & 0xf) + 4;
    const x = ((seed >> (i * 5)) & 0x7f) % Math.max(1, width - w * 8);
    const y = stripeStart + Math.floor((i / stripeCount) * stripeBand);
    fillRect(
      buf,
      width,
      x,
      y,
      w * 8,
      Math.max(2, Math.floor(stripeBand / stripeCount / 2)),
      0,
      0,
      0,
    );
  }

  // "DEV" centered, scale tied to image size.
  const scale = Math.max(4, Math.floor(width / 60));
  drawDev(buf, width, Math.floor(width / 2), Math.floor(height * 0.45), scale);

  return PNG.sync.write(png);
}
