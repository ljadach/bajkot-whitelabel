# Workbench Action Plan

## Executive Summary

The workbench has two broken features (CSS class concatenation bugs, no-op explore input) and several high-value tools that generate output but never close their feedback loops. The five tools are well-conceived but suffer from: dead-end interactions (probes lead nowhere, concepts diagnose but don't treat, next steps generate but can't be tracked), missing visual feedback (no score animations, no state-change transitions, no skeleton loaders), and a mobile experience that's unusable below 640px. The highest-leverage changes are: fix the 3 CSS class bugs (5 min, restores broken styling), add smooth padding transition (5 min, stops content jumping), fix contrast ratio (30 min), and make the Challenge tool allow resubmission (1 hour). Everything else is either medium-effort component work (Wave 2) or backend wiring (Wave 3).

---

## Wave 1: Ship Today (CSS + copy fixes, 0 component logic)

### 1. Fix ConceptRadar CSS class concatenation bug

- **What:** Missing space between CSS classes. `wb-radar__statewb-radar__state--${s}` should be `wb-radar__state wb-radar__state--${s}`. The state-specific colored backgrounds (green/amber/red) are NOT applying because the selector `.wb-radar__state--clear.active` never matches.
- **Where:** `src/components/course/LearningTools.tsx:570`
- **Why:** Design agent identified (priority #1). Learning agent noted the self-assessment states need visual distinction.
- **Impact: 5 x Ease: 5 = 25**

### 2. Fix SkeletonKey CSS class concatenation bug (2 instances)

- **What:** Same missing-space bug. `wb-skeleton__cardwb-skeleton__card--${level.key}` should be `wb-skeleton__card wb-skeleton__card--${level.key}`. This breaks the progressive font-size reduction (13px -> 12px -> 11px italic) that visually narrates compression levels.
- **Where:** `src/components/course/LearningTools.tsx:747` and `src/components/course/LearningTools.tsx:776`
- **Why:** Design agent identified (appendix bug report).
- **Impact: 4 x Ease: 5 = 20**

### 3. Add smooth padding transition on drawer collapse/expand

- **What:** Add `transition: padding-bottom 0.3s ease` to `.scroll-reader--has-floating-bar` so content doesn't jump when the drawer opens/closes.
- **Where:** `src/index.css:1547` (add transition property)
- **Why:** Design agent recommended. Currently padding drops from 380px to 60px instantly.
- **Impact: 3 x Ease: 5 = 15**

### 4. Fix color contrast ratio (#A09A90 -> #7A756C)

- **What:** The muted text color `#A09A90` on `#FAF8F5` background has ~2.8:1 contrast ratio, failing WCAG AA (needs 4.5:1). Change to `#7A756C` (~4.6:1). Affects 22 occurrences in the `.wb` CSS section: empty states, hints, toggle label, tab labels, counters.
- **Where:** `src/index.css` -- all `.wb` rules using `color: #A09A90` (22 occurrences)
- **Why:** Design agent accessibility section (priority #3). Affects all muted text across all 5 tools.
- **Impact: 4 x Ease: 4 = 16**

### 5. Add aria-expanded to toggle button

- **What:** Add `aria-label="Learning Tools panel"` and `aria-expanded={!collapsed}` to the toggle button in `WorkbenchTabs`.
- **Where:** `src/components/course/LearningTools.tsx:227-228` (the `<button className="wb__toggle">`)
- **Why:** Design agent accessibility section (priority #5). Toggle has no screen reader context.
- **Impact: 3 x Ease: 5 = 15**

### 6. Show "Learning Tools" label when drawer is expanded

- **What:** Currently the toggle bar shows the label only when collapsed and is blank when expanded (just a tiny chevron). Show the label in both states (muted when expanded) so users know the bar is interactive.
- **Where:** `src/components/course/LearningTools.tsx:239` (change conditional render to always show, style differently when expanded)
- **Why:** Design agent section 4 (toggle discovery problem).
- **Impact: 3 x Ease: 5 = 15**

---

## Wave 2: Ship This Week (component logic, no new backend)

### 1. Allow Challenge resubmission

- **What:** After scoring, show an "Edit & Resubmit" button that re-opens the textarea pre-filled with the previous answer. Clear the submitted state so the learner can revise and resubmit. This is where iterative refinement (the real learning) happens.
- **Where:** `src/components/course/LearningTools.tsx:410-433` (the `submitted` branch of ContrapositorPanel)
- **Why:** Learning agent P1 (iterative refinement = deep learning). Gamification agent noted one-shot design kills replay value.
- **Impact: 5 x Ease: 4 = 20**

### 2. Mobile: icons-only tabs below 640px

- **What:** At `<640px`, hide tab text labels and increase icon size from 14px to 20px. Show the active tab's label only (below the icon, smaller text). This keeps all 5 tabs visible with 44px touch targets instead of requiring horizontal scroll.
- **Where:** `src/index.css:2667+` (add `@media (max-width: 640px)` rules: `.wb__tab` text hidden, `.wb__tab--active` text visible, `.wb__tab-icon` width/height 20px)
- **Why:** Design agent section 2 (tab discoverability) + section 6 (mobile). 5 labels on 375px screen = invisible tabs 4-5.
- **Impact: 4 x Ease: 4 = 16**

### 3. Challenge score rarity colors

- **What:** Map existing `artifact.score` to CSS tier classes on the score display: 0-29 gray, 30-59 green border, 60-79 blue accent, 80-94 purple border, 95-100 gold border + subtle glow. Pure frontend -- the score data already exists.
- **Where:** `src/components/course/LearningTools.tsx:424-428` (add class based on score range), `src/index.css` (add `.wb-contra__score--common`, `--uncommon`, `--rare`, `--epic`, `--legendary` styles)
- **Why:** Gamification agent Tier 1 quick win #1. Design agent recommended score visual treatment improvements.
- **Impact: 3 x Ease: 4 = 12**

### 4. Skeleton loaders for generate actions

- **What:** Replace the spinner + text loading state with skeleton placeholders matching the output shape. ConceptRadar: 5 pulsing bars. SkeletonKey: 3 card-shaped placeholders. This reduces perceived wait time.
- **Where:** `src/components/course/LearningTools.tsx:552-557` (ConceptRadar loading), `src/components/course/LearningTools.tsx:733-738` (SkeletonKey loading), `src/index.css` (add `@keyframes wb-skeleton-pulse` and placeholder styles)
- **Why:** Design agent priority #5. Both agents agree generate actions feel slow without visual expectation-setting.
- **Impact: 3 x Ease: 3 = 9**

### 5. Tool-specific empty states

- **What:** Replace the generic italic "Read the chapter first" with per-tool empty states: enlarged muted icon (48px, 20% opacity), one-line tool description, secondary hint. Center vertically in panel. Remove empty state for Probes (always available).
- **Where:** Each `__empty` return block in `ContrapositorPanel`, `ConceptRadarPanel`, `SkeletonKeyPanel`, `TomorrowPanel`. CSS: update `.wb-contra__empty`, `.wb-radar__empty`, `.wb-skeleton__empty`, `.wb-tomorrow__empty` with flexbox centering.
- **Why:** Design agent section 5. All empty states are identical and passive.
- **Impact: 3 x Ease: 3 = 9**

### 6. Concept state micro-animations

- **What:** Add CSS transitions to Got it/Unsure/Lost button state changes. Green pulse flash on "Got it", amber glow on "Unsure", red dim on "Lost". Use a 0.3s background-color transition that settles.
- **Where:** `src/index.css:2335-2351` (`.wb-radar__state--clear.active`, `--fuzzy.active`, `--dark.active`) -- add transition + keyframe animations
- **Why:** Gamification Tier 1 #3, Design agent section 9. Micro-reward on state change.
- **Impact: 2 x Ease: 4 = 8**

---

## Wave 3: Next Sprint (backend wiring, new features)

### 1. Wire the explore input to AI responses

- **What:** The explore input's `onExploreSubmit` is a TODO no-op. Wire it to a new `instrumentAi` action that takes the query + current chapter content and returns an AI response. Display the response inline in the panel. This makes Probes functional (they populate the input, but submitting does nothing).
- **Where:** `src/components/course/ScrollReaderView.tsx` (where `onExploreSubmit` is defined), `convex/instrumentAi.ts` (new `exploreAnswer` action)
- **Why:** Learning agent P0 (highest priority). Unlocks conversational learning. Makes the entire Probes panel meaningful.
- **Impact: 5 x Ease: 2 = 10**

### 2. XP award on tool use (reward bus)

- **What:** Create `convex/rewards.ts` with a single `awardToolEngagement` mutation. Call it from each tool's `onSave` callback. Increment `userPoints.totalPoints` and log to `activityLog`. XP values: probe 5, challenge 15-50 (by score), concept mark 3, compress auto 5, compress manual 10/level, next steps 5.
- **Where:** `convex/rewards.ts` (new), `src/components/course/LearningTools.tsx` (add calls in onSave callbacks)
- **Why:** Gamification agent core recommendation. The scaffolding tables (`userPoints`, `activityLog`) already exist but are disconnected from workbench tools.
- **Impact: 4 x Ease: 2 = 8**

### 3. Dynamic probes via generateProbes action

- **What:** Replace the 5 static probe strings with AI-generated probes per chapter. The `generateProbes` action already exists in `instrumentAi.ts` but is never called from the Probes panel. Call it when chapter loads, cache results.
- **Where:** `src/components/course/LearningTools.tsx:331-357` (ProbesPanel), `convex/instrumentAi.ts` (existing `generateProbes` action)
- **Why:** Learning agent P0. Static probes are the same for every chapter -- they should be contextual.
- **Impact: 4 x Ease: 3 = 12**

### 4. Act on "Lost"/"Unsure" concept classifications

- **What:** When a learner marks a concept as "Unsure" or "Lost", trigger a micro-explanation (2-3 sentences) via an AI action. Display inline below the concept hint. This closes the diagnostic-without-treatment gap.
- **Where:** `src/components/course/LearningTools.tsx:524-529` (handleSetState), new `instrumentAi` action for concept explanation
- **Why:** Learning agent P1. Currently "Lost" marks are recorded but never acted upon.
- **Impact: 4 x Ease: 2 = 8**

### 5. Tab reordering: Concepts -> Probes -> Challenge -> Compress -> Next Steps

- **What:** Reorder the tabs array to match cognitive processing sequence: orientation (Concepts) -> scaffolding (Probes) -> deep processing (Challenge) -> consolidation (Compress) -> transfer (Next Steps).
- **Where:** `src/components/course/LearningTools.tsx:212-218` (tabs array)
- **Why:** Learning agent P2. Current order doesn't follow natural learning progression. But this is Wave 3 because it should ship after probes are wired (Wave 3 #3) to avoid confusion.
- **Impact: 3 x Ease: 5 = 15** (low effort but depends on other Wave 3 items)

---

## Rejected Ideas

| Idea | Source | Reason for Rejection |
|------|--------|---------------------|
| Full-screen overlay on mobile | Design | >2 days work: requires gesture handling, viewport detection, modal logic, keyboard accommodation. The icons-only tabs fix (Wave 2) gets 70% of the mobile value at 10% of the effort. |
| Progressive disclosure (stage tools, don't show all 5) | Learning | Requires state machine tracking which tools have been engaged, per-chapter gating logic, significant UX redesign. Tab reordering (Wave 3 #5) is the 80/20 version. |
| Achievement system with badges | Gamification | Needs new `achievements` table, condition-checking logic, toast notifications, badge display UI. 3-5 days. Ship XP first (Wave 3 #2), prove engagement lift, then add achievements. |
| Snap-to-half drag gesture on mobile | Design | Complex touch handling, three-state drawer logic, edge-case city. Icons-only tabs + existing collapse/expand covers it. |
| Retrieval practice tool ("What do you remember?") | Learning | Entirely new tool. Even if it's the most evidence-backed technique, it's a new component, new AI action, new artifact type. The Challenge tool with resubmission (Wave 2 #1) partially covers active recall. |
| Session quests / daily engagement bar | Gamification | Cool ARPG mechanic but requires session tracking, goal generation, bonus XP logic. Premature before base XP (Wave 3 #2) works. |
| Score counter animation (roll up from 0) | Design + Gamification | Fun polish but requires JS animation logic, timing coordination, and it only fires once per Challenge submission. Low frequency = low perceived value for the effort. Defer to post-Wave-2. |
| Sound cues / haptic feedback | Gamification | Invasive unless opt-in. Needs preferences system. Skip entirely for v1. |
| Adaptive Challenge prompts based on prior score | Gamification | Requires passing score history to AI action. Good idea but backend change + prompt engineering. Ship after base resubmission works. |
| "Xw" -> "X words" in SkeletonKey | Design | Trivial but requires translation key changes across 3 locales for a minor readability gain. Low priority. |

---

## Cross-Agent Agreement Matrix

| Recommendation | Learning | Design | Gamification | Consensus |
|----------------|:--------:|:------:|:------------:|:---------:|
| Fix CSS class concatenation bugs | - | YES | - | 1/3 (but it's a bug -- ship regardless) |
| Wire explore input (TODO) | **P0** | mentions | - | Strong signal (P0) |
| Challenge: allow resubmission | **P1** | mentions | YES (replay value) | **3/3** |
| Concept Radar: act on Lost/Unsure | **P1** | - | YES (feedback loop) | **2/3** |
| Mobile tabs: icons-only below 640px | - | **P4** | - | 1/3 (but obvious UX fix) |
| Fix contrast ratio (#A09A90) | - | **P3** | - | 1/3 (accessibility compliance) |
| Skeleton loading states | - | **P5** | - | 1/3 (perceived performance) |
| Score rarity colors / visual tiers | - | YES (score visual) | **Tier 1** | **2/3** |
| Micro-animations on state changes | - | **S9** | **Tier 1** | **2/3** |
| XP / reward bus | - | - | **Core** | 1/3 (but foundational for gamification) |
| Dynamic probes (use existing action) | **P0** | - | - | Strong signal (action already built) |
| Tab reordering (cognitive sequence) | **P2** | - | - | 1/3 (learning science driven) |
| Tool-specific empty states | - | **S5** | - | 1/3 (UX polish) |
| Challenge: show model answer after scoring | **P1** | - | - | 1/3 (good but adds AI call complexity) |
| Compress: show AI after manual for comparison | **P1** | - | - | 1/3 (high value but needs UI work) |
| Full-screen mobile overlay | - | **P2** | - | 1/3 (rejected: too expensive) |
| Progressive disclosure | **P3** | - | - | 1/3 (rejected: complexity) |
| Achievement badges | - | - | **Tier 3** | 1/3 (rejected: premature) |
| ARIA semantics (role=tablist etc.) | - | **P1-2** | - | 1/3 (important but not user-visible) |
| Add `aria-expanded` to toggle | - | **P5** | - | 1/3 (quick a11y win) |
