import { Page, Locator, expect } from '@playwright/test';
import { waitForContentStable } from '../helpers/streaming';
import { LLM_TIMEOUTS } from '../fixtures/test.fixture';
import { assertAuthenticated } from '../helpers/auth';

export class PlanPage {
  readonly page: Page;
  readonly planContainer: Locator;
  readonly outlineCards: Locator;
  readonly moduleTitle: Locator;
  readonly progressBar: Locator;
  readonly continueBar: Locator;
  readonly loadingIndicator: Locator;
  readonly readerView: Locator;
  readonly backButton: Locator;
  readonly handbookContent: Locator;
  readonly readerModuleTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.planContainer = page.locator('[data-testid="plan-container"]');
    this.outlineCards = page.locator('[data-testid="outline-card"]');
    this.moduleTitle = page.locator('[data-testid="module-title"]');
    this.progressBar = page.locator('[data-testid="generation-progress"]');
    this.continueBar = page.locator('[data-testid="continue-bar"]');
    this.loadingIndicator = page.locator('[data-testid="plan-loading"]');
    this.readerView = page.locator('[data-testid="reader-view"]');
    this.backButton = page.locator('[data-testid="back-to-plan"]');
    this.handbookContent = page.locator('[data-testid="handbook-content"]');
    this.readerModuleTitle = page.locator('[data-testid="reader-module-title"]');
  }

  async goto() {
    await this.page.goto('/plan');
    await this.page.waitForLoadState('networkidle');
    await assertAuthenticated(this.page);
  }

  /**
   * Wait for plan outline to be generated.
   * @param minModules Minimum number of modules expected (default: 1)
   */
  async waitForOutline(minModules: number = 1): Promise<void> {
    // Wait for loading to finish (if visible)
    try {
      const isLoading = await this.loadingIndicator.isVisible();
      if (isLoading) {
        await expect(this.loadingIndicator).not.toBeVisible({
          timeout: LLM_TIMEOUTS.playbookGeneration,
        });
      }
    } catch {
      // Loading indicator might not exist
    }

    // Wait for at least one outline card OR plan container with content
    await expect(this.planContainer).toBeVisible({
      timeout: LLM_TIMEOUTS.playbookGeneration,
    });

    // Try to wait for module cards if they exist
    try {
      await expect(this.outlineCards.first()).toBeVisible({
        timeout: 30_000,
      });
    } catch {
      // Some plans might not have cards, just content
      console.log('[PlanPage] No outline cards found, checking for content');
    }
  }

  /**
   * Get the number of module cards.
   */
  async getModuleCount(): Promise<number> {
    return await this.outlineCards.count();
  }

  /**
   * Click on a specific module card to open reader.
   */
  async openModule(index: number): Promise<void> {
    const card = this.outlineCards.nth(index);
    // Wait for module to finish generating (card becomes clickable when status is 'completed')
    await expect(card.getByText('Ready')).toBeVisible({
      timeout: LLM_TIMEOUTS.playbookGeneration,
    });
    await card.click();
    await expect(this.readerView).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Go back to plan view from reader.
   */
  async backToPlan(): Promise<void> {
    await this.backButton.click();
    await expect(this.outlineCards.first()).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Get module titles.
   */
  async getModuleTitles(): Promise<string[]> {
    const titles: string[] = [];
    const count = await this.outlineCards.count();

    for (let i = 0; i < count; i++) {
      const title = await this.outlineCards.nth(i).locator('[data-testid="module-title"]').textContent();
      if (title) titles.push(title);
    }

    return titles;
  }

  /**
   * Check if plan is complete.
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

  /**
   * Wait for handbook content to load and stabilize in reader view.
   */
  async waitForHandbook(): Promise<void> {
    await expect(this.handbookContent).toBeVisible({
      timeout: LLM_TIMEOUTS.playbookGeneration,
    });
    await waitForContentStable(this.page, '[data-testid="handbook-content"]', {
      timeout: LLM_TIMEOUTS.playbookGeneration,
    });
  }

  /**
   * Get the text content of the handbook in reader view.
   */
  async getHandbookText(): Promise<string> {
    return (await this.handbookContent.textContent()) ?? '';
  }

  /**
   * Get the title of the currently open module in reader view.
   */
  async getReaderModuleTitle(): Promise<string> {
    return (await this.readerModuleTitle.textContent()) ?? '';
  }
}
