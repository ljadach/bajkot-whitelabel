import { Page, Locator, expect } from '@playwright/test';

export class BookOrderPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly childNameInput: Locator;
  readonly ageBracketSelect: Locator;
  readonly genderSelect: Locator;
  readonly problemCategorySelect: Locator;
  readonly problemSelect: Locator;
  readonly problemDetailTextarea: Locator;
  readonly hairColorSelect: Locator;
  readonly hairStyleSelect: Locator;
  readonly eyeColorSelect: Locator;
  readonly skinToneSelect: Locator;
  readonly outfitSelect: Locator;
  readonly glassesToggle: Locator;
  readonly favoriteToyInput: Locator;
  readonly emailInput: Locator;
  readonly disclaimerCheckbox: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.childNameInput = page.locator('input[type="text"]').first();
    this.ageBracketSelect = page.locator('select').first();
    this.genderSelect = page.locator('select').nth(1);
    this.problemCategorySelect = page.locator('select').first();
    this.problemSelect = page.locator('select').nth(1);
    this.problemDetailTextarea = page.locator('textarea');
    this.hairColorSelect = page.locator('select').first();
    this.hairStyleSelect = page.locator('select').nth(1);
    this.eyeColorSelect = page.locator('select').nth(2);
    this.skinToneSelect = page.locator('select').nth(3);
    this.outfitSelect = page.locator('select').nth(4);
    this.glassesToggle = page.locator('button[role="switch"]');
    this.favoriteToyInput = page.locator('input[type="text"]');
    this.emailInput = page.locator('input[type="email"]');
    this.disclaimerCheckbox = page.locator('input[type="checkbox"]');
    this.nextButton = page.getByRole('button', { name: /dalej|next/i });
    this.backButton = page.getByRole('button', { name: /wróć|wstecz|back/i });
    this.submitButton = page.getByRole('button', { name: /generuj bajkę|zamawiam|submit|wyślij/i });
    this.errorMessage = page.locator('.bg-red-50');
  }

  async goto() {
    await this.page.goto('/book/order');
    await this.page.waitForLoadState('networkidle');
  }

  async fillChildStep(name: string, ageBracket?: string, gender?: string) {
    await this.childNameInput.fill(name);
    if (ageBracket) {
      await this.ageBracketSelect.selectOption(ageBracket);
    }
    if (gender) {
      await this.genderSelect.selectOption(gender);
    }
  }

  async fillProblemStep(category: string, problemId: string) {
    await this.problemCategorySelect.selectOption(category);
    await this.page.waitForTimeout(300);
    await this.problemSelect.selectOption(problemId);
  }

  async goNext() {
    await this.nextButton.click();
  }

  async goBack() {
    await this.backButton.click();
  }

  async getCurrentStepIndex(): Promise<number> {
    // The progress strip uses span elements per step. The active step has
    // the magic-600 color class; past steps use calm-700; future steps gray-400.
    const labels = this.page.locator('div.bg-calm-50 span').filter({ hasText: /^\d+\./ });
    const total = await labels.count();
    for (let i = 0; i < total; i++) {
      const classes = await labels.nth(i).getAttribute('class');
      if (classes?.includes('text-magic-600')) return i;
    }
    return -1;
  }
}
