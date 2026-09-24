import { afterEach, describe, expect, it } from 'vitest';
import { currentStripeMode, paymentCounts, stripeConfigFor } from '../../convex/lib/stripeMode';

const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

describe('currentStripeMode', () => {
  it('defaults to test', () => {
    delete process.env.STRIPE_MODE;
    expect(currentStripeMode()).toBe('test');
  });

  it('is live only for exactly "live"', () => {
    process.env.STRIPE_MODE = 'live';
    expect(currentStripeMode()).toBe('live');
    process.env.STRIPE_MODE = 'LIVE';
    expect(currentStripeMode()).toBe('test');
  });
});

describe('stripeConfigFor', () => {
  it('reads each mode from its own env vars', () => {
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_x';
    process.env.STRIPE_TEST_BOOK_PRICE_ID = 'price_test';
    process.env.STRIPE_LIVE_BOOK_PRINT_PRICE_ID = 'price_live_print';
    expect(stripeConfigFor('test').secretKey).toBe('sk_test_x');
    expect(stripeConfigFor('live').secretKey).toBe('sk_live_x');
    expect(stripeConfigFor('test').pdfPriceId).toBe('price_test');
    expect(stripeConfigFor('live').printPriceId).toBe('price_live_print');
  });
});

describe('paymentCounts', () => {
  it('always accepts live payments', () => {
    expect(paymentCounts('live', 'live')).toBe(true);
    expect(paymentCounts('live', 'test')).toBe(true);
  });

  it('accepts test payments only while the site is in test mode', () => {
    expect(paymentCounts('test', 'test')).toBe(true);
    expect(paymentCounts('test', 'live')).toBe(false);
  });
});
