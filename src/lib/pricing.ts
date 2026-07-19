/**
 * Single source of truth for product prices shown in the UI.
 *
 * If you change a value here, also update the matching string in
 * `src/locales/pl/book.json` (`formatPdfPrice`, `formatPrintPrice`) so the
 * checkout/preview translations stay in sync. The Stripe price IDs in env
 * (`STRIPE_BOOK_PRICE_ID`) are the actual billed amounts — these constants
 * are display-only.
 */
export const BOOK_PRICE_PDF_PLN = 49;
export const BOOK_PRICE_PRINT_PLN = 99;

export function formatPricePLN(value: number): string {
  return `${value} zł`;
}
