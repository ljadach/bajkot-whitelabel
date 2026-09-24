/**
 * Display prices, shared by the frontend (order form, paywall) and the
 * e-mails. Stripe bills the Price IDs configured per mode in the Convex env
 * (lib/stripeMode.ts) — keep those Prices at these amounts. The confirmation
 * e-mail shows what Stripe actually charged, not these constants.
 */

export const BOOK_PRICE_PDF_PLN = 49;
export const BOOK_PRICE_PRINT_PLN = 139;

export function priceForFormatPLN(format: 'pdf' | 'pdf_print'): number {
  return format === 'pdf_print' ? BOOK_PRICE_PRINT_PLN : BOOK_PRICE_PDF_PLN;
}

export function formatPricePLN(value: number): string {
  return `${value} zł`;
}
