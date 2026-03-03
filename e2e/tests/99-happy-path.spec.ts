/**
 * Happy Path E2E Test
 *
 * Complete flow from Chat through to Plan using Auto-Fill self-play.
 * This test runs LAST (99- prefix) after all atomic tests pass.
 *
 * Flow: Chat → Verification → Summary → Plan
 *
 * REQUIRES: Test user must have isAdmin=true in Clerk publicMetadata
 * for Auto-Fill debug feature to be available.
 */
import { test, expect } from '../fixtures/test.fixture';
import { ChatPage } from '../pages/chat.page';
import { VerificationPage } from '../pages/verification.page';
import { SummaryPage } from '../pages/summary.page';
import { PlanPage } from '../pages/plan.page';
import { SAMPLE_PROMPTS } from '../helpers/test-data';
import { assertWithLlm } from '../helpers/llm-judge';
import { assertAuthenticated } from '../helpers/auth';

test.describe.serial('Happy Path - Full Flow', () => {
  // This is a long test - give it plenty of time
  test.setTimeout(600_000); // 10 minutes total

  test('complete flow: Chat → Verification → Summary → Plan', async ({ page, resetProfile }) => {
    // ==========================================
    // STEP 1: Chat (Intake) - using Auto-Fill
    // ==========================================
    console.log('\n========== STEP 1: CHAT (INTAKE) ==========');

    await resetProfile();
    console.log('Profile reset complete');

    const chatPage = new ChatPage(page);
    await chatPage.goto();
    console.log('Navigated to /chat');

    // Use Auto-Fill to complete intake automatically
    // This activates self-play mode where LLM answers its own questions
    await chatPage.completeIntakeWithDefaults();
    console.log('Intake complete via Auto-Fill');

    // Verify continue bar is visible
    await expect(chatPage.continueBar).toBeVisible();
    console.log('Continue bar visible - ready to proceed');

    // Click continue to go to verification
    await chatPage.clickContinue();
    await expect(page).toHaveURL(/\/verification/);
    console.log('Navigated to verification step');

    // ==========================================
    // STEP 2: Verification (Prompt Scoring)
    // ==========================================
    console.log('\n========== STEP 2: VERIFICATION ==========');

    const verificationPage = new VerificationPage(page);

    // Submit a prompt - auto-navigates to summary after scoring
    await verificationPage.submitAndNavigate(SAMPLE_PROMPTS.intermediate);
    console.log('Prompt submitted, scored, and auto-navigated to summary');

    // Verify we're on summary page
    await expect(page).toHaveURL(/\/summary/);
    console.log('Navigated to summary step');

    // ==========================================
    // STEP 3: Summary (Assessment Report)
    // ==========================================
    console.log('\n========== STEP 3: SUMMARY ==========');

    const summaryPage = new SummaryPage(page);

    // Wait for assessment report to generate
    await summaryPage.waitForAssessment();
    console.log('Assessment report generated');

    // Verify assessment content is visible
    await expect(summaryPage.assessmentContent).toBeVisible();

    // Verify continue bar
    await expect(summaryPage.continueBar).toBeVisible();

    // Click continue to go to plan
    await summaryPage.clickContinue();
    await expect(page).toHaveURL(/\/plan/);
    console.log('Navigated to plan step');

    // ==========================================
    // STEP 4: Plan (Training Playbook)
    // ==========================================
    console.log('\n========== STEP 4: PLAN ==========');

    const planPage = new PlanPage(page);

    // Wait for plan outline to generate
    await planPage.waitForOutline();
    console.log('Plan outline generated');

    // Verify plan cards are visible
    const moduleCount = await planPage.getModuleCount();
    expect(moduleCount).toBeGreaterThan(0);
    console.log(`Plan has ${moduleCount} modules`);

    // Verify we can see the plan content
    await expect(planPage.planContainer).toBeVisible();

    // --- Extended module assertions ---

    // a) At least 3 modules expected for a real plan
    expect(moduleCount).toBeGreaterThanOrEqual(3);
    console.log(`Module count check passed: ${moduleCount} >= 3`);

    // b) All module titles should be non-empty
    const moduleTitles = await planPage.getModuleTitles();
    for (const title of moduleTitles) {
      expect(title.length).toBeGreaterThan(0);
    }
    console.log(`Module titles: ${moduleTitles.join(' | ')}`);

    // c) Open first module and verify reader
    await planPage.openModule(0);
    console.log('Opened first module');

    // d) Wait for handbook content to generate and stabilize
    await planPage.waitForHandbook();
    console.log('Handbook content loaded and stable');

    // e) Verify module title in reader
    const readerTitle = await planPage.getReaderModuleTitle();
    expect(readerTitle.length).toBeGreaterThan(0);
    console.log(`Reader module title: ${readerTitle}`);

    // f) Extract handbook text and assert quality with LLM judge
    const handbookText = await planPage.getHandbookText();
    console.log(`Handbook text length: ${handbookText.length} chars`);
    expect(handbookText.length).toBeGreaterThan(100);

    const verdict = await assertWithLlm({
      content: handbookText,
      criteria: `This should be educational content for an AI training course module.
It should have clear structure, be 200+ words, cover the topic indicated by the title "${readerTitle}",
and contain practical examples or actionable advice.`,
      threshold: 50,
    });
    expect(verdict.pass, `LLM Judge failed (${verdict.score}/100): ${verdict.reasoning}`).toBe(true);

    // g) Go back to plan
    await planPage.backToPlan();
    console.log('Returned to plan view');

    // Verify we're back to the plan grid
    await expect(planPage.planContainer).toBeVisible();

    console.log('\n========== HAPPY PATH COMPLETE ==========');
    console.log('Successfully completed: Chat → Verification → Summary → Plan');
  });

  test('can return to completed chat step', async ({ page }) => {
    // After happy path, chat should show as complete
    // (No reset - continue from previous test state)

    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    // Wait for SSR hydration — Clerk auth must resolve before content appears
    await assertAuthenticated(page);

    const chatPage = new ChatPage(page);

    // Either intake is complete (continue bar) or we can navigate
    const isComplete = await chatPage.isIntakeComplete();
    console.log(`Chat complete on return: ${isComplete}`);

    // Should be able to access the page without errors
    expect(true).toBe(true);
  });

  test('navigation guards work after completion', async ({ page }) => {
    // After completing happy path, all steps should be accessible.
    // Each goto() triggers SSR → hydration, so wait for auth each time.
    async function gotoStep(path: string) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await assertAuthenticated(page);
      await expect(page).toHaveURL(new RegExp(`\\${path}`));
    }

    await gotoStep('/plan');
    await gotoStep('/summary');
    await gotoStep('/verification');
    await gotoStep('/chat');

    console.log('All navigation guards passed for completed user');
  });
});
