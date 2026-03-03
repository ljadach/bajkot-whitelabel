import { Page, Locator, expect } from '@playwright/test';
import { LLM_TIMEOUTS } from '../fixtures/test.fixture';
import { SAMPLE_PROMPTS } from '../helpers/test-data';
import { assertAuthenticated } from '../helpers/auth';

export class VerificationPage {
  readonly page: Page;
  readonly promptInput: Locator;
  readonly submitButton: Locator;
  readonly scoreDisplay: Locator;
  readonly levelDisplay: Locator;
  readonly feedbackDisplay: Locator;
  readonly continueBar: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use exact data-testid selectors
    this.promptInput = page.locator('[data-testid="prompt-input"]');
    this.submitButton = page.locator('[data-testid="submit-prompt"]');
    this.scoreDisplay = page.locator('[data-testid="score-display"]');
    this.levelDisplay = page.locator('[data-testid="level-display"]');
    this.feedbackDisplay = page.locator('[data-testid="feedback-display"]');
    this.continueBar = page.locator('[data-testid="continue-bar"]');
    // Loading indicator - check for disabled button text
    this.loadingIndicator = page.locator('button:has-text("Analyzing")');
  }

  async goto() {
    await this.page.goto('/verification');
    await this.page.waitForLoadState('networkidle');
    await assertAuthenticated(this.page);
  }

  /**
   * Submit a prompt for scoring.
   */
  async submitPrompt(prompt: string): Promise<void> {
    // Fill in the prompt
    await this.promptInput.fill(prompt);

    // Click submit
    await this.submitButton.click();
  }

  /**
   * Wait for scoring to complete.
   */
  async waitForScoring(): Promise<void> {
    // Wait for loading to start (if visible)
    const isLoading = await this.loadingIndicator.isVisible().catch(() => false);

    if (isLoading) {
      // Wait for loading to disappear
      await expect(this.loadingIndicator).not.toBeVisible({
        timeout: LLM_TIMEOUTS.promptScoring,
      });
    }

    // Wait for score to be displayed
    await expect(this.scoreDisplay).toBeVisible({
      timeout: LLM_TIMEOUTS.promptScoring,
    });
  }

  /**
   * Submit prompt and wait for auto-navigation to summary.
   * Used in linear flow where verification results are skipped.
   */
  async submitAndNavigate(prompt: string = SAMPLE_PROMPTS.advanced): Promise<void> {
    await this.submitPrompt(prompt);
    // Wait for navigation to summary (auto-redirect after scoring)
    await this.page.waitForURL(/\/summary/, { timeout: LLM_TIMEOUTS.promptScoring });
  }

  /**
   * Submit prompt and wait for results to display.
   * Used when accessing /verification directly (results shown on page).
   * @deprecated Use submitAndNavigate for linear flow
   */
  async submitAndWait(prompt: string = SAMPLE_PROMPTS.advanced): Promise<void> {
    await this.submitPrompt(prompt);
    await this.waitForScoring();
  }

  /**
   * Get the displayed score level.
   */
  async getLevel(): Promise<string> {
    return (await this.levelDisplay.textContent()) ?? '';
  }

  /**
   * Check if verification is complete.
   */
  async isComplete(): Promise<boolean> {
    return await this.continueBar.isVisible();
  }

  /**
   * Click continue to proceed to next step.
   */
  async clickContinue(): Promise<void> {
    await expect(this.continueBar).toBeVisible();
    await this.continueBar.locator('a, button').click();
  }
}
