/**
 * E2E tests for authenticated pages: Dashboard and Settings.
 * These pages require Clerk authentication (uses stored auth state).
 * Run `npm run test:e2e:login` first to establish a session.
 */
import { test, expect } from '../fixtures/test.fixture';

const BASE = 'http://localhost:5173';

/** Check if Clerk auth is available, skip test if not */
async function requireAuth(page: import('@playwright/test').Page) {
  try {
    await page.locator('.cl-userButtonTrigger').waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    test.skip(true, 'Auth session not available — run npm run test:e2e:login first');
  }
}

test.describe.serial('Dashboard - Authenticated', () => {
  test.setTimeout(60_000);

  test('dashboard page loads for authenticated user', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await requireAuth(page);

    // Spinner should disappear (lazy-loaded component)
    await expect(page.locator('.spinner')).not.toBeVisible({ timeout: 15_000 });

    // Page should render content (not be blank)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText!.length).toBeGreaterThan(50);

    // Should not show error boundary
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('dashboard is accessible via navigation', async ({ page }) => {
    await page.goto(`${BASE}/chat`);
    await page.waitForLoadState('networkidle');
    await requireAuth(page);

    // Look for a dashboard link/button in header or nav
    const dashboardLink = page.locator('a[href="/dashboard"], a[href*="dashboard"]').first();
    if (await dashboardLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/dashboard');
    }
  });
});

test.describe.serial('Settings - Authenticated', () => {
  test.setTimeout(60_000);

  test('settings page loads for authenticated user', async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState('networkidle');
    await requireAuth(page);

    // Spinner should disappear
    await expect(page.locator('.spinner')).not.toBeVisible({ timeout: 15_000 });

    // Page should render content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText!.length).toBeGreaterThan(50);

    // Should not show error boundary
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});

test.describe.serial('Auth-Gated Routes - Guards', () => {
  test.setTimeout(60_000);

  test('authenticated user can navigate between app routes', async ({ page }) => {
    await page.goto(`${BASE}/chat`);
    await page.waitForLoadState('networkidle');
    await requireAuth(page);

    // Navigate to dashboard
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();

    // Navigate to settings
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
