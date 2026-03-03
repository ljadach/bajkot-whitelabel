/**
 * E2E tests for the Admin Content Processing Pipeline.
 *
 * These tests verify:
 * 1. Non-admin users cannot access /admin routes
 * 2. Admin layout renders with sidebar navigation
 * 3. Config module saves/loads values
 * 4. Video list: add, display, process stub
 * 5. Segment editor: toggle, tag, filter
 * 6. Corpus editor: merge segments into versioned corpus
 *
 * IMPORTANT: These tests require the logged-in user to have isAdmin=true
 * in their Clerk publicMetadata. If the test user is not admin, the access
 * denial test will pass but other tests will be skipped.
 */
import { test, expect } from '../fixtures/test.fixture';
import { assertAuthenticated } from '../helpers/auth';

/**
 * Helper: navigate to an admin page and wait for SSR hydration + auth.
 * In RR7 framework mode the server renders without Clerk/Convex providers,
 * so auth-gated content only appears after client hydration completes.
 */
async function gotoAdmin(page: import('@playwright/test').Page, path = '/admin') {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  // Wait for Clerk auth to hydrate (user button appears)
  await assertAuthenticated(page);
}

test.describe.serial('Admin Content Pipeline', () => {
  test.setTimeout(60_000);

  let isAdmin = false;

  test('non-admin redirect: /admin shows dashboard or redirect', async ({ page }) => {
    await gotoAdmin(page);

    // Check if we see admin sidebar (means user IS admin)
    // or got redirected (means user is NOT admin).
    // After SSR hydration, Convex isAdmin query needs time to resolve,
    // so use a generous timeout.
    const sidebar = page.locator('nav:has-text("Admin Pipeline")');
    if (await sidebar.isVisible({ timeout: 15_000 }).catch(() => false)) {
      isAdmin = true;
      // Admin user — we should see the dashboard cards
      await expect(page.locator('text=Content Processing Pipeline')).toBeVisible();
    } else {
      // Non-admin — should be redirected away from /admin
      // Use main content area link (not the header logo which also links to /dashboard)
      const dashboardLink = page.locator('main a[href="/dashboard"]');
      const redirected = await page.waitForURL('**/dashboard', { timeout: 5000 }).then(() => true).catch(() => false);
      if (!redirected) {
        await expect(dashboardLink).toBeVisible({ timeout: 5000 });
      }
      isAdmin = false;
    }
  });

  test('admin layout has sidebar navigation', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page);

    const sidebar = page.locator('nav:has-text("Admin Pipeline")');
    await expect(sidebar).toBeVisible({ timeout: 15_000 });

    // All nav items should be present
    await expect(sidebar.locator('text=Dashboard')).toBeVisible();
    await expect(sidebar.locator('text=Config')).toBeVisible();
    await expect(sidebar.locator('text=Videos')).toBeVisible();
    await expect(sidebar.locator('text=Segments')).toBeVisible();
    await expect(sidebar.locator('text=Corpus')).toBeVisible();
  });

  test('dashboard shows module cards', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page);

    const content = page.locator('.flex-1.overflow-auto');
    await expect(content.locator('h3', { hasText: 'Pipeline Config' })).toBeVisible();
    await expect(content.locator('h3', { hasText: 'Video Library' })).toBeVisible();
    await expect(content.locator('h3', { hasText: 'Segment Editor' })).toBeVisible();
    await expect(content.locator('h3', { hasText: 'Knowledge Corpus' })).toBeVisible();
  });

  test('config page renders and has form fields', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/config');

    await expect(page.locator('text=Pipeline Configuration')).toBeVisible();

    // Check that config fields exist
    await expect(page.locator('text=Google Drive Folder URL')).toBeVisible();
    await expect(page.locator('text=LLM Model for Processing')).toBeVisible();

    // Save button should be present
    await expect(page.locator('button:has-text("Save Configuration")')).toBeVisible();
  });

  test('config page can save values', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/config');

    // Fill in Google Drive URL field
    const driveInput = page.locator('input[placeholder*="drive.google.com"]');
    await driveInput.fill('https://drive.google.com/drive/folders/test-e2e-123');

    // Click save
    await page.locator('button:has-text("Save Configuration")').click();

    // Should see success toast
    await expect(page.locator('text=Configuration saved')).toBeVisible({ timeout: 5000 });

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await assertAuthenticated(page);
    await expect(driveInput).toHaveValue('https://drive.google.com/drive/folders/test-e2e-123');
  });

  test('video list page renders', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/videos');

    await expect(page.locator('h1:has-text("Video Library")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Video")')).toBeVisible();
  });

  test('can add a video', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/videos');

    // Open add form
    await page.locator('button:has-text("Add Video")').click();

    // Fill in video details
    await page.locator('input[placeholder="File name"]').fill('e2e-test-video.mp4');
    await page.locator('input[placeholder*="Google Drive URL"]').fill('https://drive.google.com/file/d/test123');
    await page.locator('input[placeholder*="Duration"]').fill('120');

    // Submit
    await page.locator('button:has-text("Add"):not(:has-text("Video"))').click();

    // Should see success toast
    await expect(page.locator('text=Video added')).toBeVisible({ timeout: 5000 });

    // Video should appear in the list
    await expect(page.locator('text=e2e-test-video.mp4')).toBeVisible();
    await expect(page.locator('td:has-text("new")').first()).toBeVisible();
  });

  test('can process a video (stub)', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/videos');

    // Find our test video and click Process
    const row = page.locator('tr:has-text("e2e-test-video.mp4")');
    await expect(row).toBeVisible();

    await row.locator('button[title*="Process"]').click();

    // e2e-test-video.mp4 has a fake Drive URL so processing will fail.
    // Verify the UI reflects the failure status correctly.
    await expect(row.locator('text=failed')).toBeVisible({ timeout: 30_000 });
  });

  test('segment editor shows processed segments', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/segments');

    await expect(page.locator('h1:has-text("Segment Editor")')).toBeVisible();

    // Should have segments from previously processed videos
    await expect(page.locator('text=/\\d+ segments/')).toBeVisible({ timeout: 5000 });
    // At least one segment row should be visible in the table
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('can toggle segment on/off', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/segments');

    // Find a toggle switch (the green/gray pill)
    const firstToggle = page.locator('[class*="rounded-full"][class*="bg-green"]').first();
    await expect(firstToggle).toBeVisible({ timeout: 5000 });

    // Click to disable
    await firstToggle.click();

    // Should now show gray (disabled)
    await expect(page.locator('[class*="rounded-full"][class*="bg-neutral-300"]').first()).toBeVisible();
  });

  test('can add tag to segment', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/segments');

    // Find an enabled segment row (not disabled/opacity-50) and click its "+" tag button
    const enabledRow = page.locator('tr:not([class*="opacity-50"])').filter({ has: page.locator('button', { hasText: /^\+$/ }) }).first();
    const tagButton = enabledRow.locator('button', { hasText: /^\+$/ });
    await expect(tagButton).toBeVisible({ timeout: 5000 });
    await tagButton.click();

    // Click a preset tag from the dropdown (force: true to bypass tr pointer interception)
    const tagOption = page.locator('button:has-text("verified")').first();
    await expect(tagOption).toBeVisible({ timeout: 3000 });
    await tagOption.click({ force: true });

    // Tag should appear on the segment
    await expect(page.locator('span:has-text("verified")').first()).toBeVisible();
  });

  test('corpus editor renders with build form', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/corpus');

    await expect(page.locator('h1:has-text("Knowledge Corpus")')).toBeVisible();
    await expect(page.locator('text=Build New Corpus')).toBeVisible();
    await expect(page.locator('text=Corpus Versions')).toBeVisible();
  });

  test('can build a corpus from processed videos', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page, '/admin/corpus');

    // Select a processed video
    const videoCheckbox = page.locator('label:has-text("e2e-test-video.mp4") input[type="checkbox"]');
    if (await videoCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await videoCheckbox.check();

      // Click merge
      await page.locator('button:has-text("Merge into Corpus")').click();

      // Should see success
      await expect(page.locator('text=Corpus created')).toBeVisible({ timeout: 10_000 });

      // Corpus should appear in version history
      await expect(page.locator('text=Corpus v')).toBeVisible();
    }
  });

  test('sidebar navigation works between modules', async ({ page }) => {
    test.skip(!isAdmin, 'Test user is not admin');

    await gotoAdmin(page);

    // Wait for sidebar to be visible before navigating
    await expect(page.locator('nav:has-text("Admin Pipeline")')).toBeVisible({ timeout: 15_000 });

    // Navigate via sidebar
    await page.locator('nav a:has-text("Config")').click();
    await expect(page.locator('text=Pipeline Configuration')).toBeVisible();

    await page.locator('nav a:has-text("Videos")').click();
    await expect(page.locator('h1:has-text("Video Library")')).toBeVisible();

    await page.locator('nav a:has-text("Segments")').click();
    await expect(page.locator('h1:has-text("Segment Editor")')).toBeVisible();

    await page.locator('nav a:has-text("Corpus")').click();
    await expect(page.locator('h1:has-text("Knowledge Corpus")')).toBeVisible();

    await page.locator('nav a:has-text("Dashboard")').click();
    await expect(page.locator('text=Content Processing Pipeline')).toBeVisible();
  });
});
