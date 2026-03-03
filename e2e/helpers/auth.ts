import { Page } from '@playwright/test';

/**
 * Wait for Clerk to establish an authenticated session.
 * Clerk refreshes the short-lived __session JWT from __clerk_db_jwt
 * on page load — this can take several seconds.
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  try {
    // waitFor actually waits (unlike isVisible which returns immediately)
    await page.locator('.cl-userButtonTrigger').waitFor({
      state: 'visible',
      timeout: 20_000,
    });
  } catch {
    throw new Error(
      'Session expired - auth state is invalid.\n' +
        'Run `npm run test:e2e:login` to re-authenticate.'
    );
  }
}
