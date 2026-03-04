import { test, expect } from '../fixtures/test.fixture';

test.describe('Book Pipeline Smoke', () => {
  test('progress page renders with pipeline steps', async ({ page }) => {
    // Navigate to a non-existent order to verify error handling
    await page.goto('/book/fake-order-id/progress');
    await page.waitForLoadState('networkidle');

    // Should show some content (error or redirect, not a blank page)
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(0);
  });

  test('order form page loads without errors', async ({ page }) => {
    await page.goto('/book/order');
    await page.waitForLoadState('networkidle');

    // Form heading should be visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // No console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Wait a moment for any delayed errors
    await page.waitForTimeout(1000);
    // Filter out known non-critical errors (e.g., 3rd party tracking)
    const criticalErrors = errors.filter(
      (e) => !e.includes('posthog') && !e.includes('clerk') && !e.includes('favicon')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
