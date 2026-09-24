import type { PartnerTheme } from '../../convex/lib/partners';

/**
 * Consent clauses shown at checkout, worded per partner. The exact text the
 * parent saw is stored on the order (convex/lib/consents.ts), so the display
 * and the stored `clauseText` are built from the same parts here.
 *
 * Bump CONSENT_VERSION whenever the wording below changes — the version is
 * persisted with every consent so an audit can tell which text was accepted.
 */
export const CONSENT_VERSION = '2026-09-24';

/** A run of clause text; `link` marks the words that link to a document. */
export interface ClausePart {
  text: string;
  link?: 'terms' | 'privacy';
}

interface ConsentClauses {
  /** Terms + privacy policy acceptance (art. 6(1)(b) RODO). */
  terms: ClausePart[];
  /** Special-category data of the child — the emotional problem (art. 9(2)(a)). */
  specialData: ClausePart[];
}

export function consentClauses(partner: PartnerTheme): ConsentClauses {
  const controller = partner.legalEntity ?? partner.name;
  return {
    terms: [
      { text: 'Akceptuję ' },
      { text: 'regulamin', link: 'terms' },
      { text: ` serwisu ${partner.name} oraz zapoznałem się z ` },
      { text: 'polityką prywatności', link: 'privacy' },
      { text: '.' },
    ],
    specialData: [
      {
        text:
          'Wyrażam zgodę na przetwarzanie danych szczególnych kategorii mojego dziecka ' +
          `(wybrany problem emocjonalny) przez ${controller} wyłącznie w celu stworzenia ` +
          'i dostarczenia bajki. Zgodę mogę wycofać w każdej chwili.',
      },
    ],
  };
}

export function clauseText(parts: ClausePart[]): string {
  return parts.map((p) => p.text).join('');
}

/** Document URL behind a linked clause part, if the partner configured one. */
export function clauseLinkHref(partner: PartnerTheme, link: ClausePart['link']): string | null {
  if (link === 'terms') return partner.termsUrl ?? null;
  if (link === 'privacy') return partner.privacyUrl ?? null;
  return null;
}
