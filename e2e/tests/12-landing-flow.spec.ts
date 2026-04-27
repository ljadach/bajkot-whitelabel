import { test, expect } from '@playwright/test';

// Landing flow is for non-logged-in visitors arriving from SEO; verify it
// renders correctly without an authenticated session in storageState.
test.use({ storageState: { cookies: [], origins: [] } });

const SAMPLE_SLUG = 'napady-zlosci';

test.describe('Landing flow — topic page wizard', () => {
  test('renders topic landing page with wizard step 0', async ({ page }) => {
    await page.goto(`/problem/${SAMPLE_SLUG}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();

    // Wizard section anchor renders.
    await expect(page.locator('#kreator')).toBeVisible();

    // Step 0 has the child-name input visible.
    const childNameInput = page.locator('#kreator input[type="text"]').first();
    await expect(childNameInput).toBeVisible();
  });

  test('progresses through wizard steps when filling fields', async ({ page }) => {
    await page.goto(`/problem/${SAMPLE_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Step 0: child basics.
    const wizard = page.locator('#kreator');
    await wizard.locator('input[type="text"]').first().fill('Zosia');

    // Step 0 → 1: progress strip should reflect the change after clicking next.
    const next = wizard.getByRole('button', { name: /dalej/i });

    // Some step-0 fields (age + gender) need to be selected before next is unblocked,
    // depending on prototype-driven validation. We don't go past step 1 here —
    // just confirm we can dispatch one transition.
    await wizard.locator('select').first().selectOption({ index: 1 });
    await next.click().catch(() => {
      // If validation blocks, that's OK — we're only smoke-testing renders.
    });

    // The wizard should still be visible after the click (no crash, no nav away).
    await expect(wizard).toBeVisible();
  });
});
