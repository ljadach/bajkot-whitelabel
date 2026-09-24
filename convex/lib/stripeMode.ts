/**
 * Stripe test/live switch.
 *
 * Both key sets live side by side in the Convex env; `STRIPE_MODE` picks the
 * one new Checkout sessions use. Flipping it (`npx convex env set STRIPE_MODE
 * live`) takes effect immediately, without a redeploy. Anything other than
 * exactly `live` means test — a typo fails safe (no real charges, and the
 * paywall shows the test-mode banner).
 *
 * Per mode:
 *   STRIPE_{TEST|LIVE}_SECRET_KEY           sk_test_… / sk_live_…
 *   STRIPE_{TEST|LIVE}_WEBHOOK_SECRET       whsec_… of that mode's webhook endpoint
 *   STRIPE_{TEST|LIVE}_BOOK_PRICE_ID        one-time Price for the PDF
 *   STRIPE_{TEST|LIVE}_BOOK_PRINT_PRICE_ID  one-time Price for PDF + print
 *
 * Plain module (no 'use node') so queries can read the mode too.
 */

export type StripeMode = 'test' | 'live';

export const STRIPE_MODES: readonly StripeMode[] = ['test', 'live'];

export function currentStripeMode(): StripeMode {
  return process.env.STRIPE_MODE === 'live' ? 'live' : 'test';
}

export interface StripeModeConfig {
  secretKey: string | undefined;
  webhookSecret: string | undefined;
  pdfPriceId: string | undefined;
  printPriceId: string | undefined;
}

export function stripeConfigFor(mode: StripeMode): StripeModeConfig {
  if (mode === 'live') {
    return {
      secretKey: process.env.STRIPE_LIVE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_LIVE_WEBHOOK_SECRET,
      pdfPriceId: process.env.STRIPE_LIVE_BOOK_PRICE_ID,
      printPriceId: process.env.STRIPE_LIVE_BOOK_PRINT_PRICE_ID,
    };
  }
  return {
    secretKey: process.env.STRIPE_TEST_SECRET_KEY,
    webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET,
    pdfPriceId: process.env.STRIPE_TEST_BOOK_PRICE_ID,
    printPriceId: process.env.STRIPE_TEST_BOOK_PRINT_PRICE_ID,
  };
}

/**
 * Whether a completed payment may unlock an order. Live payments always do —
 * real money moved. Test payments only count while the site itself is in test
 * mode, so after switching to live nobody unlocks a book with card 4242.
 */
export function paymentCounts(paymentMode: StripeMode, siteMode: StripeMode): boolean {
  return paymentMode === 'live' || siteMode === 'test';
}
