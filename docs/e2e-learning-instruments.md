# E2E Test Plan: Learning Instruments (v2)

## 1. Overview

Tests cover the redesigned learning instrument system consisting of:

- **GlossatorMargin** -- right-side floating panel (desktop) / badge (mobile)
- **WorkbenchTabs** -- bottom tabbed drawer with 5 tabs: Probes, Contrapositor, Concept Radar, Skeleton Key, Tomorrow

The old ToolkitPanel (checkbox enable/disable), mode toggle (cartographer/constructor), inline tool placement in chapters, TimeBridge, and ReflectionGate are all removed. All tools now live in the margin panel or bottom workbench.

Backend persistence is implemented via `learnerArtifacts` (Convex).

**Proposed test file:** `e2e/tests/05-learning-instruments.spec.ts`

---

## 2. Prerequisites

| Requirement | Detail |
|-------------|--------|
| Auth | Logged-in user with completed profile (`storageState` from `global-setup`) |
| Course document | At least 1 `courseDocument` with `status === 'completed'` containing a 3-chapter handbook |
| Feature flags | None required (video-enhanced-lessons is irrelevant) |
| Navigation | Tests start by navigating to the scroll reader with a completed document |

No ToolkitPanel setup is needed -- instruments are always present in the margin and workbench.

---

## 3. Test Sections per Component

### 3.1 GlossatorMargin (right sidebar, per-chapter notes)

**Layout:** Floating panel on the right side of the reader on desktop. On mobile, rendered as a badge that opens a drawer/overlay.

**CSS selectors:**
- `.glossator-margin` -- main container
- `.glossator-margin__note` -- individual note card
- `.glossator-margin__add` -- "+" add button
- `.glossator-margin__note--expanded` -- expanded state of a note card

**data-testid attributes:**
- `data-testid="glossator-margin"` -- main container
- `data-testid="glossator-margin-add"` -- add button
- `data-testid="glossator-margin-note-{index}"` -- individual note card
- `data-testid="glossator-margin-note-textarea"` -- text input inside new note form
- `data-testid="glossator-margin-note-save"` -- save button inside new note form

**Test cases:**

| # | Test | Action | Assertion |
|---|------|--------|-----------|
| 1 | Add button visible | Render reader at chapter 1 | `.glossator-margin__add` visible |
| 2 | Clicking "+" opens note form | Click `.glossator-margin__add` | Textarea and save button appear |
| 3 | Save disabled without text | Open form, leave empty | Save button is `disabled` |
| 4 | Save a note | Type text + click save | `.glossator-margin__note` appears with entered text |
| 5 | Note is expandable | Click a saved note card | Card toggles `.glossator-margin__note--expanded` |
| 6 | Multiple notes accumulate | Save 3 notes | 3x `.glossator-margin__note` visible |
| 7 | Notes are chapter-scoped | Save note on ch1, scroll to ch2 | ch2 glossator shows no notes (or only ch2 notes) |
| 8 | Textarea clears after save | Save a note | Form textarea is empty / form is closed |

---

### 3.2 WorkbenchTabs (bottom drawer)

**Layout:** Fixed bottom drawer with 5 tabs. Collapsible via a toggle button.

**CSS selectors:**
- `.workbench` -- main container
- `.workbench__tab` -- individual tab button
- `.workbench__tab--active` -- currently selected tab
- `.workbench__panel` -- visible tab content panel
- `.workbench__toggle` -- expand/collapse button

**data-testid attributes:**
- `data-testid="workbench"` -- main container
- `data-testid="workbench-toggle"` -- collapse/expand button
- `data-testid="workbench-tab-{name}"` -- tab button (name: `probes`, `contrapositor`, `concept-radar`, `skeleton-key`, `tomorrow`)
- `data-testid="workbench-panel"` -- active panel content area

**Test cases:**

| # | Test | Action | Assertion |
|---|------|--------|-----------|
| 1 | Workbench visible on load | Render reader | `.workbench` visible |
| 2 | Default tab is selected | Render reader | One `.workbench__tab--active` exists |
| 3 | Tab switching | Click each tab in sequence | `.workbench__tab--active` changes, `.workbench__panel` content changes |
| 4 | Collapse hides panel | Click `.workbench__toggle` | `.workbench__panel` not visible |
| 5 | Expand restores panel | Click toggle again | `.workbench__panel` visible with last active tab |
| 6 | All 5 tabs present | Render | 5x `.workbench__tab` elements with correct labels |

---

### 3.3 Contrapositor (workbench tab, LLM-scored)

**Layout:** Inside the workbench "Contrapositor" tab. Contains a textarea for counter-arguments, submit triggers LLM scoring. Per-chapter.

**CSS selectors:**
- `.workbench-contra__textarea` -- input textarea
- `.workbench-contra__submit` -- submit button
- `.workbench-contra__score` -- score display after LLM response
- `.workbench-contra__feedback` -- feedback text after LLM response
- `.workbench-contra__loading` -- loading state during LLM call

**data-testid attributes:**
- `data-testid="contra-textarea"` -- textarea
- `data-testid="contra-submit"` -- submit button
- `data-testid="contra-score"` -- score display
- `data-testid="contra-feedback"` -- feedback text
- `data-testid="contra-loading"` -- loading spinner/indicator

**Backend:** `api.instrumentAi.scoreContrapositor` (internal action, triggered by mutation). Persistence via `api.learnerArtifacts.saveArtifact`.

**Test cases:**

| # | Test | Action | Assertion |
|---|------|--------|-----------|
| 1 | Textarea visible | Switch to Contrapositor tab | `.workbench-contra__textarea` visible |
| 2 | Submit disabled without text | Leave textarea empty | Submit button `disabled` |
| 3 | Submit triggers loading | Type text + click submit | `.workbench-contra__loading` visible |
| 4 | Score and feedback displayed | Wait for LLM response (or mock) | `.workbench-contra__score` and `.workbench-contra__feedback` visible |
| 5 | Per-chapter scoping | Submit on ch1, switch to ch2 | ch2 contrapositor is empty / shows ch2 state |

---

### 3.4 Concept Radar (workbench tab, AI auto-generated)

**Layout:** Inside the workbench "Concept Radar" tab. User clicks a button to scan chapter concepts via AI, then classifies each concept as Clear / Fuzzy / Dark. Per-chapter.

**CSS selectors:**
- `.concept-radar-auto__scan-btn` -- "Scan chapter concepts" button
- `.concept-radar-auto__loading` -- loading state during API call
- `.concept-radar-auto__list` -- concept list container
- `.concept-radar-auto__item` -- individual concept row
- `.concept-radar-auto__term` -- concept label
- `.concept-radar-auto__state--clear` -- Clear classification button
- `.concept-radar-auto__state--fuzzy` -- Fuzzy classification button
- `.concept-radar-auto__state--dark` -- Dark classification button
- `.concept-radar-auto__state--active` -- active classification on a concept

**data-testid attributes:**
- `data-testid="concept-radar-scan"` -- scan button
- `data-testid="concept-radar-loading"` -- loading indicator
- `data-testid="concept-radar-item-{index}"` -- concept row
- `data-testid="concept-radar-state-{state}-{index}"` -- classification button (state: `clear`, `fuzzy`, `dark`)

**Backend:** `api.instrumentAi.generateConceptRadar` (public action).

**Test cases:**

| # | Test | Action | Assertion |
|---|------|--------|-----------|
| 1 | Scan button visible | Switch to Concept Radar tab | `.concept-radar-auto__scan-btn` visible |
| 2 | Empty list before scan | Render | No `.concept-radar-auto__item` elements |
| 3 | Scan triggers loading | Click scan button | `.concept-radar-auto__loading` visible |
| 4 | Concepts appear after scan | Wait for API response (or mock) | Multiple `.concept-radar-auto__item` elements visible |
| 5 | Default classification | After scan | No `.concept-radar-auto__state--active` on any concept (or a default) |
| 6 | Classify as Clear | Click Clear button on concept 0 | `.concept-radar-auto__state--clear` has `.concept-radar-auto__state--active` |
| 7 | Classify as Fuzzy | Click Fuzzy button on concept 0 | Fuzzy button active, Clear deactivated |
| 8 | Classify as Dark | Click Dark button on concept 0 | Dark button active |
| 9 | Per-chapter scoping | Classify on ch1, switch to ch2 | ch2 shows fresh state (no classifications or separate scan needed) |

---

### 3.5 Skeleton Key (workbench tab, dual mode)

**Layout:** Inside the workbench "Skeleton Key" tab. Two modes: Auto (AI generates 3 compression levels) and Manual (user writes progressive compressions). Per-chapter.

**CSS selectors (shared):**
- `.skeleton-key-mode__btn` -- mode toggle button (auto/manual)
- `.skeleton-key-mode__btn--active` -- active mode

**CSS selectors (auto mode):**
- `.skeleton-key-auto__compress-btn` -- "Compress chapter" button
- `.skeleton-key-auto__loading` -- loading state
- `.skeleton-key-auto__level` -- individual level container (3 levels: 50/25/10 words)
- `.skeleton-key-auto__level-text` -- generated compression text
- `.skeleton-key-auto__level-label` -- word count label (e.g. "50 words")

**CSS selectors (manual mode):**
- `.skeleton-key-manual__level` -- individual level container
- `.skeleton-key-manual__level--active` -- unlocked level
- `.skeleton-key-manual__level--locked` -- locked level
- `.skeleton-key-manual__level--done` -- completed level
- `.skeleton-key-manual__textarea` -- text input per level
- `.skeleton-key-manual__submit` -- submit per level
- `.skeleton-key-manual__counter` -- word counter
- `.skeleton-key-manual__counter--over` -- over-limit indicator
- `.skeleton-key-manual__answer` -- saved answer display

**data-testid attributes:**
- `data-testid="skeleton-key-mode-auto"` -- auto mode button
- `data-testid="skeleton-key-mode-manual"` -- manual mode button
- `data-testid="skeleton-key-compress"` -- compress button (auto mode)
- `data-testid="skeleton-key-auto-level-{n}"` -- auto level (n = 0, 1, 2)
- `data-testid="skeleton-key-manual-level-{n}"` -- manual level
- `data-testid="skeleton-key-manual-textarea-{n}"` -- manual textarea
- `data-testid="skeleton-key-manual-submit-{n}"` -- manual submit
- `data-testid="skeleton-key-manual-counter-{n}"` -- word counter

**Backend:** `api.instrumentAi.generateSkeletonKey` (public action).

**Test cases (auto mode):**

| # | Test | Action | Assertion |
|---|------|--------|-----------|
| 1 | Compress button visible | Switch to Skeleton Key tab, ensure auto mode | `.skeleton-key-auto__compress-btn` visible |
| 2 | Compress triggers loading | Click compress button | `.skeleton-key-auto__loading` visible |
| 3 | Three levels generated | Wait for API response (or mock) | 3x `.skeleton-key-auto__level` with text content |
| 4 | Levels labeled correctly | After generation | Labels show "50 words", "25 words", "10 words" (or equivalent) |

**Test cases (manual mode):**

| # | Test | Action | Assertion |
|---|------|--------|-----------|
| 5 | Mode toggle switches to manual | Click manual mode button | `.skeleton-key-mode__btn--active` on manual, manual UI visible |
| 6 | Level 1 unlocked on start | Render manual mode | Level 0 has `--active`, textarea visible |
| 7 | Levels 2-3 locked | Render | Level 1 and 2 have `--locked`, no textarea |
| 8 | Submit level 1 unlocks level 2 | Type <=50 words + submit level 0 | Level 0 `--done`, level 1 changes to `--active` |
| 9 | Full 3-level progression | Submit L0 (50w) -> L1 (25w) -> L2 (10w) | All 3 levels `--done`, answers visible |
| 10 | Word counter | Type 5 words | Counter shows "5/50" |
| 11 | Over-limit warning | Type 60 words in level 0 | `.skeleton-key-manual__counter--over` visible |
| 12 | Submit disabled without text | No text entered | Submit button `disabled` |

---

### 3.6 Tomorrow Tasks (workbench tab, ch3 only)

**Layout:** Inside the workbench "Tomorrow" tab. Only active on chapter 3. Generates 3 task cards with difficulty badges. Module-level (not per-chapter).

**CSS selectors:**
- `.tomorrow-tasks__generate-btn` -- "Generate tomorrow's tasks" button
- `.tomorrow-tasks__loading` -- loading state
- `.tomorrow-tasks__card` -- individual task card
- `.tomorrow-tasks__badge--quick` -- quick difficulty badge
- `.tomorrow-tasks__badge--medium` -- medium difficulty badge
- `.tomorrow-tasks__badge--deep` -- deep difficulty badge
- `.tomorrow-tasks__disabled-msg` -- message shown when not on ch3

**data-testid attributes:**
- `data-testid="tomorrow-generate"` -- generate button
- `data-testid="tomorrow-loading"` -- loading indicator
- `data-testid="tomorrow-card-{index}"` -- task card (0, 1, 2)
- `data-testid="tomorrow-badge-{index}"` -- difficulty badge

**Backend:** `api.instrumentAi.generateTomorrowTasks` (public action).

**Test cases:**

| # | Test | Action | Assertion |
|---|------|--------|-----------|
| 1 | Tab disabled / message on ch1 | Navigate to ch1, switch to Tomorrow tab | Generate button not visible or disabled, message shown |
| 2 | Tab disabled on ch2 | Navigate to ch2 | Same as above |
| 3 | Generate button visible on ch3 | Navigate to ch3, switch to Tomorrow tab | `.tomorrow-tasks__generate-btn` visible and enabled |
| 4 | Generate triggers loading | Click generate | `.tomorrow-tasks__loading` visible |
| 5 | 3 task cards rendered | Wait for API response (or mock) | 3x `.tomorrow-tasks__card` visible |
| 6 | Difficulty badges present | After generation | Each card has one of `--quick`, `--medium`, `--deep` badge |
| 7 | Module-level persistence | Generate on ch3, switch to ch1 and back to ch3 | Tasks still visible (not regenerated) |

---

## 4. AI Mock Strategy (CI)

All AI-dependent instruments call Convex actions. For deterministic CI runs, mock at the network layer:

### Recommended approach: Route intercept

```typescript
// Intercept Convex action calls and return mock responses
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  const body = await route.request().postDataJSON();

  // Mock concept radar
  if (body?.path === 'instrumentAi:generateConceptRadar') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        concepts: [
          { term: 'Prompt Engineering', description: 'Crafting effective prompts' },
          { term: 'Chain of Thought', description: 'Step-by-step reasoning' },
          { term: 'Few-Shot Learning', description: 'Learning from examples' },
        ],
      }),
    });
  }

  // Mock skeleton key (auto)
  if (body?.path === 'instrumentAi:generateSkeletonKey') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        levels: [
          { words: 50, text: 'Mock 50-word compression of chapter content...' },
          { words: 25, text: 'Mock 25-word compression...' },
          { words: 10, text: 'Mock 10-word summary.' },
        ],
      }),
    });
  }

  // Mock contrapositor scoring
  if (body?.path === 'instrumentAi:scoreContrapositor') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        score: 7,
        feedback: 'Solid counter-argument with good reasoning.',
      }),
    });
  }

  // Mock tomorrow tasks
  if (body?.path === 'instrumentAi:generateTomorrowTasks') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tasks: [
          { title: 'Practice prompt chains', difficulty: 'quick' },
          { title: 'Build a mini-agent', difficulty: 'medium' },
          { title: 'Analyze failure modes', difficulty: 'deep' },
        ],
      }),
    });
  }

  return route.continue();
});
```

**Note:** The exact route matching pattern depends on how Convex serializes action paths in HTTP requests. Adjust the `body?.path` checks to match the actual request payload format. An alternative is matching on the URL path segment.

### When to mock vs. hit real API

| Scenario | Strategy |
|----------|----------|
| CI pipeline (GitHub Actions) | Always mock -- deterministic, fast, no API keys needed |
| Local development | Real API by default, mock via `E2E_MOCK_AI=true` env var |
| Smoke test in staging | Real API with extended timeouts (60s per LLM call) |

---

## 5. Persistence Tests

Backend persistence uses `api.learnerArtifacts.saveArtifact` (mutation) and `api.learnerArtifacts.getArtifacts` (query).

### 5.1 Save and reload

```
test('glossator notes persist across page reload')
```
1. Add a note in GlossatorMargin on chapter 1
2. Wait for network idle (save mutation completes)
3. Reload page (`page.reload()`)
4. Wait for reader to render
5. Assert: note is still visible in `.glossator-margin__note`

### 5.2 Contrapositor result persists

```
test('contrapositor score persists across reload')
```
1. Submit a counter-argument, wait for score
2. Reload page
3. Navigate to Contrapositor tab
4. Assert: `.workbench-contra__score` and `.workbench-contra__feedback` still visible

### 5.3 Concept Radar classifications persist

```
test('concept radar classifications persist across reload')
```
1. Scan concepts, classify concept 0 as "Clear"
2. Reload page
3. Navigate to Concept Radar tab
4. Assert: concept 0 still shows "Clear" as active classification

### 5.4 Skeleton Key manual progress persists

```
test('skeleton key manual progress persists across reload')
```
1. Switch to manual mode, submit level 0
2. Reload page
3. Navigate to Skeleton Key tab, switch to manual mode
4. Assert: level 0 shows `--done`, level 1 is `--active`

### 5.5 Tomorrow Tasks persist

```
test('tomorrow tasks persist across reload')
```
1. On ch3, generate tomorrow tasks
2. Reload page
3. Navigate to Tomorrow tab on ch3
4. Assert: 3 task cards still visible (no need to regenerate)

### 5.6 Cross-module isolation

```
test('artifacts are scoped to module')
```
1. Add a glossator note on module A
2. Navigate back to plan, open module B
3. Assert: GlossatorMargin on module B has no notes from module A
4. Navigate back to module A
5. Assert: note is still there

---

## 6. Responsive Tests

### 6.1 Desktop layout (viewport >= 1024px)

```
test('desktop: glossator margin visible as sidebar')
```
1. Set viewport to 1280x800
2. Navigate to reader
3. Assert: `.glossator-margin` visible, positioned on right side
4. Assert: `.workbench` visible at bottom

### 6.2 Mobile layout (viewport < 768px)

```
test('mobile: glossator shows as badge, not sidebar')
```
1. Set viewport to 375x812
2. Navigate to reader
3. Assert: `.glossator-margin` is NOT visible as a sidebar
4. Assert: A glossator badge/trigger element is visible (e.g. `.glossator-margin__mobile-badge`)
5. Click badge
6. Assert: Notes overlay/drawer opens

### 6.3 Mobile workbench

```
test('mobile: workbench tabs remain functional')
```
1. Set viewport to 375x812
2. Assert: `.workbench` visible
3. Click through all 5 tabs
4. Assert: each panel renders correctly (no overflow, content accessible)

### 6.4 Tablet breakpoint (768px - 1023px)

```
test('tablet: layout adapts correctly')
```
1. Set viewport to 768x1024
2. Assert: layout renders without horizontal overflow
3. Assert: workbench and glossator are both accessible

---

## 7. Proposed File Structure

**File:** `e2e/tests/05-learning-instruments.spec.ts`

```typescript
import { test, expect } from '../fixtures/test.fixture';

// --- Helpers ---

/** Navigate to scroll reader with a completed course document */
async function navigateToReader(page: Page) {
  // Navigate to course, select first completed document
  // Wait for reader to render: await page.waitForSelector('.workbench');
}

/** Switch workbench to a specific tab */
async function switchWorkbenchTab(page: Page, tabName: string) {
  await page.click(`[data-testid="workbench-tab-${tabName}"]`);
  await expect(page.locator(`[data-testid="workbench-tab-${tabName}"]`))
    .toHaveClass(/--active/);
}

/** Scroll to a specific chapter and wait for intersection observer */
async function scrollToChapter(page: Page, chapterNumber: number) {
  const chapter = page.locator(`[data-chapter="${chapterNumber}"]`);
  await chapter.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000); // IntersectionObserver settle
}

/** Setup route mocks for all AI endpoints */
async function mockAiEndpoints(page: Page) {
  await page.route('**/api/**', async (route) => {
    // ... mock responses as described in Section 4
    return route.continue();
  });
}

// --- Tests ---

test.describe.serial('Learning Instruments', () => {
  test.setTimeout(180_000);

  test.describe('GlossatorMargin', () => {
    test('add button visible on render', async ({ page }) => { /* ... */ });
    test('clicking + opens note form', async ({ page }) => { /* ... */ });
    test('save disabled without text', async ({ page }) => { /* ... */ });
    test('saves note and displays it', async ({ page }) => { /* ... */ });
    test('notes are expandable', async ({ page }) => { /* ... */ });
    test('multiple notes accumulate', async ({ page }) => { /* ... */ });
    test('notes are chapter-scoped', async ({ page }) => { /* ... */ });
    test('textarea clears after save', async ({ page }) => { /* ... */ });
  });

  test.describe('WorkbenchTabs', () => {
    test('workbench visible on load', async ({ page }) => { /* ... */ });
    test('all 5 tabs present', async ({ page }) => { /* ... */ });
    test('tab switching works', async ({ page }) => { /* ... */ });
    test('collapse and expand', async ({ page }) => { /* ... */ });
  });

  test.describe('Contrapositor', () => {
    test('textarea visible in tab', async ({ page }) => { /* ... */ });
    test('submit disabled without text', async ({ page }) => { /* ... */ });
    test('submit triggers loading then shows score', async ({ page }) => { /* ... */ });
    test('per-chapter scoping', async ({ page }) => { /* ... */ });
  });

  test.describe('ConceptRadar', () => {
    test('scan button visible', async ({ page }) => { /* ... */ });
    test('empty list before scan', async ({ page }) => { /* ... */ });
    test('scan generates concept list', async ({ page }) => { /* ... */ });
    test('classify concept as clear/fuzzy/dark', async ({ page }) => { /* ... */ });
    test('per-chapter scoping', async ({ page }) => { /* ... */ });
  });

  test.describe('SkeletonKey', () => {
    test.describe('Auto mode', () => {
      test('compress button visible', async ({ page }) => { /* ... */ });
      test('compress generates 3 levels', async ({ page }) => { /* ... */ });
    });

    test.describe('Manual mode', () => {
      test('mode toggle switches to manual', async ({ page }) => { /* ... */ });
      test('level 1 unlocked, 2-3 locked', async ({ page }) => { /* ... */ });
      test('submit level 1 unlocks level 2', async ({ page }) => { /* ... */ });
      test('full 3-level progression', async ({ page }) => { /* ... */ });
      test('word counter and over-limit warning', async ({ page }) => { /* ... */ });
      test('submit disabled without text', async ({ page }) => { /* ... */ });
    });
  });

  test.describe('TomorrowTasks', () => {
    test('disabled on ch1 and ch2', async ({ page }) => { /* ... */ });
    test('generate button visible on ch3', async ({ page }) => { /* ... */ });
    test('generates 3 task cards with badges', async ({ page }) => { /* ... */ });
    test('module-level persistence', async ({ page }) => { /* ... */ });
  });

  test.describe('Persistence', () => {
    test('glossator notes persist across reload', async ({ page }) => { /* ... */ });
    test('contrapositor score persists across reload', async ({ page }) => { /* ... */ });
    test('concept radar classifications persist', async ({ page }) => { /* ... */ });
    test('skeleton key manual progress persists', async ({ page }) => { /* ... */ });
    test('tomorrow tasks persist across reload', async ({ page }) => { /* ... */ });
    test('artifacts scoped to module', async ({ page }) => { /* ... */ });
  });

  test.describe('Responsive', () => {
    test('desktop: glossator margin as sidebar', async ({ page }) => { /* ... */ });
    test('mobile: glossator as badge with drawer', async ({ page }) => { /* ... */ });
    test('mobile: workbench tabs functional', async ({ page }) => { /* ... */ });
    test('tablet: layout adapts without overflow', async ({ page }) => { /* ... */ });
  });
});
```

**Estimated test count:** ~35-40

---

## 8. Timeouts and Execution Notes

| Operation | Timeout | Source |
|-----------|---------|--------|
| UI interaction (click, fill, assert visible) | 30s | `playwright.config` `expect.timeout` |
| Full test | 180s (3 min) | `playwright.config` `timeout` |
| LLM / AI action response | 60s | Extended timeout for real API calls |
| Scroll + IntersectionObserver settle | +1000ms | `page.waitForTimeout(1000)` after scroll |

**Serial execution:** `test.describe.serial` -- required. Shared auth state, single user, tests modify component and backend state.

**Scroll stability:** After every `scrollIntoViewIfNeeded()`, add `page.waitForTimeout(1000)` for IntersectionObserver to fire.

**Network idle:** Before persistence assertions and after navigation, use `page.waitForLoadState('networkidle')` to ensure mutations have completed.

**Viewport management:** Responsive tests must explicitly set viewport via `page.setViewportSize()` and restore default after each test.

---

## 9. Summary of Backend API Dependencies

| Component | API | Type | Notes |
|-----------|-----|------|-------|
| GlossatorMargin | `api.learnerArtifacts.saveArtifact` | mutation | Save notes |
| GlossatorMargin | `api.learnerArtifacts.getArtifacts` | query | Load notes |
| Contrapositor | `api.instrumentAi.scoreContrapositor` | internal action | Triggered by mutation |
| Concept Radar | `api.instrumentAi.generateConceptRadar` | public action | Scan concepts |
| Skeleton Key (auto) | `api.instrumentAi.generateSkeletonKey` | public action | Generate compressions |
| Skeleton Key (manual) | `api.learnerArtifacts.saveArtifact` | mutation | Save user compressions |
| Tomorrow Tasks | `api.instrumentAi.generateTomorrowTasks` | public action | Generate tasks |
| All instruments | `api.learnerArtifacts.getArtifacts` | query | Hydrate on load |
