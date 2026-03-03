import { Page, Locator, expect } from '@playwright/test';
import { waitForAssessment } from '../helpers/streaming';
import { LLM_TIMEOUTS } from '../fixtures/test.fixture';
import { assertAuthenticated } from '../helpers/auth';

export class SummaryPage {
  readonly page: Page;
  readonly assessmentReport: Locator;
  readonly assessmentContent: Locator;
  readonly skillGauge: Locator;
  readonly roleDisplay: Locator;
  readonly toolsDisplay: Locator;
  readonly continueBar: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use exact data-testid selectors
    this.assessmentReport = page.locator('[data-testid="assessment-report"]');
    this.assessmentContent = page.locator('[data-testid="assessment-report"]');
    this.skillGauge = page.locator('[data-testid="skill-gauge"]');
    this.roleDisplay = page.locator('[data-testid="role-display"]');
    this.toolsDisplay = page.locator('[data-testid="tools-display"]');
    this.continueBar = page.locator('[data-testid="continue-bar"]');
    this.loadingIndicator = page.locator('[data-testid="assessment-loading"]');
  }

  async goto() {
    await this.page.goto('/summary');
    await this.page.waitForLoadState('networkidle');
    await assertAuthenticated(this.page);
  }

  /**
   * Wait for assessment report to be generated.
   */
  async waitForAssessment(): Promise<void> {
    // Check if loading
    const isLoading = await this.loadingIndicator.isVisible().catch(() => false);

    if (isLoading) {
      await expect(this.loadingIndicator).not.toBeVisible({
        timeout: LLM_TIMEOUTS.assessmentReport,
      });
    }

    // Wait for report content
    await expect(this.assessmentReport).toBeVisible({
      timeout: LLM_TIMEOUTS.assessmentReport,
    });

    // Ensure content has loaded (not empty)
    await expect(this.assessmentReport).not.toBeEmpty({
      timeout: 10_000,
    });
  }

  /**
   * Get the assessment report text.
   */
  async getReportText(): Promise<string> {
    return (await this.assessmentReport.textContent()) ?? '';
  }

  /**
   * Check if summary is complete.
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
