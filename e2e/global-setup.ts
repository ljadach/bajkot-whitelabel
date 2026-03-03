import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { setTestLlmConfig } from './helpers/convex-env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test env vars
dotenv.config({ path: path.join(__dirname, '../.env.test') });

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

/**
 * Check if saved auth state has a valid (non-expired) Clerk session.
 *
 * Clerk uses __clerk_db_jwt as the long-lived refresh cookie (NOT a JWT — it's
 * an opaque token like `dvb_...`).  The short-lived __session JWT (60 s) is
 * regenerated from it on every page load, so we can't rely on __session for
 * freshness.  Instead we check the cookie-level `expires` field on __clerk_db_jwt.
 */
function hasFreshSession(): boolean {
  if (!fs.existsSync(AUTH_FILE)) return false;
  try {
    const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const clerkCookie = authData.cookies?.find(
      (c: { name: string }) => c.name === '__clerk_db_jwt' || c.name.startsWith('__clerk_db_jwt')
    );
    if (!clerkCookie) return false;

    // Cookie `expires` is a unix timestamp (seconds).  -1 means session cookie.
    const expires: number = clerkCookie.expires ?? -1;
    if (expires === -1) return false;

    // Valid if cookie expires more than 60 seconds from now
    return expires > Date.now() / 1000 + 60;
  } catch {
    return false;
  }
}

async function globalSetup(config: FullConfig) {
  // Switch Convex to test LLM config (all stages → gemini-2.5-flash)
  setTestLlmConfig();

  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD in .env.test\n' +
        'Create a test user in Clerk dashboard and add credentials to .env.test'
    );
  }

  if (hasFreshSession()) {
    console.log('Using cached auth state (__clerk_db_jwt cookie still valid)');
    return;
  }

  console.log('Authenticating with Clerk (email + password)...');

  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // If already logged in, just save state and exit
    const userButton = page.locator('.cl-userButtonTrigger');
    if (await userButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Already logged in — saving session and skipping login flow');
      const authDir = path.dirname(AUTH_FILE);
      if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
      await context.storageState({ path: AUTH_FILE });
      await browser.close();
      return;
    }

    // Dismiss cookie banner if present
    const acceptCookies = page.locator('button:has-text("Accept"), button:has-text("Reject All")');
    if (await acceptCookies.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptCookies.first().click();
      console.log('Dismissed cookie banner');
    }

    await page.screenshot({ path: path.join(__dirname, 'auth-step-1.png') });

    // New landing page: click "Get Started" to reveal sign-in form
    const getStartedButton = page.locator('button.btn-cta, button:has-text("Get Started"), button:has-text("Start"), button:has-text("Rozpocznij"), button:has-text("Starten")');
    if (await getStartedButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Clicking Get Started button to reveal sign-in form...');
      await getStartedButton.first().click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(__dirname, 'auth-step-1b.png') });

    // We have an existing user, so we need Sign In flow (not Sign Up)
    const signInLink = page.locator('text="Sign in"');
    if (await signInLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Clicking Sign in link...');
      await signInLink.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: path.join(__dirname, 'auth-step-2.png') });

    // Now find email input
    const emailInput = page.locator('input[name="identifier"], input[name="emailAddress"], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
    console.log('Found email input');

    // Enter email
    await emailInput.fill(email);
    console.log('Filled email');

    await page.screenshot({ path: path.join(__dirname, 'auth-step-3.png') });

    // Click Continue button (primary form button, not Google)
    const continueButton = page.locator('button.cl-formButtonPrimary, button[data-localization-key="formButtonPrimary"]').first();
    await continueButton.click();
    console.log('Clicked continue');

    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, 'auth-step-4.png') });

    // Wait for password field
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    console.log('Found password input');

    // Enter password
    await passwordInput.fill(password);

    await page.screenshot({ path: path.join(__dirname, 'auth-step-5.png') });

    // Click Continue/Sign in button
    const signInButton = page.locator('button.cl-formButtonPrimary, button[data-localization-key="formButtonPrimary"]').first();
    await signInButton.click();
    console.log('Clicked sign in');

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, 'auth-step-6-after-signin.png') });

    // Check if verification code is required (new device)
    const verificationText = page.locator('text="Check your email"');
    const isVerificationRequired = await verificationText.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVerificationRequired) {
      console.log('');
      console.log('='.repeat(60));
      console.log('  VERIFICATION CODE REQUIRED');
      console.log('  Check your email and enter the 6-digit code in the browser');
      console.log('  You have 5 minutes...');
      console.log('='.repeat(60));
      console.log('');

      // Wait for user to enter code and complete verification (5 min timeout)
      await page.waitForSelector('.cl-userButtonTrigger', { timeout: 5 * 60_000 });
    } else {
      // Wait for authenticated state (normal flow)
      await page.waitForURL((url) => !url.hash.includes('sign'), { timeout: 30_000 });
      await page.waitForLoadState('networkidle');

      // Verify we're logged in
      await page.waitForSelector('.cl-userButtonTrigger', { timeout: 15_000 });
    }

    console.log('Authentication successful, saving state...');

    // Ensure .auth directory exists
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Save auth state
    await context.storageState({ path: AUTH_FILE });
    console.log('Auth state saved to', AUTH_FILE);

  } catch (error) {
    console.error('Authentication failed:', error);
    await page.screenshot({ path: path.join(__dirname, 'auth-failure.png') });
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
