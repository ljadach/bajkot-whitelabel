import { test } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Semi-automated login — run with: npm run e2e:login
 *
 * Auto-fills email + password from .env.test, submits the form,
 * then waits up to 5 minutes for you to enter the verification code
 * from your email.  Saves auth state to e2e/.auth/user.json.
 */
test.describe('Manual Login', () => {
  test.use({ storageState: undefined });

  test('authenticate and save session', async () => {
    test.setTimeout(5 * 60_000);

    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD in .env.test'
      );
    }

    // Temp profile dir — clean slate, no automation fingerprint leaks
    const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-login-'));

    // launchPersistentContext + disable automation flags = Google lets you in
    const context = await chromium.launchPersistentContext(tmpProfile, {
      channel: 'chrome',
      headless: false,
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = context.pages()[0] || (await context.newPage());

    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // If already logged in, just save and exit
    const userButton = page.locator('.cl-userButtonTrigger');
    if (await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Already logged in — saving session');
      await context.storageState({ path: 'e2e/.auth/user.json' });
      await context.close();
      fs.rmSync(tmpProfile, { recursive: true, force: true });
      return;
    }

    // Click "Get Started" if on landing page
    const getStartedButton = page.locator(
      'button.btn-cta, button:has-text("Get Started"), button:has-text("Start"), button:has-text("Rozpocznij"), button:has-text("Starten")'
    );
    if (await getStartedButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStartedButton.first().click();
      await page.waitForTimeout(1000);
    }

    // Click "Sign in" link if visible
    const signInLink = page.locator('text="Sign in"');
    if (await signInLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signInLink.click();
      await page.waitForTimeout(1000);
    }

    // --- Auto-fill email ---
    const emailInput = page
      .locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]')
      .first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    await emailInput.fill(email);
    console.log(`Filled email: ${email}`);

    // Click Continue
    const continueButton = page
      .locator('button.cl-formButtonPrimary, button[data-localization-key="formButtonPrimary"]')
      .first();
    await continueButton.click();
    console.log('Clicked continue');
    await page.waitForTimeout(1000);

    // --- Auto-fill password ---
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await passwordInput.fill(password);
    console.log('Filled password');

    // Click Sign in
    const signInButton = page
      .locator('button.cl-formButtonPrimary, button[data-localization-key="formButtonPrimary"]')
      .first();
    await signInButton.click();
    console.log('Clicked sign in');
    await page.waitForTimeout(2000);

    // Check if we're already in (no verification needed)
    if (await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Logged in — no verification code needed');
    } else {
      // Verification code required
      console.log('');
      console.log('='.repeat(60));
      console.log('  VERIFICATION CODE REQUIRED');
      console.log('  Enter the 6-digit code from your email in the browser.');
      console.log('  You have 5 minutes.');
      console.log('='.repeat(60));
      console.log('');

      await page.waitForSelector('.cl-userButtonTrigger', { timeout: 5 * 60_000 });
    }

    console.log('Authenticated! Saving session...');
    await context.storageState({ path: 'e2e/.auth/user.json' });
    console.log('Auth state saved to e2e/.auth/user.json');

    await context.close();
    fs.rmSync(tmpProfile, { recursive: true, force: true });
  });
});
