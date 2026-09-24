/**
 * UI-side pricing and timing constants. Prices come from the module shared
 * with the e-mails (convex/lib/pricing.ts) so the two can't drift.
 */
export { BOOK_PRICE_PDF_PLN, BOOK_PRICE_PRINT_PLN, formatPricePLN } from '../../convex/lib/pricing';

/** Upper bound quoted where the parent is asked to keep the tab open. */
export const GENERATION_MINUTES_MAX = 15;
