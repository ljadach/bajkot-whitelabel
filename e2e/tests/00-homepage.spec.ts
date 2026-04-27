import { test, expect } from '@playwright/test';

// Public homepage — run anonymously; auth-gated paths are covered elsewhere.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Homepage', () => {
  test('renders all major sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();

    // Hero CTA links to topics anchor.
    const heroCta = page.locator('a[href="#tematy"]').first();
    await expect(heroCta).toBeVisible();

    // Section headings present (use IDs since headings come from i18n).
    for (const id of [
      'jak-to-dziala',
      'dlaczego-dziala',
      'tematy',
      'nasza-historia',
      'opinie',
      'faq',
    ]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }

    // FAQ accordion: click first question, body becomes visible.
    const firstFaq = page.locator('#faq button').first();
    await firstFaq.click();
    // Allow the accordion to render its panel.
    await expect(page.locator('#faq').locator('p').first()).toBeVisible();
  });

  test('topics grid shows at least one topic linking to /problem/<slug>', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const topicLinks = page.locator('#tematy a[href^="/problem/"]');
    expect(await topicLinks.count()).toBeGreaterThan(0);
    await expect(topicLinks.first()).toBeVisible();
  });

  test('login modal opens from hero text link', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hero "Zaloguj się" button (text link below badges).
    const signInBtn = page.getByRole('button', { name: /zaloguj/i });
    await signInBtn.click();

    // Clerk SignIn widget renders inside our modal.
    const modal = page.locator('.cl-rootBox, [class*="cl-card"], iframe[src*="clerk"]').first();
    await expect(modal).toBeVisible({ timeout: 10_000 });
  });
});
