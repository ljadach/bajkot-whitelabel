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
export const BOOK_PRICE_PRINT_PLN = 139;

// LP v4 additions (spec-lp-v4-rollout.md). The promo/regular split is LP
// display copy until Stripe carries matching prices.
export const BOOK_PRICE_PDF_REGULAR_PLN = 59;
/** Omnibus: lowest PDF price within the last 30 days. */
export const BOOK_PRICE_PDF_OMNIBUS_PLN = 49;
/** One number everywhere for "gotowa w X minut" claims. */
export const GENERATION_MINUTES = 20;
/** One phrase everywhere for courier delivery claims. */
export const DELIVERY_DAYS_TEXT = '5–10 dni roboczych';

export function formatPricePLN(value: number): string {
  return `${value} zł`;
}
