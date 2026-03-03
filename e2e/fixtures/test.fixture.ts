import { test as base, expect, Page } from '@playwright/test';
import { assertAuthenticated } from '../helpers/auth';

// Extend base test with our fixtures
export const test = base.extend<{
  resetProfile: () => Promise<void>;
}>({
  // Fixture to reset user profile before test
  resetProfile: async ({ page }, use) => {
    const reset = async () => {
      // Navigate to app
      await page.goto('/chat');
      await page.waitForLoadState('networkidle');

      // Verify session is valid
      await assertAuthenticated(page);

      // Wait for auth to be established
      await page.waitForSelector('.cl-userButtonTrigger', { timeout: 15_000 });

      // Open debug panel if not already open
      const debugToggle = page.locator('button:has-text("Debug")');
      if (await debugToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await debugToggle.click();
        await page.waitForTimeout(500);
      }

      // Handle the confirm dialog - accept it automatically
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });

      // Find and click Reset button
      const resetButton = page.locator('[data-testid="reset-profile-button"]');
      await expect(resetButton).toBeVisible({ timeout: 5000 });
      await resetButton.click();

      // Wait for page to reload (the reset triggers location.reload())
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('.cl-userButtonTrigger', { timeout: 15_000 });

      // Small delay to ensure state is fresh
      await page.waitForTimeout(500);
    };

    await use(reset);
  },
});

// Re-export expect for convenience
export { expect };

// Helper type for page with our extensions
export type TestPage = Page;

// LLM operation timeouts
export const LLM_TIMEOUTS = {
  streamingStart: 20_000, // Wait for streaming to begin
  streamingComplete: 90_000, // Wait for full response
  assessmentReport: 120_000, // Summary generation
  playbookGeneration: 360_000, // Plan generation (6 handbooks, slowest)
  promptScoring: 60_000, // Verification scoring
};
