import {
  SHADES,
  inkShade,
  paletteFromHex,
  rgbChannels,
  textColorOn,
} from '../../convex/lib/palette';
import { resolvePartner, type PartnerTheme } from '../../convex/lib/partners';

/**
 * The partner is the first URL segment (`/przyklad/zamow/...`); anything
 * else — no segment, a route name, an unknown id — means the default theme.
 * Unknown ids 404 in the route loader; this only decides the look.
 */
export function partnerFromPathname(pathname: string): PartnerTheme {
  return resolvePartner(pathname.split('/')[1]);
}

/**
 * CSS variables behind the `primary-*`, `accent-*` and `on-*` Tailwind
 * colours (tailwind.config.js). Rendered into <head> on the server, so the
 * first paint is already in the partner's colours.
 */
export function themeCss(partner: PartnerTheme): string {
  const vars: string[] = [];
  const scales = [
    ['primary', partner.colors.primary],
    ['accent', partner.colors.accent],
  ] as const;
  for (const [name, hex] of scales) {
    const palette = paletteFromHex(hex);
    for (const shade of SHADES) vars.push(`--${name}-${shade}:${rgbChannels(palette[shade])}`);
    vars.push(`--${name}-ink:${rgbChannels(inkShade(palette))}`);
  }
  vars.push(`--on-primary:${rgbChannels(textColorOn(partner.colors.primary))}`);
  vars.push(`--on-accent:${rgbChannels(textColorOn(partner.colors.accent))}`);
  return `:root{${vars.join(';')}}`;
}

/** Up to two initials of the brand name: "Twoja Marka" → "TM". */
export function monogram(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('');
  return initials.toLocaleUpperCase('pl-PL') || '?';
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** Favicon: the monogram on the partner's primary colour, as an SVG data URI. */
export function faviconDataUri(partner: PartnerTheme): string {
  const bg = partner.colors.primary;
  const text = monogram(partner.name);
  const fontSize = text.length > 1 ? 30 : 40;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${bg}"/>` +
    `<text x="32" y="34" text-anchor="middle" dominant-baseline="middle" ` +
    `font-family="Nunito,Arial,sans-serif" font-weight="800" font-size="${fontSize}" ` +
    `fill="${textColorOn(bg)}">${escapeXml(text)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** "Wybierz temat | Twoja Marka" */
export function pageTitle(pathname: string, title?: string): string {
  const { name } = partnerFromPathname(pathname);
  return title ? `${title} | ${name}` : name;
}
