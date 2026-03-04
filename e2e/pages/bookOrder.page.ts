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
    this.backButton = page.getByRole('button', { name: /wstecz|back/i });
    this.submitButton = page.getByRole('button', { name: /zamawiam|submit|wyślij/i });
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
    const steps = this.page.locator('.bg-accent.text-white');
    const count = await steps.count();
    if (count === 0) return -1;
    // Find which step indicator has bg-accent (current step)
    const allSteps = this.page.locator('.flex.gap-2 > div');
    const totalSteps = await allSteps.count();
    for (let i = 0; i < totalSteps; i++) {
      const classes = await allSteps.nth(i).getAttribute('class');
      if (classes?.includes('bg-accent')) return i;
    }
    return -1;
  }
}
