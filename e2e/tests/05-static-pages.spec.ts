/**
 * E2E tests for public static pages.
 * These pages are SSR-rendered, no auth required.
 * Verifies that pages load, render key content, and have proper SEO elements.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test.describe('Static Pages - Home', () => {
  test('home page renders hero and key sections', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('networkidle');

    // Hero section
    await expect(page.locator('.hero-headline')).toBeVisible();
    await expect(page.locator('.btn-cta').first()).toBeVisible();

    // Learning experience section
    await expect(page.locator('text=1')).toBeVisible();
    await expect(page.locator('text=2')).toBeVisible();

    // Features section
    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(4);

    // FAQ section
    const faqCards = page.locator('.faq-card');
    expect(await faqCards.count()).toBeGreaterThan(0);
  });

  test('home page has correct meta tags', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('networkidle');

    // Title should contain AITutoro
    const title = await page.title();
    expect(title).toContain('AITutoro');

    // html lang attribute should be "en"
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });

  test('home FAQ items expand on click', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    await page.waitForLoadState('networkidle');

    const firstFaq = page.locator('.faq-card').first();
    const faqButton = firstFaq.locator('button');
    await faqButton.click();

    // Answer should be visible after click
    const answer = firstFaq.locator('p.text-neutral-500');
    await expect(answer).toBeVisible();
  });
});

test.describe('Static Pages - Pricing', () => {
  test('pricing page renders three tier cards', async ({ page }) => {
    await page.goto(`${BASE}/en/pricing`);
    await page.waitForLoadState('networkidle');

    const pricingCards = page.locator('.pricing-card');
    await expect(pricingCards).toHaveCount(3);

    // Highlighted card (Business)
    await expect(page.locator('.pricing-card-highlighted')).toBeVisible();
  });

  test('billing toggle switches between monthly and annual', async ({ page }) => {
    await page.goto(`${BASE}/en/pricing`);
    await page.waitForLoadState('networkidle');

    // Default is monthly — $9 should be visible
    await expect(page.locator('text=$9')).toBeVisible();

    // Click annual toggle
    const toggle = page.locator('button[role="switch"]');
    await toggle.click();

    // Annual price should differ (billed yearly text appears — "Billed $XX yearly")
    await expect(page.locator('text=/Billed \\$\\d+ yearly/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('pricing page has enterprise plus section', async ({ page }) => {
    await page.goto(`${BASE}/en/pricing`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.pricing-enterprise-footer')).toBeVisible();
  });
});

test.describe('Static Pages - Tools Hub', () => {
  test('tools hub lists AI tools', async ({ page }) => {
    await page.goto(`${BASE}/en/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Should have multiple tool cards/links
    // Check for known tool names
    await expect(page.locator('text=ChatGPT').first()).toBeVisible();
    await expect(page.locator('text=Claude').first()).toBeVisible();
    await expect(page.locator('text=Gemini').first()).toBeVisible();
  });
});

test.describe('Static Pages - Product Pages', () => {
  const products = ['chatgpt', 'claude', 'gemini', 'copilot', 'midjourney', 'dalle', 'grok', 'notebooklm', 'perplexity'];

  for (const slug of products) {
    test(`product page for ${slug} loads`, async ({ page }) => {
      await page.goto(`${BASE}/en/ai-tools/${slug}`);
      await page.waitForLoadState('networkidle');

      // Should have an h1 heading
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      // Should not show error boundary
      await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    });
  }
});

test.describe('Static Pages - Comparison Pages', () => {
  test('comparison hub lists comparisons', async ({ page }) => {
    await page.goto(`${BASE}/en/ai-tools/compare`);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Should list comparison links
    await expect(page.locator('text=ChatGPT').first()).toBeVisible();
  });

  test('comparison page renders for chatgpt-vs-claude', async ({ page }) => {
    await page.goto(`${BASE}/en/ai-tools/compare/chatgpt-vs-claude`);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});

test.describe('Static Pages - Glossary', () => {
  test('glossary page renders terms', async ({ page }) => {
    await page.goto(`${BASE}/en/ai-tools/glossary`);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Should have glossary terms (there will be multiple headings or items)
    const body = await page.locator('body').textContent();
    expect(body!.length).toBeGreaterThan(200);
  });
});

test.describe('Static Pages - FAQ', () => {
  test('FAQ page renders questions', async ({ page }) => {
    await page.goto(`${BASE}/en/support/faq`);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Should have clickable FAQ items
    const faqItems = page.locator('.faq-card, details, [role="button"]');
    expect(await faqItems.count()).toBeGreaterThan(0);
  });
});

test.describe('Static Pages - Contact', () => {
  test('contact page renders form or contact info', async ({ page }) => {
    await page.goto(`${BASE}/en/about/contact`);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});

test.describe('Static Pages - Segment Pages', () => {
  const segments = [
    { slug: 'ai-for-business', name: 'Business' },
    { slug: 'ai-for-education', name: 'Education' },
    { slug: 'ai-for-executives', name: 'Executives' },
    { slug: 'ai-for-individuals', name: 'Individuals' },
  ];

  for (const seg of segments) {
    test(`segment page for ${seg.name} loads`, async ({ page }) => {
      await page.goto(`${BASE}/en/${seg.slug}`);
      await page.waitForLoadState('networkidle');

      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      await expect(page.locator('text=Something went wrong')).not.toBeVisible();

      // Value props should render (3 per segment)
      const body = await page.locator('body').textContent();
      expect(body!.length).toBeGreaterThan(200);
    });
  }
});
