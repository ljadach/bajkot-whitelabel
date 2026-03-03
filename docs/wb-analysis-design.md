# Workbench Bottom Drawer -- UI/UX Design Analysis

**Component:** `WorkbenchTabs` in `LearningTools.tsx`
**CSS:** `.wb` section in `index.css` (lines 1874-2692)
**Context:** Fixed-bottom panel with 5 tabs, shows learning tools while reading course content

---

## 1. Layout & Space

### Current state
- `position: fixed; bottom: 0` panel, max-height 360px
- Content panel (`wb__panel`) limited to 280px with overflow-y scroll
- Parent body gets 380px bottom padding via `.scroll-reader--has-floating-bar`
- When collapsed: `transform: translateY(calc(100% - 44px))`, body padding drops to 60px

### Issues
- **360px is functional but tight.** The 44px toggle + tab bar (~38px) + explore bar (~54px) eat ~136px, leaving only ~224px usable in the content panel (not even the CSS-declared 280px).
- **No dynamic height.** All panels get the same height whether they show 3 probe chips or 8 concept items. Contrapositor (textarea + prompt) needs vertical breathing room; Probes (5 chips) wastes most of it.
- **380px body padding is static.** When the drawer is collapsed the padding drops abruptly to 60px. No smooth scroll compensation -- content jumps.

### Recommendations
- **Auto-height with max cap.** Let the drawer grow with content, capped at `min(50vh, 420px)`. This gives Contrapositor and ConceptRadar room while keeping Probes compact.
- **Smooth padding transition.** Add `transition: padding-bottom 0.3s` to `.scroll-reader--has-floating-bar` so the body reflows smoothly when collapsing/expanding.
- **Snap-to-half gesture on mobile.** Allow drag-to-resize (30% / 50% / full screen) using a drag handle. Users reading dense content want different drawer sizes at different moments.

---

## 2. Tab Bar

### Current state
- 5 tabs inline with 14px SVG icon + text label
- `overflow-x: auto` with `-webkit-overflow-scrolling: touch`
- At 768px breakpoint: font drops to 11px, gap to 0
- Tab labels: "Prompts", "Challenge", "Concepts", "Compress", "Next Steps"

### Issues
- **5 labels on a 375px screen = truncation or invisible tabs.** At 13px font + padding (16px each side), 5 tabs need ~500px minimum. The scroll overflow works technically but users will not discover that tabs 4-5 exist.
- **No scroll indicator.** There is no visual affordance (fade mask, dots, arrows) telling users more tabs exist to the right.
- **Labels are generic.** "Compress" and "Concepts" do not communicate their purpose to a new user. The icons are 14px abstract SVGs that do not self-explain.

### Recommendations
- **Mobile (<640px): Icons-only tabs with tooltip on long-press.** The 14px icons are already there. Drop labels, increase icon size to 20px, add an active-label below only the selected tab. This keeps all 5 tabs visible at 44px touch targets.
- **Add scroll fade mask on tablet (640-768px).** A gradient mask on the right edge of `.wb__tabs` signals more content.
- **Consider tab overflow menu.** If the Tomorrow tab only shows on chapter 3, hide it in a "..." overflow on other chapters. Conditional tabs that appear/disappear are disorienting.
- **Better labels:** "Prompts" -> "Explore", "Challenge" -> "Argue", "Concepts" -> "Radar", "Compress" -> "Distill", "Next Steps" -> "Tomorrow". Shorter, more distinctive, action-oriented.

---

## 3. Visual Hierarchy

### Current state
- All panels share the same flat structure: white background, 13px text, minimal spacing.
- Generate buttons look identical to content cards.
- Scores and feedback sit at the same visual level as instructions.

### Issues
- **No primary/secondary/tertiary layering.** The generate button (the main CTA) is styled like a passive card. The explore input (persistent action) blends into the panel below.
- **Text density is uniform.** Prompts, user answers, AI feedback, hints -- all at 13px with the same color weight. Nothing draws the eye.
- **Panel title is missing.** When you switch tabs, there is no panel header confirming what tool you are using. The tab label alone carries context, but it is 12px and above the panel, not inside it.

### Recommendations
- **Elevate CTAs.** Generate buttons should use the coral accent (`#E8804C`) as fill, not as hover-only border. Currently they look like links, not buttons.
- **Add panel micro-headers.** Each panel should open with a single-line instruction in slightly larger or weighted text (14px, 500 weight). E.g., Contrapositor: "Argue against what you just read."
- **Score/feedback visual treatment.** The `wb-contra__result` uses a subtle 6% opacity coral background. Increase to 10-12% and add a left border (3px solid coral) to create a "result card" pattern. This signals AI output distinctly from user input.
- **Explore bar elevation.** The explore input at the bottom should have a slightly stronger separator (not just a 25% opacity border) or a subtle background shift (#F5F3F0) to anchor it as a persistent UI element.

---

## 4. Interaction Patterns

### Toggle (collapse/expand)
- **Issue:** The 44px toggle bar has only a 12px chevron and a text label ("Learning Tools") that only appears when collapsed. When expanded, it is a blank bar with a tiny down arrow. This is a discovery problem -- new users will not realize the bar is interactive.
- **Fix:** Add a subtle drag handle (3 horizontal lines, 24px wide) centered in the toggle bar. Keep the chevron but also add the "Learning Tools" label in expanded state (left-aligned, muted). This communicates "I am a draggable/tappable panel edge."

### Tab switching
- **Issue:** The fade animation (`wb-panel-fade`, 0.2s) is present but subtle. No exit animation -- the old panel just vanishes.
- **Fix:** Add a directional slide. When going from tab 1 to tab 3 (left-to-right), the new panel should slide in from the right. This reinforces spatial navigation. CSS: `translateX(8px)` for right, `translateX(-8px)` for left.

### Generate buttons
- **Issue:** Clicking "Scan chapter concepts" or "Compress chapter" shows only a spinner + text ("Scanning...", "Compressing..."). No skeleton/placeholder for the expected result shape.
- **Fix:** Show a skeleton loader that matches the output format. ConceptRadar: 5 placeholder bars with pulse animation. SkeletonKey: 3 card-shaped placeholders. This reduces perceived wait time and sets visual expectations.

### Contrapositor submission
- **Issue:** After submission, the textarea disappears and is replaced by the submitted text + score. No confirmation animation.
- **Fix:** Animate the transition: textarea shrinks, submitted text appears with a brief "locked in" flash (border goes coral for 0.3s, then fades). The score should animate in from 0 to the final value (counter animation).

---

## 5. Empty States

### Current state
- All empty states show a single italic line: "Read the chapter first" (13px, `#A09A90`). Contrapositor, ConceptRadar, SkeletonKey, Tomorrow -- all identical.

### Issues
- **Generic and passive.** The text does not explain what the tool does or why the user should care.
- **No visual.** An italic grey line is barely noticeable in a 280px tall empty panel. Most of the panel is blank white.
- **No progressive disclosure.** The empty state does not tell users what will happen when content is ready.

### Recommendations
- **Tool-specific empty states with illustration.** Each panel should show:
  1. A muted icon (enlarged version of the tab icon, 48px, at 20% opacity)
  2. A one-line description: "Challenge the material. Find the cracks."
  3. A secondary hint: "Available after reading the chapter."

- **Centered layout.** Empty states should be vertically centered in the panel with `flexbox justify-content: center`. Not top-aligned (current).
- **"Try it now" affordance for Probes.** Probes have no content dependency -- they are always available. The empty state should not exist for Probes.

---

## 6. Mobile Experience

### Current state
- At `max-width: 768px`: GlossatorMargin hides, panel padding shrinks to 12px, multi-column layouts (skeleton, tomorrow) collapse to single column. Tab font goes to 11px.
- No modal or sheet behavior. The drawer is always a bottom-fixed panel.

### Issues
- **360px on a 667px screen (iPhone SE) = 54% of viewport.** That is too much. The user cannot see the content they are supposed to be working with.
- **No keyboard accommodation.** When the Contrapositor textarea gets focus, the iOS keyboard takes ~260px. The visible area becomes ~50px of usable drawer above the keyboard. Unusable.
- **Tab labels at 11px are below minimum touch-friendly text size.** Combined with 0 gap, tabs are hard to distinguish and hard to tap accurately.

### Recommendations
- **Mobile (<640px): Full-screen overlay mode.** When expanded, the workbench should take over the entire screen as a modal with a close (X) button in the top-right. The user can focus on one tool, complete their task, and close to return to reading.
- **Collapsed indicator on mobile.** Instead of the current 44px bar, show a floating pill button (coral accent, "Tools" text, bottom-right) with a count badge showing pending actions. Tapping opens the full-screen overlay.
- **Keyboard handling.** Use `visualViewport` API to detect keyboard open state. When keyboard opens, reduce the drawer content area and pin the active input to just above the keyboard.
- **Swipe-to-dismiss.** In the full-screen overlay, support a swipe-down gesture from the handle to close.

---

## 7. Panel-Specific Design Issues

### Probes / Prompts
- **Chips are plain pills.** White background, 1px border, no visual affordance suggesting they are clickable action triggers.
- **Fix:** Add a subtle left icon per chip (speech bubble, 12px). Add a very light hover lift (`translateY(-1px), box-shadow`). Active state is good (coral fill). Consider grouping chips into "Think deeper" / "Apply it" categories with tiny section headers.

### Contrapositor / Challenge
- **Textarea is bare minimum.** No character count, no guidance on good argument structure.
- **Fix:** Add a character/word counter below the textarea (subtle, right-aligned). Add a hint below the prompt: "Aim for 2-3 sentences. Identify the weakest assumption." Show the prompt as a styled quote block, not plain text.
- **Score display is small.** "Score: 85/100" in 14px bold is functional but not rewarding.
- **Fix:** Show score as a circular progress ring (60px diameter) with the number centered. Color changes based on score: <40 red, 40-70 amber, 70+ green. This creates a satisfying visual reward.

### Concept Radar
- **CSS bug:** Line 570 in LearningTools.tsx: `wb-radar__statewb-radar__state--${s}` -- missing space between classes. This means state-specific styles (`.wb-radar__state--clear.active`) are NOT applying. The colored backgrounds (green/amber/red) are likely broken.
- **Fix the class concatenation bug immediately.** Should be `wb-radar__state wb-radar__state--${s}`.
- **List is flat.** 8 concepts in a vertical list with tiny state buttons is hard to scan.
- **Fix:** Group concepts by their state. Show "clear" concepts as collapsed (just the term, green check), "fuzzy" as amber-bordered cards with the hint visible, "dark" as red-bordered with the hint emphasized. This creates a visual triage map.

### Skeleton Key / Compress
- **3-column card layout on desktop is good.** But cards have no visual progression.
- **Fix:** Progressive size reduction is already in the CSS (13px -> 12px -> 11px italic). Reinforce with progressive border-left color: level1 gets a 3px coral left border, level2 gets amber, level3 gets a darker tone. This visually narrates "compression."
- **Word count display.** The "Xw" suffix is cryptic. Change to "X words" or use a visual bar fill.
- **Manual mode UX.** The textarea-per-level approach works but the "Submit" button is labeled generically. Change to "Lock in" (already in translations, good). But add a confirmation micro-animation: the textarea should transform into a static card with a subtle "sealed" feel (reduced opacity border, slight scale-down).

### Tomorrow / Next Steps
- **3-column cards on desktop.** Good layout, collapses to single column on mobile.
- **Difficulty badges are disconnected from the card content.** The badge floats above the task text without visual connection.
- **Fix:** Move the badge inline with the task title. Add a left border color per difficulty (quick=green, medium=amber, deep=purple). The badge + border combo creates a clear difficulty signal without needing to read the label.

---

## 8. Accessibility

### Current gaps
- **Focus states.** Only `wb-contra__submit` and `wb-radar__generate` have `:focus-visible` styles. Tabs, probe chips, state buttons, toggle -- none have visible focus indicators.
- **ARIA labels.** The toggle button has no `aria-label` or `aria-expanded`. Tabs have no `role="tablist"` / `role="tab"` / `role="tabpanel"` / `aria-selected` semantics.
- **Screen reader text.** The tab icons are decorative SVGs with no `aria-hidden="true"`. The toggle chevron has no label. State buttons ("Got it", "Unsure", "Lost") have no context for which concept they modify.
- **Keyboard navigation.** Tabs are individual buttons (keyboard-accessible) but do not support left/right arrow navigation within the tab group (standard pattern). No Escape key to close the drawer.
- **Color contrast.** `#A09A90` on `#FAF8F5` is approximately 2.8:1 contrast ratio -- fails WCAG AA for normal text (needs 4.5:1). This affects all muted text, hints, empty states, and the toggle label.

### Recommendations (priority order)
1. **Add ARIA semantics.** `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`, `aria-labelledby` connections.
2. **Focus-visible on all interactive elements.** Use a consistent 2px `#E8804C` outline with 2px offset.
3. **Fix contrast.** Change muted color from `#A09A90` to `#7A756C` (approximately 4.6:1 on #FAF8F5).
4. **Keyboard patterns.** Arrow keys to move between tabs. Escape to collapse drawer. Enter to activate probe chips.
5. **`aria-expanded` on toggle.** `aria-label="Learning Tools panel"` + `aria-expanded={!collapsed}`.

---

## 9. Polish & Micro-Interactions

### Currently missing
- No hover effects on concept radar items
- No transition when switching between auto/manual skeleton key modes
- No celebration moment when all concepts are marked or all skeleton levels are completed
- Tab active indicator is a flat 2px bottom border -- no animation
- No haptic feedback on mobile for state changes

### Recommended additions
- **Tab indicator slide.** Instead of instant 2px border change, animate a `::after` pseudo-element that slides horizontally to the new tab position. This is a small CSS addition that makes tab switching feel intentional. Use `transition: left 0.25s ease, width 0.25s ease` on a shared indicator bar.
- **Score reveal.** When Contrapositor score arrives, animate the number counting up from 0 (use `requestAnimationFrame` counter or CSS `@property` animation).
- **Concept state change.** When marking a concept as "Got it", briefly flash the item background green (0.3s) then settle. Creates micro-reward.
- **Skeleton Key completion.** When all 3 levels are filled (auto or manual), show a brief confetti or sparkle animation (pure CSS, 1-2 particles). Then display the "All levels complete!" message with a fade-in.
- **Drawer open/close.** Add a slight spring/overshoot to the `transform` transition. Change `ease` to `cubic-bezier(0.34, 1.56, 0.64, 1)` for expand, standard `ease-out` for collapse.

---

## 10. Summary: Top 5 Highest-Impact Changes

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Fix ConceptRadar CSS class bug (missing space) | 5 min | Broken feature fix |
| 2 | Mobile: full-screen overlay instead of bottom drawer | Medium | Usable on phones |
| 3 | Add ARIA semantics + fix color contrast | Small | Accessibility compliance |
| 4 | Icons-only tabs on mobile + scroll fade mask on tablet | Small | Tab discoverability |
| 5 | Skeleton loading states for generate actions | Small | Perceived performance |

---

## Appendix: CSS Bug Report

**File:** `LearningTools.tsx`, line 570
```tsx
className={`wb-radar__statewb-radar__state--${s} ${c.state === s ? 'active' : ''}`}
```
Should be:
```tsx
className={`wb-radar__state wb-radar__state--${s} ${c.state === s ? 'active' : ''}`}
```
This also appears in SkeletonKey cards at lines 747 and 776:
```tsx
className={`wb-skeleton__cardwb-skeleton__card--${level.key}`}
```
Should be:
```tsx
className={`wb-skeleton__card wb-skeleton__card--${level.key}`}
```
These are breaking the per-level visual differentiation (font size reduction) and the per-state color coding (green/amber/red).
