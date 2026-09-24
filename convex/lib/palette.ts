/**
 * Colour scales for white-label themes.
 *
 * A partner theme gives two brand colours; the UI needs Tailwind-style
 * 50–900 scales (light tints for backgrounds, dark shades for headings).
 * Scales are derived by mixing the base colour with white or black in sRGB,
 * with the base itself at 500. Pure functions — shared by the frontend
 * (CSS variables) and the e-mail templates (inline styles).
 */

export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type Shade = (typeof SHADES)[number];
export type Palette = Record<Shade, string>;

// [mix target, amount]. 0 = the base colour itself.
const MIX: Record<Shade, ['white' | 'black', number]> = {
  50: ['white', 0.95],
  100: ['white', 0.9],
  200: ['white', 0.75],
  300: ['white', 0.6],
  400: ['white', 0.3],
  500: ['white', 0],
  600: ['black', 0.15],
  700: ['black', 0.3],
  800: ['black', 0.45],
  900: ['black', 0.6],
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  if (!isHexColor(hex)) throw new Error(`Invalid colour "${hex}" — expected #rrggbb`);
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function mix(base: Rgb, target: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) => base[i] + (target[i] - base[i]) * amount) as Rgb;
}

export function paletteFromHex(hex: string): Palette {
  const base = hexToRgb(hex);
  const white: Rgb = [255, 255, 255];
  const black: Rgb = [0, 0, 0];
  const out = {} as Palette;
  for (const shade of SHADES) {
    const [target, amount] = MIX[shade];
    out[shade] = rgbToHex(mix(base, target === 'white' ? white : black, amount));
  }
  return out;
}

/** "#4f46e5" → "79 70 229" — the form Tailwind's `<alpha-value>` CSS variables expect. */
export function rgbChannels(hex: string): string {
  return hexToRgb(hex).join(' ');
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Near-black used for text on light brand colours. */
export const DARK_TEXT = '#1f2937';

/**
 * The lightest shade from 500 up that reads as text on white (WCAG AA). A
 * yellow brand colour can't be used for text as is; this finds the darker
 * shade that can, and returns the base itself when it already passes.
 */
export function inkShade(palette: Palette): string {
  for (const shade of [500, 600, 700, 800] as const) {
    if (contrastRatio(palette[shade], '#ffffff') >= 4.5) return palette[shade];
  }
  return palette[900];
}

/**
 * Text colour for content sitting on `background`: white when it reads well
 * (WCAG AA, 4.5:1), otherwise near-black. Lets a partner bring a light brand
 * colour (yellow, pastel) without their buttons turning illegible.
 */
export function textColorOn(background: string): string {
  return contrastRatio(background, '#ffffff') >= 4.5 ? '#ffffff' : DARK_TEXT;
}
