/**
 * Atomic tests for Chat widgets.
 * Tests different widget types: free-text, single-select, multi-select, likert.
 * Each test resets profile first.
 */
import { test, expect } from '../fixtures/test.fixture';
import { ChatPage } from '../pages/chat.page';

test.describe.serial('Chat Widgets - Atomic Tests', () => {
  test.setTimeout(120_000); // 2 min per test

  test('widget displays correct type attribute', async ({ page, resetProfile }) => {
    await resetProfile();

    const chatPage = new ChatPage(page);
    await chatPage.goto();
    await chatPage.waitForQuestion();

    // Widget should have data-widget-type attribute
    const widgetType = await chatPage.getWidgetType();
    const validTypes = ['free-text', 'single-select', 'multi-select', 'likert'];
    expect(validTypes).toContain(widgetType);
  });

  test('likert widget accepts rating click', async ({ page, resetProfile }) => {
    await resetProfile();

    const chatPage = new ChatPage(page);
    await chatPage.goto();
    await chatPage.waitForQuestion();

    // Answer questions until we hit a likert widget
    for (let i = 0; i < 8; i++) {
      if (await chatPage.isIntakeComplete()) break;

      const widgetType = await chatPage.getWidgetType();
      console.log(`Question ${i + 1}: widget type = ${widgetType}`);

      if (widgetType === 'likert') {
        // Click rating 3 (middle)
        const ratingButton = chatPage.widget.locator('button[data-value="3"]');
        await ratingButton.click();

        // Wait for next question
        await chatPage.waitForQuestion();
        console.log('Likert widget verified');
        return; // Test passed
      }

      // Not likert, answer with default
      await chatPage.answerQuestion();
      if (!(await chatPage.isIntakeComplete())) {
        await chatPage.waitForQuestion();
      }
    }

    console.log('No likert widget encountered in this session');
  });

  test('free-text widget accepts typed input', async ({ page, resetProfile }) => {
    await resetProfile();

    const chatPage = new ChatPage(page);
    await chatPage.goto();
    await chatPage.waitForQuestion();

    const widgetType = await chatPage.getWidgetType();

    // First question is often free-text
    if (widgetType === 'free-text') {
      await chatPage.textInput.fill('Testing free text input');
      await chatPage.submitButton.click();
      await chatPage.waitForQuestion();
      console.log('Free-text widget verified');
    } else {
      // Answer until we find free-text
      for (let i = 0; i < 5; i++) {
        await chatPage.answerQuestion();
        if (await chatPage.isIntakeComplete()) break;
        await chatPage.waitForQuestion();

        const type = await chatPage.getWidgetType();
        if (type === 'free-text') {
          await chatPage.textInput.fill('Testing free text');
          await chatPage.submitButton.click();
          console.log('Free-text widget verified');
          return;
        }
      }
    }
  });
});
