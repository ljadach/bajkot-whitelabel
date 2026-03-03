import { Page, Locator, expect } from '@playwright/test';
import { waitForStreamingComplete, waitForContinueBar } from '../helpers/streaming';
import { DEFAULT_CHAT_ANSWERS } from '../helpers/test-data';
import { LLM_TIMEOUTS } from '../fixtures/test.fixture';
import { assertAuthenticated } from '../helpers/auth';

export class ChatPage {
  readonly page: Page;
  readonly messagesContainer: Locator;
  readonly widget: Locator;
  readonly textInput: Locator;
  readonly submitButton: Locator;
  readonly continueBar: Locator;
  readonly thinkingIndicator: Locator;

  // Debug panel elements
  readonly debugPanel: Locator;
  readonly autoFillSection: Locator;
  readonly autoFillExpandButton: Locator;
  readonly autoFillActivateButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.messagesContainer = page.locator('[data-testid="chat-messages"]');
    this.widget = page.locator('[data-testid="chat-widget"]');
    this.textInput = page.locator('[data-testid="chat-input"]');
    this.submitButton = page.locator('[data-testid="chat-submit"]');
    this.continueBar = page.locator('[data-testid="continue-bar"]');
    this.thinkingIndicator = page.locator('[data-testid="ai-thinking"]');

    // Debug panel
    this.debugPanel = page.locator('[data-testid="debug-panel"]');
    this.autoFillSection = page.locator('text="Auto-Fill Chat"').first();
    this.autoFillExpandButton = page.locator('button:has-text("Auto-Fill Chat")');
    this.autoFillActivateButton = page.locator('button:has-text("Activate")');
  }

  async goto() {
    await this.page.goto('/chat');
    await this.page.waitForLoadState('networkidle');
    await assertAuthenticated(this.page);
  }

  async waitForQuestion() {
    await waitForStreamingComplete(this.page);
  }

  /**
   * Get the current widget type from data attribute.
   */
  async getWidgetType(): Promise<string> {
    const type = await this.widget.getAttribute('data-widget-type');
    return type ?? 'free-text';
  }

  /**
   * Get the last AI message text to understand what's being asked.
   */
  async getLastAiQuestion(): Promise<string> {
    const aiMessages = this.page.locator('[data-testid="chat-message"][data-role="assistant"]');
    const count = await aiMessages.count();
    if (count === 0) return '';
    return (await aiMessages.nth(count - 1).textContent()) ?? '';
  }

  /**
   * Choose appropriate free-text answer based on question context.
   */
  async chooseFreeTextAnswer(): Promise<string> {
    const question = (await this.getLastAiQuestion()).toLowerCase();

    // Time/hours related
    if (question.includes('hour') || question.includes('time') || question.includes('week') || question.includes('czas') || question.includes('godzin')) {
      return DEFAULT_CHAT_ANSWERS.timeCommitment;
    }

    // Role/job related
    if (question.includes('role') || question.includes('job') || question.includes('position') || question.includes('praca') || question.includes('stanowisk')) {
      return DEFAULT_CHAT_ANSWERS.role;
    }

    // Goals/objectives related
    if (question.includes('goal') || question.includes('objective') || question.includes('achieve') || question.includes('learn') || question.includes('cel') || question.includes('chcesz')) {
      return DEFAULT_CHAT_ANSWERS.goals;
    }

    // Experience related
    if (question.includes('experience') || question.includes('years') || question.includes('doświadcz') || question.includes('lat')) {
      return DEFAULT_CHAT_ANSWERS.experience;
    }

    // Tools related
    if (question.includes('tool') || question.includes('use') || question.includes('narzędzi') || question.includes('używasz')) {
      return DEFAULT_CHAT_ANSWERS.tools.join(', ');
    }

    // Default fallback
    return DEFAULT_CHAT_ANSWERS.freeText;
  }

  /**
   * Answer the current question based on widget type.
   */
  async answerQuestion(answer?: string | string[] | number): Promise<void> {
    const widgetType = await this.getWidgetType();

    switch (widgetType) {
      case 'multi-select':
        // Click first available option if no specific answer
        if (!answer) {
          await this.widget.locator('button[data-option]').first().click();
        } else if (Array.isArray(answer)) {
          for (const opt of answer) {
            await this.widget.locator(`button[data-option]:has-text("${opt}")`).click();
          }
        } else {
          await this.widget.locator(`button[data-option]:has-text("${answer}")`).click();
        }
        // Multi-select has separate submit
        await this.submitButton.click();
        break;

      case 'single-select':
        // Single select auto-submits on click
        if (!answer) {
          await this.widget.locator('button[data-option]').first().click();
        } else {
          await this.widget.locator(`button[data-option]:has-text("${answer}")`).click();
        }
        break;

      case 'likert':
        const value = typeof answer === 'number' ? answer : DEFAULT_CHAT_ANSWERS.likertDefault;
        await this.widget.locator(`button[data-value="${value}"]`).click();
        break;

      default:
        // Free text input - choose answer based on question context
        const text = typeof answer === 'string' ? answer : await this.chooseFreeTextAnswer();
        console.log(`Free text answer: "${text.substring(0, 50)}..."`);
        await this.textInput.fill(text);
        await this.submitButton.click();
    }
  }

  /**
   * Check if intake is complete (continue bar visible).
   */
  async isIntakeComplete(): Promise<boolean> {
    return await this.continueBar.isVisible();
  }

  /**
   * Open debug panel if not already open.
   * Requires test user to have isAdmin = true in Clerk publicMetadata.
   */
  async openDebugPanel(): Promise<void> {
    // Check if Auto-Fill section is already visible (panel is open)
    const autoFillSection = this.page.locator('text="Auto-Fill Chat"').first();
    if (await autoFillSection.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('[ChatPage] Debug panel already open');
      return;
    }

    // Click the debug toggle button (bottom-right corner)
    const debugToggle = this.page.locator('button:has-text("Debug")');
    if (await debugToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await debugToggle.click();
      await this.page.waitForTimeout(500);
      console.log('[ChatPage] Debug panel opened');
    } else {
      throw new Error(
        'Debug panel toggle not found. Make sure test user has isAdmin=true in Clerk publicMetadata.'
      );
    }
  }

  /**
   * Complete the entire intake using Auto-Fill (self-play) feature.
   * This is more reliable than manual answering because:
   * - LLM generates persona-appropriate responses
   * - Auto-submit handles timing
   * - No widget detection issues
   *
   * REQUIRES: Test user must have isAdmin=true in Clerk publicMetadata.
   */
  async completeIntakeWithDefaults(timeoutMs: number = 180_000): Promise<void> {
    console.log('[ChatPage] Starting intake with Auto-Fill self-play');

    // Wait for first question to load
    await this.waitForQuestion();

    // Check if already complete (re-entry case)
    if (await this.isIntakeComplete()) {
      console.log('[ChatPage] Intake already complete');
      return;
    }

    // 0. Open debug panel if not visible
    await this.openDebugPanel();

    // 1. Expand Auto-Fill section in debug panel
    const autoFillHeader = this.page.locator('button:has-text("Auto-Fill Chat")');
    await autoFillHeader.click();
    await this.page.waitForTimeout(300);

    // 2. Click Activate button
    const activateButton = this.page.locator('button:has-text("Activate")');
    await expect(activateButton).toBeVisible({ timeout: 5000 });
    await activateButton.click();
    console.log('[ChatPage] Auto-Fill activated');

    // 3. Wait for intake to complete (ContinueBar visible)
    // The auto-fill will answer questions automatically
    try {
      await expect(this.continueBar).toBeVisible({ timeout: timeoutMs });
      console.log('[ChatPage] Intake complete - ContinueBar visible');
    } finally {
      // 4. Always deactivate Auto-Fill (cleanup)
      const deactivateButton = this.page.locator('button:has-text("Deactivate")');
      if (await deactivateButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deactivateButton.click();
        console.log('[ChatPage] Auto-Fill deactivated');
      }
    }
  }

  /**
   * Complete intake with manual answers (fallback, less reliable).
   * @deprecated Use completeIntakeWithDefaults() which uses Auto-Fill
   */
  async completeIntakeManually(maxQuestions: number = 10): Promise<void> {
    // Wait for first question
    await this.waitForQuestion();

    for (let i = 0; i < maxQuestions; i++) {
      // Check if we're done
      if (await this.isIntakeComplete()) {
        console.log(`Intake complete after ${i} questions`);
        return;
      }

      // Answer current question with defaults
      await this.answerQuestion();

      // Wait briefly for response
      await this.page.waitForTimeout(1000);

      // If not complete, wait for next question
      if (!(await this.isIntakeComplete())) {
        await this.waitForQuestion();
      }
    }

    // Final check
    if (!(await this.isIntakeComplete())) {
      throw new Error(`Intake not complete after ${maxQuestions} questions`);
    }
  }

  /**
   * Click the continue button to proceed to next step.
   */
  async clickContinue(): Promise<void> {
    await expect(this.continueBar).toBeVisible();
    await this.continueBar.locator('a, button').click();
  }

  /**
   * Get the number of messages in chat.
   */
  async getMessageCount(): Promise<number> {
    return await this.page.locator('[data-testid="chat-message"]').count();
  }

  /**
   * Click edit on a specific message.
   */
  async editMessage(messageIndex: number): Promise<void> {
    const messages = this.page.locator('[data-testid="chat-message"]');
    const message = messages.nth(messageIndex);
    await message.locator('[data-testid="edit-message"]').click();
  }
}
