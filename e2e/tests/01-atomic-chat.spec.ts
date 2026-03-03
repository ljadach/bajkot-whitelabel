/**
 * Atomic tests for Chat step.
 * Each test resets profile first and tests ONE thing.
 * Tests run sequentially (serial) to avoid conflicts.
 */
import { test, expect } from '../fixtures/test.fixture';
import { ChatPage } from '../pages/chat.page';

test.describe.serial('Chat Step - Atomic Tests', () => {
  test.setTimeout(120_000); // 2 min per test

  test('reset profile clears state', async ({ page, resetProfile }) => {
    // Reset should clear profile
    await resetProfile();

    // Navigate to chat (reset already does this, but let's be explicit)
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Should see first question (not a resumed conversation)
    const chatPage = new ChatPage(page);
    await chatPage.waitForQuestion();

    // After reset, history should be empty or have just the first question
    // The current streaming question doesn't count as history
    const messageCount = await chatPage.getMessageCount();
    console.log(`Messages after reset: ${messageCount}`);

    // Should have very few messages (0-2: possibly one question in history if it's persisted)
    // The key is it's NOT 50+ messages from a previous session
    expect(messageCount).toBeLessThanOrEqual(2);
  });

  test('first question loads after reset', async ({ page, resetProfile }) => {
    await resetProfile();

    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Wait for AI to generate first question
    await chatPage.waitForQuestion();

    // Widget should be visible (some type of input)
    await expect(chatPage.widget).toBeVisible();
  });

  test('can submit free-text answer', async ({ page, resetProfile }) => {
    await resetProfile();

    const chatPage = new ChatPage(page);
    await chatPage.goto();
    await chatPage.waitForQuestion();

    // Type and submit an answer
    const testAnswer = 'I am a software developer testing the chat';
    await chatPage.textInput.fill(testAnswer);
    await chatPage.submitButton.click();

    // Wait for next question to load (proves submission worked)
    await chatPage.waitForQuestion();

    // Should have more messages now
    const messageCount = await chatPage.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(2);
  });

  test('chat history persists on page reload', async ({ page, resetProfile }) => {
    await resetProfile();

    const chatPage = new ChatPage(page);
    await chatPage.goto();
    await chatPage.waitForQuestion();

    // Answer first question
    await chatPage.textInput.fill('Testing persistence');
    await chatPage.submitButton.click();
    await chatPage.waitForQuestion();

    // Get message count before reload
    const countBefore = await chatPage.getMessageCount();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for Convex to hydrate and restore chat messages
    // SSR renders without Convex provider — messages only appear after client hydration
    await page.locator('[data-testid="chat-message"]').first().waitFor({ state: 'visible', timeout: 15_000 });

    // Should have same or more messages (history restored)
    const countAfter = await chatPage.getMessageCount();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });
});
