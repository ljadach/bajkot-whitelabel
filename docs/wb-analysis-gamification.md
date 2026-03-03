# Workbench Gamification Analysis: ARPG Mechanics for Learning Tools

**Date:** 2026-02-15
**Status:** Analysis & Recommendations
**Context:** 5 workbench tools (Probes, Challenge, Concepts, Compress, Next Steps) + existing gamification scaffolding (userPoints, exerciseSubmissions, chapterProgress, activityLog) that are currently disconnected from each other.

---

## Current State Diagnosis

The workbench is a **sandbox with no economy**. Learners interact with tools, artifacts get saved to `learnerArtifacts`, but nothing feeds back into `userPoints`, `activityLog`, or `chapterProgress`. In ARPG terms: the player can swing the sword, but nothing dies, nothing drops, and the XP bar doesn't move.

The existing scaffolding is actually solid. The tables are there. The architecture supports it. What's missing is the **connective tissue** -- the reward bus, the feedback loops, the progression signals.

### Per-Tool Audit

| Tool | Current State | ARPG Analogy | Missing |
|------|--------------|--------------|---------|
| **Probes** | Click chip -> fills explore input. No tracking | Dialogue options in town | Selection tracking, usage counting |
| **Challenge** | Write argument -> AI scores 0-100. Score displayed but not persisted to points | Boss fight with no loot drop | XP award, score-tier feedback, history |
| **Concepts** | Mark Got it/Unsure/Lost. Saved as artifact | Skill tree with no consequences | Mastery aggregation, adaptive content |
| **Compress** | Auto/Manual: 50->25->10 words. Manual locks levels | Crafting system with no recipe book | Completion tracking, quality scoring for manual mode |
| **Next Steps** | AI generates 3 tasks. Display only | Quest board you can't accept | Task acceptance, completion verification |

---

## 1. Progression & XP: The Experience System

### The Core Loop (stolen from Diablo's kill-loot-equip-kill)

```
Use Tool -> Earn XP -> Fill Chapter Mastery Bar -> Unlock Visual Tier -> Repeat
```

### XP Values (proposed)

| Action | XP | Rationale |
|--------|-----|-----------|
| **Probe used** (clicked + explored) | 5 | Low friction, high frequency. Like picking up gold |
| **Challenge submitted** | 15-50 (scaled by score) | The boss fight. Score 80+ = 50 XP. Score 40-79 = 30 XP. Below 40 = 15 XP. Always reward effort |
| **Concept marked** (any state) | 3 per concept | Self-assessment is honest signal. Rewarding "Lost" equally prevents gaming |
| **All concepts marked** | 10 bonus | Completion bonus. Like clearing a room |
| **Compress Auto generated** | 5 | Passive. You clicked a button |
| **Compress Manual level locked** | 10 per level | Active cognitive work. 30 total for full completion |
| **Compress Manual all 3 done** | 15 bonus | Set bonus, like completing an armor set |
| **Next Steps generated** | 5 | Low effort |
| **Next Steps task marked done** | 20 (quick), 40 (medium), 60 (deep) | If we add acceptance/completion |
| **Glossator note added** | 3 | Marginal annotation, consistent effort |

### Level-Up Moments

In Path of Exile, the level-up is a **screen flash + sound + stat points**. Learning equivalent:

- **Chapter Mastery Tiers**: Each chapter has a mastery bar (0-100%). Tools fill it. Tiers:
  - **Bronze** (25%): "You've started exploring" -- subtle border glow on chapter number
  - **Silver** (50%): "Solid engagement" -- chapter card gets a silver badge
  - **Gold** (75%): "Deep comprehension" -- gold badge + unlocks optional "expert probes"
  - **Diamond** (100%): "Complete mastery" -- diamond icon, visible on plan overview

- **Module Mastery**: All 3 chapters at Gold+ = module mastery badge. This is the "map completion" dopamine.

### Implementation Leverage

The `userPoints` table already exists. The `activityLog` table supports `exercise_completed` events. Extending `activityLog.activityType` to include `'tool_used'` and adding a `toolXpAward` mutation that both increments `userPoints.totalPoints` and logs to `activityLog` is the minimum viable path.

**Quick estimate: 1 new mutation + 5 `onSave` callback additions = ~2 hours of work.**

---

## 2. Loot / Rewards: Making Output Feel Valuable

### Challenge Score = Loot Rarity

ARPG players grind for that orange/gold text. Map Challenge scores to a visual rarity system:

| Score Range | Tier | Visual | Feedback Tone |
|-------------|------|--------|---------------|
| 0-29 | **Common** (gray) | Plain text, no decoration | "Basic critique. Dig deeper." |
| 30-59 | **Uncommon** (green) | Green accent border | "You identified a real weakness." |
| 60-79 | **Rare** (blue) | Blue glow, subtle animation | "Strong analysis. You found a genuine gap." |
| 80-94 | **Epic** (purple) | Purple border, sparkle effect | "Exceptional critical thinking." |
| 95-100 | **Legendary** (gold) | Gold border, particle effect, achievement | "This argument could be published." |

This maps directly to existing `artifact.score`. Pure frontend. No backend changes needed.

### Compress Manual = Crafting

Framing manual compression as a crafting recipe makes the progressive difficulty feel intentional:

- Level 1 (50 words) = "Raw Materials" -- gather the essence
- Level 2 (25 words) = "Refined" -- cut the fat
- Level 3 (10 words) = "Crystallized" -- pure insight

Visual: each locked level could show a lock icon that "clicks open" with a satisfying CSS transition. The `allDone` state becomes a "craft complete" moment -- the three levels visually snap together into a final card.

### Concept Radar = Skill Tree Fragments

Each concept marked as "Got it" lights up a node. "Unsure" shows it dimmed. "Lost" shows it dark. Across chapters, this builds a visible skill web -- your personal concept map.

**This is NOT a leaderboard mechanic.** This is a mirror. You're not competing. You're mapping your own terrain.

---

## 3. Feedback Loops: Instant Gratification

### The ARPG Feedback Hierarchy

1. **Micro (0-100ms)**: Damage numbers, click sounds, item pickup flash
2. **Meso (1-10s)**: Loot drop, ability cooldown reset, health bar change
3. **Macro (minutes-hours)**: Level up, boss kill, map reveal

### Learning Equivalents

**Micro feedback (CSS only, no backend):**
- Probe chip click: brief scale-up animation (1.05x) + subtle color shift. Already partially there with `.active` class, just needs a transition
- Concept state toggle: traffic light animation -- green pulse for "Got it", amber pulse for "Unsure", red dim for "Lost"
- Glossator note add: note slides in from right, fades in. The "+" button briefly turns to a checkmark
- Compress level lock: satisfying "stamp" animation -- the text snaps into place, word count badge turns gold

**Meso feedback (minimal JS):**
- Challenge score reveal: don't show score immediately. Brief 1.5s "evaluating" animation, then score counter rolls up from 0 to final value (like damage numbers floating up). The loot tier color appears last
- Compress Manual completion: all three cards do a subtle "merge" animation when last level is locked
- All concepts marked: brief confetti burst (CSS only, 10 particles, 800ms) or a simple "Radar complete" badge flash

**Macro feedback (needs backend support):**
- Chapter mastery bar fills visually as tools are used
- Module completion triggers a "Module Mastered" overlay (1.5s, auto-dismiss)
- First-time achievements: "First Counter-Argument", "First Full Compression", "Concept Cartographer" (all concepts across all 3 chapters)

### Sound Cues

Skip them for v1. Sound in a learning app is invasive unless opt-in. Haptic feedback on mobile could work (navigator.vibrate), but this is a "nice to have" at best.

---

## 4. Mastery Indicators: Your Stats Screen

In ARPGs you check your character sheet obsessively. The learning equivalent is a **Chapter Engagement Dashboard** -- not a separate page, but integrated into the existing scroll reader.

### Chapter Header Enhancement

Current: `Chapter 1` with a "Mark complete" button.

Proposed: `Chapter 1` with:
- **Mastery bar** (thin, below title): fills based on tool usage
- **Tool completion dots**: 5 dots (one per tool), filled when tool has been used for this chapter
- **Best Challenge score**: if Challenge was submitted, show "Best: 87/100" in rarity color

### Plan Overview Enhancement

The plan overview cards (in `PlanStep.tsx`) could show:
- Per-module completion rings (3 small circles for each chapter's mastery)
- Total XP earned per module
- A "streak" indicator if multiple modules completed in sequence

### What NOT to Show

- Don't show percentiles vs other learners until you have 100+ users (small N makes percentiles meaningless)
- Don't show time-on-task (creates pressure, not insight)
- Don't show "days since last activity" in a guilt-inducing way

---

## 5. Daily/Session Quests

### Session Goals (non-annoying)

ARPG daily quests work because they're optional but rewarding. Learning equivalent:

**"Today's Engagement" -- a subtle bar at the top of the workbench, visible but not blocking:**

- "Use 2 tools on this chapter" -- 20 bonus XP
- "Submit a Challenge" -- 30 bonus XP
- "Complete Concept Radar for all 3 chapters" -- 50 bonus XP

Implementation: session-level tracking in React state (not persisted). Resets on page reload. Low pressure. The bar shows progress but never nags.

**Weekly milestone (persisted):**
- "3 chapters completed this week" -- achievement badge
- "Challenge score improved from last time" -- "Growing Critic" badge

### What to Avoid

- No push notifications. Ever.
- No "You missed yesterday!" guilt loops
- No daily login rewards (this isn't a casino)
- No time-limited offers or pressure

---

## 6. Difficulty Scaling

### Adaptive Challenge Prompts

Current: Challenge prompt is static ("What's wrong with what you just read?").

Proposed scaling based on prior performance:

| Learner Tier | Challenge Prompt Variation | Expected Difficulty |
|-------------|---------------------------|-------------------|
| **First attempt** | "What's wrong with what you just read?" | Open-ended, forgiving |
| **Scored 60+ before** | "Find a specific logical gap or unstated assumption" | More targeted |
| **Scored 80+ before** | "Construct an alternative explanation that accounts for the same evidence" | Synthesis required |

This requires passing prior scores to the `scoreContrapositor` prompt. Minimal backend change -- add a `priorBestScore` arg to the action.

### Adaptive Concept Radar

If a learner marks most concepts as "Got it" quickly, the next chapter's radar could include 1-2 "stretch concepts" -- terms from adjacent chapters or advanced territory. The `generateConceptRadar` prompt already accepts `profileXml`; adding prior concept states would enable this.

---

## 7. Social Proof / Leaderboard

### Not Yet. Here's Why.

With a small user base, leaderboards are demoralizing (you're always competing with 3 people) or meaningless. Social proof needs critical mass.

### When Ready (100+ users per module)

- **Aggregate benchmarks only**: "Learners who completed this chapter typically scored 65-75 on the Challenge"
- **"You're in good company"**: "247 learners have completed this module"
- **Anonymous comparison**: "Your compression was 23% more concise than average" (for manual Compress)

### What to Implement Now (0 users needed)

- **Self-comparison**: "Your Challenge score improved from 52 to 78 across chapters" -- this is the most motivating comparison
- **Tool usage counter**: "You've used 12 tools across 4 chapters" -- simple accumulation is satisfying

---

## 8. Streak Mechanics

### Engagement Streaks (already scaffolded)

The `userProfiles.learningStats` field already has `streakDays` and `longestStreak`. These just aren't connected to anything visible.

### Proposed Streak Types

1. **Chapter streak**: Complete 3 chapters in sequence without breaking flow. Reward: "Flow State" badge + 50 bonus XP
2. **Tool completionist**: Use all 5 tools on a single chapter. Reward: "Thorough Explorer" badge + 30 XP
3. **Challenge streak**: Submit Challenges on 3+ consecutive chapters. Reward: "Devil's Advocate" badge + earned via consistency
4. **Concept mastery streak**: Mark all concepts across 3 chapters. Reward: "Concept Cartographer" badge

### Streak Protection

ARPGs have "streak shields." Learning equivalent: if you skip a day but come back within 48h, your streak doesn't break. Learning has natural pauses (weekends, busy days). Punishing absence kills motivation.

### Streak Display

Small flame icon next to the user's progress indicator. Number inside = current streak. Max streak shown separately. Non-intrusive.

---

## 9. What NOT to Gamify

### Leave These Clean

1. **The reading experience itself**. No XP for scrolling, no progress bars on content, no "you've read 73% of this chapter." Reading speed varies. Measuring it creates anxiety.

2. **Glossator notes**. Notes are for personal reflection. Adding scores or quality ratings to notes would make them performative instead of honest. The existing count badge is sufficient.

3. **Probes selection**. Probes are thinking prompts. Making some "worth more" than others would bias exploration. Equal XP per probe, no scoring.

4. **The explore/chat input**. This is open-ended inquiry. Any gamification here would warp it into "ask questions for points" which produces junk queries.

5. **Next Steps task difficulty**. Don't award more XP for choosing "deep" tasks over "quick" ones in the generation phase. Award XP only for reported completion, and even then, trust the learner.

### The Casino Test

Before adding any mechanic, ask: "Would a casino do this?" If yes, don't. Specifically:
- No variable-ratio reinforcement schedules (random bonus XP drops)
- No loss aversion triggers ("You'll lose your progress if...")
- No artificial scarcity ("Only 3 Challenges available today!")
- No social pressure ("Your colleague completed this faster")

---

## 10. Quick Wins: Maximum Impact, Minimal Code

### Tier 1: Frontend Only (no backend changes, ship in 1 day)

1. **Challenge score rarity colors** -- Map the existing `artifact.score` to CSS classes. 5 tiers, 5 colors. Pure styling.

2. **Compress Manual "craft complete" animation** -- The `allDone` state already exists. Add a CSS keyframe animation that plays once when all 3 levels are locked.

3. **Concept Radar state animations** -- Add CSS transitions to the Got it/Unsure/Lost buttons. Green pulse, amber glow, red dim. Already has `.active` class.

4. **Tool completion indicators on chapter header** -- 5 small dots showing which tools have been used. Data already available from `getArtifact`.

5. **Challenge score counter animation** -- Instead of instant score display, animate the number counting up over 1.5s. Pure CSS/JS, no backend.

### Tier 2: Minimal Backend (1-2 mutations, ship in 1-2 days)

6. **XP award on tool use** -- New `awardToolXp` mutation that increments `userPoints.totalPoints` and logs to `activityLog`. Called from existing `onSave` callbacks.

7. **Chapter mastery percentage** -- Query `learnerArtifacts` count for a chapter, divide by total tools, show as a thin progress bar. Data already exists.

8. **Self-comparison for Challenge** -- Show "Previous best: X" when submitting a new Challenge for a chapter where a prior score exists. Data in `learnerArtifacts`.

### Tier 3: Meaningful Backend Work (3-5 days)

9. **Achievement system** -- New `achievements` table. Predefined list (First Challenge, Concept Cartographer, Flow State, etc.). Check conditions on tool save, award if met. Toast notification on unlock.

10. **Adaptive Challenge prompts** -- Pass prior best score to `scoreContrapositor`. Adjust system prompt difficulty. Requires adding `priorBestScore` to the action args.

---

## Architecture Recommendation

### The Reward Bus Pattern

Don't sprinkle XP logic across individual tools. Create a single **reward bus** -- a mutation that every tool calls after a meaningful action:

```typescript
// convex/rewards.ts
export const awardToolEngagement = mutation({
  args: {
    toolId: v.string(),
    action: v.string(), // 'submit', 'complete', 'generate', 'use'
    score: v.optional(v.number()),
    chapterNumber: v.number(),
    courseDocumentId: v.id('courseDocuments'),
  },
  handler: async (ctx, args) => {
    // 1. Calculate XP based on tool + action + score
    // 2. Update userPoints
    // 3. Log to activityLog
    // 4. Check achievement conditions
    // 5. Return { xpAwarded, achievementsUnlocked }
  },
});
```

This keeps the XP economy in one place. Easy to tune, easy to audit, impossible to accidentally create inflation.

### Frontend Hook

```typescript
// useRewardBus.ts
function useRewardBus() {
  const award = useMutation(api.rewards.awardToolEngagement);
  return {
    onToolUsed: (toolId, action, opts) => {
      award({ toolId, action, ...opts });
      // Trigger local micro-feedback (animation, sound)
    }
  };
}
```

Wire this into the existing `onSave` callbacks. Each tool fires once per meaningful interaction. The reward bus handles all XP, logging, and achievement logic centrally.

---

## Summary: The ARPG Learning Loop

```
READ chapter (no gamification -- clean reading)
    |
    v
USE tools (earn XP, get feedback, build mastery)
    |
    v
SEE progress (mastery bar fills, tier upgrades, streaks continue)
    |
    v
FEEL competent (self-comparison shows growth, not competition)
    |
    v
CONTINUE (intrinsic motivation + extrinsic nudges = sustained engagement)
```

The key insight from ARPGs: **the grind feels good when every action has visible consequence**. Right now the workbench tools produce invisible artifacts. Making those artifacts feed a visible progression system is the single highest-leverage change this codebase can make.

The scaffolding is already there. The tables exist. The hooks exist. It's a wiring job, not a construction job.
