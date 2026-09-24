/**
 * White-label partner themes.
 *
 * One deployment serves several partner pitches. The first URL segment picks
 * the theme (`/przyklad/zamow/...`); no segment means the default theme. The
 * same registry is read by the frontend (colours, logo, copy) and by the
 * backend (e-mails, Stripe return URLs), and every order stores its
 * `partnerId`, so a parent sees one brand from the form to the e-mail links.
 *
 * Adding a partner: copy the `przyklad` entry, give it a unique `id`, drop an
 * optional logo into `public/partners/`, then deploy both halves
 * (`npm run deploy`). `tests/unit/partners.test.ts` checks the registry.
 */

import { isHexColor } from './palette';

export interface PartnerTheme {
  /** URL slug: lowercase letters, digits and hyphens. */
  id: string;
  /** Brand name — header, page titles, e-mails, Stripe Checkout note. */
  name: string;
  /** Optional one-liner under the name in the header. */
  tagline?: string;
  /**
   * Logo image: a path under `public/` (e.g. `/partners/acme.svg`) or an
   * absolute URL. Without it the header shows a monogram plus the name.
   * E-mails show it too, so it must be reachable from the internet.
   */
  logoUrl?: string;
  colors: {
    /** Headings, tabs, links, highlights. */
    primary: string;
    /** Call-to-action buttons. Text colour on it is picked for contrast. */
    accent: string;
  };
  /** Where parents write with questions (print requests, failures). E-mail reply-to. */
  supportEmail?: string;
  /** Who processes the child's data — named in the consent checkbox. */
  legalEntity?: string;
  /** Linked from the consent checkbox. Plain text when absent. */
  termsUrl?: string;
  privacyUrl?: string;
}

export const DEFAULT_PARTNER_ID = 'demo';

export const PARTNERS: readonly PartnerTheme[] = [
  {
    // Neutral placeholder shown at the bare domain — "your brand goes here".
    id: DEFAULT_PARTNER_ID,
    name: 'Twoja Marka',
    tagline: 'personalizowane bajki dla dzieci',
    colors: { primary: '#4f46e5', accent: '#c2410c' },
  },
  {
    // Example of a configured partner: own logo, light accent (buttons get
    // dark text automatically), support address and legal entity.
    id: 'przyklad',
    name: 'Księgarnia Przykładowa',
    tagline: 'bajki szyte na miarę',
    logoUrl: '/partners/przyklad.svg',
    colors: { primary: '#15803d', accent: '#facc15' },
    supportEmail: 'bajki@example.com',
    legalEntity: 'Księgarnia Przykładowa Sp. z o.o.',
  },
];

/**
 * First path segments the app itself uses (static routes and `public/`
 * folders). A partner id equal to one of these would shadow a page.
 */
export const RESERVED_PATH_SEGMENTS = ['zamow', 'bajka', 'partners', 'api', 'assets'] as const;

const PARTNER_ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export function isValidPartnerId(id: string): boolean {
  return PARTNER_ID_RE.test(id) && !(RESERVED_PATH_SEGMENTS as readonly string[]).includes(id);
}

export function getPartner(id: string | null | undefined): PartnerTheme | undefined {
  if (!id) return undefined;
  return PARTNERS.find((p) => p.id === id);
}

/** Theme for `id`, or the default theme when `id` is missing or unknown. */
export function resolvePartner(id: string | null | undefined): PartnerTheme {
  return getPartner(id) ?? getPartner(DEFAULT_PARTNER_ID)!;
}

/** Problems with the registry, for the unit test (empty when valid). */
export function validatePartners(partners: readonly PartnerTheme[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const p of partners) {
    if (!isValidPartnerId(p.id)) errors.push(`${p.id}: invalid or reserved id`);
    if (seen.has(p.id)) errors.push(`${p.id}: duplicate id`);
    seen.add(p.id);
    if (!p.name.trim()) errors.push(`${p.id}: empty name`);
    if (!isHexColor(p.colors.primary)) errors.push(`${p.id}: colors.primary is not #rrggbb`);
    if (!isHexColor(p.colors.accent)) errors.push(`${p.id}: colors.accent is not #rrggbb`);
  }
  if (!seen.has(DEFAULT_PARTNER_ID)) errors.push(`missing default partner "${DEFAULT_PARTNER_ID}"`);
  return errors;
}

// ── URL builders ────────────────────────────────────────────
// Shared by the frontend router and the backend (e-mail links, Stripe
// return URLs, payment links), so the URL shape lives in one place.

function prefix(partnerId: string | null | undefined): string {
  const partner = resolvePartner(partnerId);
  return partner.id === DEFAULT_PARTNER_ID ? '' : `/${partner.id}`;
}

/** Topic picker — the start of the flow. */
export function startPath(partnerId: string | null | undefined): string {
  return prefix(partnerId) || '/';
}

/** Order form for one topic. */
export function orderFormPath(partnerId: string | null | undefined, topicSlug: string): string {
  return `${prefix(partnerId)}/zamow/${topicSlug}`;
}

/** Live progress: style vote and dedication happen here. */
export function bookProgressPath(partnerId: string | null | undefined, orderId: string): string {
  return `${prefix(partnerId)}/bajka/${orderId}`;
}

/** Preview + paywall, then the download once paid. */
export function bookResultPath(partnerId: string | null | undefined, orderId: string): string {
  return `${prefix(partnerId)}/bajka/${orderId}/gotowa`;
}
