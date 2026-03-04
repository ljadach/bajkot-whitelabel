import { test, expect } from '../fixtures/test.fixture';
import { BookOrderPage } from '../pages/bookOrder.page';

test.describe('Book Order Form', () => {
  test('renders form and navigates through steps', async ({ page }) => {
    const bookOrder = new BookOrderPage(page);
    await bookOrder.goto();

    // Step 1: Child info — heading visible
    await expect(bookOrder.heading).toBeVisible();
    await expect(bookOrder.childNameInput).toBeVisible();
    await expect(bookOrder.nextButton).toBeVisible();

    // Fill child name and go next
    await bookOrder.fillChildStep('Zosia', '3-5', 'girl');
    await bookOrder.goNext();

    // Step 2: Problem — select should be visible
    await expect(bookOrder.problemCategorySelect).toBeVisible();

    // Fill problem
    await bookOrder.fillProblemStep('fears', 'fear_of_dark');
    await bookOrder.goNext();

    // Step 3: Appearance
    await expect(bookOrder.hairColorSelect).toBeVisible();
    await bookOrder.goNext();

    // Step 4: Guide
    await expect(bookOrder.favoriteToyInput).toBeVisible();
    await bookOrder.goNext();

    // Step 5: Summary — child name visible in summary
    const summaryText = await page.textContent('body');
    expect(summaryText).toContain('Zosia');
  });

  test('validates short child name', async ({ page }) => {
    const bookOrder = new BookOrderPage(page);
    await bookOrder.goto();

    // Try to go next with single-char name
    await bookOrder.fillChildStep('A');
    await bookOrder.goNext();

    // Should show error, not advance
    await expect(bookOrder.errorMessage).toBeVisible();
  });

  test('can go back between steps', async ({ page }) => {
    const bookOrder = new BookOrderPage(page);
    await bookOrder.goto();

    await bookOrder.fillChildStep('Kuba');
    await bookOrder.goNext();

    // On step 2 — back button visible
    await expect(bookOrder.backButton).toBeVisible();
    await bookOrder.goBack();

    // Back on step 1 — child name still filled
    await expect(bookOrder.childNameInput).toHaveValue('Kuba');
  });
});
