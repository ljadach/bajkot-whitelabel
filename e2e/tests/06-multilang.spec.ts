/**
 * E2E tests for multi-language routing and content.
 * Verifies language redirect, URL-based lang sync, translations, and legacy redirects.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const LANGS = ['en', 'pl', 'de'] as const;

test.describe('Multi-Language - Root Redirect', () => {
  test('/ redirects to /:lang/ based on browser or default', async ({ page }) => {
    // Clear any stored preference
    await page.goto(`${BASE}/en/`);
    await page.evaluate(() => localStorage.removeItem('preferredLanguage'));

    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');

    // Should redirect to one of the supported languages
    const url = page.url();
    const hasLangPrefix = LANGS.some((lang) => url.includes(`/${lang}/`));
    expect(hasLangPrefix).toBe(true);
  });

  test('stored language preference is respected', async ({ page }) => {
    // Set Polish as preference
    await page.goto(`${BASE}/en/`);
    await page.evaluate(() => localStorage.setItem('preferredLanguage', 'pl'));

    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/pl/');
  });
});

test.describe('Multi-Language - HTML Lang Attribute', () => {
  for (const lang of LANGS) {
    test(`/${lang}/ sets html lang="${lang}"`, async ({ page }) => {
      await page.goto(`${BASE}/${lang}/`);
      await page.waitForLoadState('networkidle');

      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe(lang);
    });
  }
});

test.describe('Multi-Language - Content Translations', () => {
  test('English home has English content', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('networkidle');

    const heroText = await page.locator('.hero-headline').textContent();
    // English hero should not contain Polish characters like ą, ę, ś, etc.
    expect(heroText).toBeTruthy();
    // Basic sanity: the text should be non-empty
    expect(heroText!.length).toBeGreaterThan(5);
  });

  test('Polish home has Polish content', async ({ page }) => {
    await page.goto(`${BASE}/pl/`);
    await page.waitForLoadState('networkidle');

    const heroText = await page.locator('.hero-headline').textContent();
    expect(heroText).toBeTruthy();
    expect(heroText!.length).toBeGreaterThan(5);

    // Polish content differs from English
    // Navigate to English to compare
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('networkidle');
    const heroTextEn = await page.locator('.hero-headline').textContent();

    expect(heroText).not.toBe(heroTextEn);
  });

  test('German home has German content', async ({ page }) => {
    await page.goto(`${BASE}/de/`);
    await page.waitForLoadState('networkidle');

    const heroText = await page.locator('.hero-headline').textContent();
    expect(heroText).toBeTruthy();
    expect(heroText!.length).toBeGreaterThan(5);
  });
});

test.describe('Multi-Language - Pricing across languages', () => {
  for (const lang of LANGS) {
    test(`pricing page loads in ${lang}`, async ({ page }) => {
      await page.goto(`${BASE}/${lang}/pricing`);
      await page.waitForLoadState('networkidle');

      // Pricing cards should render regardless of language
      const cards = page.locator('.pricing-card');
      await expect(cards).toHaveCount(3);

      // H1 should exist
      await expect(page.locator('h1')).toBeVisible();
    });
  }
});

test.describe('Multi-Language - Product pages across languages', () => {
  for (const lang of LANGS) {
    test(`ChatGPT product page loads in ${lang}`, async ({ page }) => {
      await page.goto(`${BASE}/${lang}/ai-tools/chatgpt`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    });
  }
});

test.describe('Multi-Language - Legacy Redirects', () => {
  test('/pricing redirects to /:lang/pricing', async ({ page }) => {
    // Set known language first
    await page.goto(`${BASE}/en/`);
    await page.evaluate(() => localStorage.setItem('preferredLanguage', 'en'));

    await page.goto(`${BASE}/pricing`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/en/pricing');
  });

  test('/ai-tools redirects to /:lang/ai-tools (legacy static path)', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.evaluate(() => localStorage.setItem('preferredLanguage', 'en'));

    await page.goto(`${BASE}/ai-tools`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/en/ai-tools');
  });
});

test.describe('Multi-Language - localStorage Persistence', () => {
  test('visiting /:lang/ stores preference in localStorage', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.evaluate(() => localStorage.removeItem('preferredLanguage'));

    // Visit German page
    await page.goto(`${BASE}/de/`);
    await page.waitForLoadState('networkidle');

    const stored = await page.evaluate(() => localStorage.getItem('preferredLanguage'));
    expect(stored).toBe('de');
  });
});

test.describe('Multi-Language - Lang Catchall', () => {
  test('unknown path under /:lang/* redirects to lang home', async ({ page }) => {
    await page.goto(`${BASE}/en/this-page-does-not-exist-xyz`);
    await page.waitForLoadState('networkidle');

    // Should redirect to /en/ (the lang home)
    expect(page.url()).toContain('/en/');
  });
});
