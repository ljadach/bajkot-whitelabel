import { Page, expect } from '@playwright/test';
import { LLM_TIMEOUTS } from '../fixtures/test.fixture';

/**
 * Wait for the AI to finish streaming its response.
 * Detects the "thinking" indicator and waits for it to disappear,
 * then waits for the chat widget to become available.
 */
export async function waitForStreamingComplete(page: Page): Promise<void> {
  // Wait for streaming indicator to appear (AI is thinking)
  const thinkingIndicator = page.locator('[data-testid="ai-thinking"]');

  // It might already be gone if response was fast
  const isThinking = await thinkingIndicator.isVisible().catch(() => false);

  if (isThinking) {
    // Wait for thinking to disappear (streaming complete)
    await expect(thinkingIndicator).not.toBeVisible({
      timeout: LLM_TIMEOUTS.streamingComplete,
    });
  }

  // Wait a bit for DOM to settle
  await page.waitForTimeout(500);

  // Wait for chat widget to be ready for input
  await expect(page.locator('[data-testid="chat-widget"]')).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Wait for any streaming/loading content to stabilize.
 * Useful for waiting for LLM-generated content to finish rendering.
 */
export async function waitForContentStable(
  page: Page,
  selector: string,
  options: { timeout?: number; stableChecks?: number } = {}
): Promise<string> {
  const { timeout = LLM_TIMEOUTS.streamingComplete, stableChecks = 3 } = options;

  let lastContent = '';
  let stableCount = 0;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = page.locator(selector);
    const currentContent = (await element.textContent()) ?? '';

    if (currentContent === lastContent && currentContent.length > 0) {
      stableCount++;
      if (stableCount >= stableChecks) {
        return currentContent;
      }
    } else {
      stableCount = 0;
      lastContent = currentContent;
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Content at "${selector}" did not stabilize within ${timeout}ms`);
}

/**
 * Wait for the continue bar to appear (step complete).
 */
export async function waitForContinueBar(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="continue-bar"]')).toBeVisible({
    timeout: LLM_TIMEOUTS.streamingComplete,
  });
}

/**
 * Wait for assessment report to be generated and displayed.
 */
export async function waitForAssessment(page: Page): Promise<void> {
  // Wait for the prose container with assessment content
  await expect(page.locator('.prose').first()).toBeVisible({
    timeout: LLM_TIMEOUTS.assessmentReport,
  });

  // Wait for content to stabilize
  await waitForContentStable(page, '.prose', {
    timeout: LLM_TIMEOUTS.assessmentReport,
  });
}

/**
 * Wait for plan outline cards to be generated.
 */
export async function waitForPlanOutline(page: Page, expectedModules: number = 5): Promise<void> {
  // Wait for first card to appear
  await expect(page.locator('[data-testid="outline-card"]').first()).toBeVisible({
    timeout: LLM_TIMEOUTS.playbookGeneration,
  });

  // Wait for all modules
  await expect(page.locator('[data-testid="outline-card"]')).toHaveCount(expectedModules, {
    timeout: 30_000,
  });
}
