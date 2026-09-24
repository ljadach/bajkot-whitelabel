import { describe, expect, it } from 'vitest';
import {
  DARK_TEXT,
  SHADES,
  contrastRatio,
  inkShade,
  isHexColor,
  paletteFromHex,
  rgbChannels,
  textColorOn,
} from '../../convex/lib/palette';
import { PARTNERS } from '../../convex/lib/partners';
import { faviconDataUri, monogram, themeCss } from '../../src/lib/theme';

describe('paletteFromHex', () => {
  it('keeps the base at 500 and runs light → dark', () => {
    const palette = paletteFromHex('#4f46e5');
    expect(palette[500]).toBe('#4f46e5');
    const luminanceOrder = SHADES.map((shade) => contrastRatio(palette[shade], '#000000'));
    for (let i = 1; i < luminanceOrder.length; i++) {
      expect(luminanceOrder[i]!).toBeLessThan(luminanceOrder[i - 1]!);
    }
  });

  it('rejects anything but #rrggbb', () => {
    expect(isHexColor('#abc')).toBe(false);
    expect(() => paletteFromHex('red')).toThrow();
  });

  it('formats channels for Tailwind alpha variables', () => {
    expect(rgbChannels('#4f46e5')).toBe('79 70 229');
  });
});

describe('contrast helpers', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('puts dark text on light brand colours and white on dark ones', () => {
    expect(textColorOn('#facc15')).toBe(DARK_TEXT);
    expect(textColorOn('#15803d')).toBe('#ffffff');
  });

  it('finds a readable ink shade even for yellow', () => {
    const ink = inkShade(paletteFromHex('#facc15'));
    expect(contrastRatio(ink, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('gives every shipped partner readable buttons and text', () => {
    for (const partner of PARTNERS) {
      for (const hex of [partner.colors.primary, partner.colors.accent]) {
        expect(contrastRatio(textColorOn(hex), hex)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(inkShade(paletteFromHex(hex)), '#ffffff')).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('theme output', () => {
  it('emits every CSS variable the Tailwind config reads', () => {
    const css = themeCss(PARTNERS[0]!);
    for (const scale of ['primary', 'accent']) {
      for (const shade of SHADES) expect(css).toContain(`--${scale}-${shade}:`);
      expect(css).toContain(`--${scale}-ink:`);
    }
    expect(css).toContain('--on-primary:');
    expect(css).toContain('--on-accent:');
  });

  it('builds monograms and an SVG favicon', () => {
    expect(monogram('Twoja Marka')).toBe('TM');
    expect(monogram('księgarnia przykładowa')).toBe('KP');
    expect(monogram('Solo')).toBe('S');
    expect(faviconDataUri(PARTNERS[0]!)).toMatch(/^data:image\/svg\+xml,/);
  });
});
