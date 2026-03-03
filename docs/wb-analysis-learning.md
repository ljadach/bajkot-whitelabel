# Workbench Learning Tools -- Learning Science Analysis

## Context

Five learning tools live in a bottom drawer ("workbench") that appears while a learner reads a 3-chapter module. The reader also includes a right-margin Glossator (notes), Feynman Oracle (floating question trigger), reflection gates between chapters, and chapter-end probes. This analysis focuses on the 5 workbench tabs.

---

## Tool-by-Tool Analysis

### 1. Prompts (tab: probes)

**What it does:** 5 static clickable chips ("Compress to its skeleton", "Design a use for my world", etc.). Clicking sends the text to the explore input at the bottom.

**Learning mechanism:** Elaborative interrogation + directed self-explanation. The probes act as metacognitive scaffolds -- they don't teach content, they redirect the learner's attention toward deeper processing. The five probes span Bloom's levels: compress (Understand), apply to my world (Apply), find the failure mode (Evaluate), explain to a child (Understand/Apply via Feynman technique), build with this (Create).

**Effectiveness:** Medium. Research on elaborative interrogation (Pressley et al., 1992; Dunlosky et al., 2013) rates it as moderately effective. The probes are well-designed as thinking frames. However, the current implementation has a critical gap: clicking a probe populates the explore input, but `onExploreSubmit` is a no-op (`/* TODO: wire to chapter generation */`). So the probes currently lead nowhere -- the learner clicks, the text appears in the input, and nothing happens. This is a dead-end UX that trains the learner to ignore the tool.

**Friction points:**
- The explore input TODO means the tool is functionally broken
- Static probes -- same 5 for every chapter, regardless of content
- No feedback loop after selecting a probe (no AI response, no guidance)
- Duplicate with ChapterProbes component (same probe texts appear at chapter end AND in the workbench tab)

**Improvements:**
1. **Wire the explore input** to actually generate AI responses. This is the #1 priority -- without it, 40% of the workbench UI is decorative.
2. **Generate probes dynamically** per chapter using the existing `generateProbes` action (which already exists in `instrumentAi.ts` but is never called from the Probes panel!). The action even maps probes to Bloom's taxonomy levels per chapter.
3. **Show the AI response inline** in the panel rather than requiring an external mechanism.
4. **Remove duplication** with ChapterProbes or make them complementary (chapter probes = contextual to that chapter, workbench probes = cross-cutting metacognitive frames).

---

### 2. Challenge (tab: contrapositor)

**What it does:** Learner writes a counter-argument to the chapter content. AI scores it 0-100 with 1-2 sentence feedback.

**Learning mechanism:** This is the strongest tool in the workbench from a learning science perspective. It activates multiple high-value mechanisms simultaneously:
- **Elaborative interrogation** -- "what's wrong?" forces deep reading
- **Critical thinking / argument construction** -- the generation effect (Slamecka & Graf, 1978)
- **Testing effect** -- writing + scoring creates a retrieval practice loop
- **Desirable difficulty** (Bjork, 1994) -- finding flaws is harder than summarizing

The scoring prompt is reasonable: it evaluates "depth of critical analysis, logical coherence, and identification of genuine weaknesses."

**Effectiveness:** High. This is the one tool that truly forces active processing. The generation effect literature is clear: producing arguments strengthens memory more than passive reading. The AI scoring adds the feedback loop that makes this a complete learning cycle (produce -> evaluate -> refine).

**Friction points:**
- **One-shot design** -- the learner submits once and sees a score. No iteration. No "try again." Once submitted, the artifact is locked (the UI shows the submitted value and score, no way to edit or resubmit for this chapter).
- **Score feels arbitrary** -- 0-100 with no rubric explanation. A score of "47/100" doesn't tell the learner what to improve.
- **No model answer** -- after scoring, the learner gets feedback but never sees what a strong counter-argument would look like. Missed opportunity for worked examples.
- **Low temperature (0.3) for scoring** -- appropriate for consistency.

**Improvements:**
1. **Allow resubmission** -- let the learner read the feedback, revise, and resubmit. This is where the real learning happens (iterative refinement).
2. **Replace the 0-100 score with 3-4 rubric dimensions** -- e.g., "Logical coherence: 7/10, Specificity: 4/10, Identifies genuine weakness: 8/10". The current single score is opaque.
3. **Show a model response** after scoring -- "Here's one strong counter-argument the AI identified." This activates comparison learning.
4. **Consider a lower bar for entry** -- "What's wrong with what you just read?" can feel intimidating. An alternative prompt like "What would you push back on?" or "What seems oversimplified?" might lower the activation energy.

---

### 3. Concepts (tab: conceptRadar)

**What it does:** AI generates 5-8 key concepts with hints. Learner marks each as "Got it" / "Unsure" / "Lost." Self-assessment.

**Learning mechanism:** Metacognitive monitoring (Dunlosky & Metcalfe, 2009). The tool asks learners to evaluate their own understanding, which is a calibration exercise. Research shows that learners are notoriously bad at judging what they know (the illusion of knowing / Dunning-Kruger). Forcing explicit self-assessment can improve calibration over time.

**Effectiveness:** Low-to-medium as currently implemented. The problem is that the self-assessment terminates without consequence. The learner marks "Lost" on concept X, and... nothing happens. There's no adaptive pathway: no link to re-read that section, no flashcard generated, no spaced repetition queue, no follow-up explanation. It's a diagnostic tool without a treatment.

**Friction points:**
- **No consequence for "Lost" or "Unsure"** -- the classification is recorded but never acted upon. This teaches the learner that self-assessment is performative, not functional.
- **Binary interaction** -- click a button, done. No elaboration required. The learner can mark everything "Got it" in 3 seconds without thinking.
- **Hint is passive** -- the hint text shows "why it matters" but doesn't help the learner who marked "Lost" actually understand the concept.
- **AI concepts may not match what the learner is struggling with** -- the concepts are extracted from text, not from the learner's actual gaps.

**Improvements:**
1. **Act on "Unsure" and "Lost"** -- when a learner marks a concept as unclear, offer an immediate micro-explanation (2-3 sentences) or link to the relevant section in the chapter. This closes the feedback loop.
2. **Require a brief explanation for "Got it"** -- instead of just clicking, ask "In one sentence, what does this mean?" This converts a recognition task (clicking) into a recall task (generating). Even a 5-word text field transforms the learning value.
3. **Feed "Lost" concepts into spaced repetition** -- these concepts should resurface later (next module, next session) as review prompts. Currently they vanish after classification.
4. **Show a summary** -- "You got 5/8 concepts. 2 marked unsure." This gives the learner a calibration signal over time.

---

### 4. Compress (tab: skeletonKey)

**What it does:** Two modes. Auto: AI compresses the chapter to 50/25/10 words. Manual: learner writes their own compressions at each level, unlocking sequentially.

**Learning mechanism:** This is a faithful implementation of the **summarization / distillation** technique, enhanced with progressive compression (a form of desirable difficulty). Manual mode specifically activates:
- **Generation effect** -- producing the summary yourself
- **Abstraction training** -- each level forces higher-order synthesis
- **Progressive difficulty** -- 50 -> 25 -> 10 words is a genuine cognitive ramp

Auto mode activates recognition/comprehension (reading someone else's summary), which is much weaker but still useful as a reference.

**Effectiveness:** Manual mode: High. This is one of the most evidence-backed techniques in the workbench. The progressive compression is particularly clever -- it forces successive rounds of prioritization, which is exactly what experts do naturally.

Auto mode: Low. Reading an AI-generated summary is passive consumption. It may even create an illusion of understanding ("oh yeah, that makes sense" without actually testing comprehension). Research on the generation effect consistently shows that producing > consuming.

**Friction points:**
- **Manual mode requires high effort** -- three rounds of writing for one chapter is a lot of work. Most learners will default to auto mode because it's easier.
- **No comparison step** -- after manual mode, the learner never sees how the AI compressed the same chapter. A side-by-side would create a powerful calibration moment ("I focused on X, the AI focused on Y -- what did I miss?").
- **Auto mode is too easy** -- it takes zero effort. There's no engagement beyond reading.
- **Sequential gating in manual mode** -- the learner must submit level 1 before seeing level 2. This is good design (prevents skipping), but the "Lock in" metaphor is stressful. The learner can't revise.
- **No word limit feedback for auto mode** -- the AI's compression shows word count but the learner has no way to evaluate quality.

**Improvements:**
1. **Show AI compression AFTER manual completion** -- this creates a "compare and learn" moment. "Here's how the AI compressed it. What did you capture that it missed? What did it capture that you missed?"
2. **Make auto mode interactive** -- instead of passive display, ask "Do you agree with this compression? What would you change?" This converts consumption into evaluation.
3. **Allow revision in manual mode** -- let the learner edit after "locking in." The current one-shot design penalizes first attempts.
4. **Default to manual mode** -- auto should be the fallback, not the default. Nudge learners toward the harder (more effective) path.

---

### 5. Next Steps (tab: tomorrow)

**What it does:** AI generates 3 tasks (quick/medium/deep difficulty) for applying knowledge after the module. Only visible on chapter 3.

**Learning mechanism:** Transfer and application planning. This tool addresses the critical moment of "what do I actually do with this?" -- the bridge from learning to behavior change. The difficulty tiers (quick 5 min / medium 30 min / deep 1+ hour) are well-designed for varied commitment levels.

**Effectiveness:** Medium, but with a ceiling problem. The tasks are generated and displayed, and then... nothing. There's no mechanism for the learner to track whether they actually did the tasks. No accountability, no follow-up, no spaced reminder. This is a "good intentions" tool -- it generates plans that feel productive in the moment but have low follow-through without structure.

Research on implementation intentions (Gollwitzer, 1999) shows that plans are much more effective when they include a **when** and **where**, not just a **what**. Currently the tasks are "Build a mini-agent" but never "On Tuesday morning, before standup, I will..."

**Friction points:**
- **Chapter 3 only** -- the learner can't see next steps until the very end. This means the tool is invisible for 2/3 of the reading experience.
- **Generate-and-forget** -- no tracking, no reminders, no completion checkboxes
- **No personalization feedback** -- the tasks claim to be personalized (the prompt uses profileXml), but the learner can't rate relevance or request alternatives
- **No connection to upcoming modules** -- the tasks don't reference what the learner will study next, missing an opportunity for forward scaffolding

**Improvements:**
1. **Add task commitment** -- let the learner check off "I'll do this one" and optionally add a "when" (implementation intention). Even a simple checkbox changes psychology from "interesting suggestion" to "personal commitment."
2. **Make tasks visible earlier** -- show a preview after chapter 2 ("here's what you might try after finishing this module") to build anticipation and motivation.
3. **Connect to spaced repetition** -- surface incomplete tasks in the next learning session. "Last module you planned to X. Did you do it? What happened?"
4. **Allow regeneration of individual tasks** -- if one task feels irrelevant, let the learner swap it without regenerating all three.

---

## Cross-Cutting Analysis

### Tool Ordering

Current order: Prompts -> Challenge -> Concepts -> Compress -> Next Steps

This order doesn't follow a natural learning sequence. A better progression would map to the learner's cognitive journey through the chapter:

**Recommended order:**
1. **Concepts** (first) -- "Before you process deeply, check: what are the key ideas, and which do you already know?" This is a pre-assessment / orientation activity.
2. **Prompts** (second) -- "Now that you know what to focus on, here are thinking frames to guide your reading." These scaffolds are most useful during or immediately after reading.
3. **Challenge** (third) -- "Now that you've read and thought about it, what would you push back on?" This requires the deepest understanding and should come after initial processing.
4. **Compress** (fourth) -- "Distill what you learned into its essence." Summarization is a consolidation activity, best done after you've challenged and processed the content.
5. **Next Steps** (fifth, unchanged) -- "Now bridge to action." This naturally comes last.

### Timing

Currently all tools are available simultaneously in the bottom drawer after the module loads. This is problematic:
- **Cognitive overload** -- 5 tabs presented at once with no guidance on when to use which
- **No scaffolding** -- a novice learner has no idea whether to start with Concepts or Challenge
- **Flat hierarchy** -- all tools appear equal, but they have very different effort levels and optimal timing

**Recommendation:** Consider progressive disclosure. Show Concepts first (low effort, orientation). After the learner engages with Concepts, reveal Compress and Challenge. Show Next Steps only on chapter 3 (already done). This reduces the initial tab count from 4-5 to 1-2.

### Missing Learning Mechanisms

The workbench covers: self-assessment, critical thinking, summarization, transfer planning, and metacognitive prompts. Key gaps:

1. **Retrieval practice / active recall** -- no tool asks "Without looking back, what were the main points?" This is the single most effective learning technique (Roediger & Karpicke, 2006). The Challenge tool comes closest but tests critical analysis, not recall.

2. **Spaced repetition** -- no mechanism to resurface content across sessions. Everything is single-session. Concepts marked "Lost" never come back. Compressions are never compared across modules.

3. **Elaborative examples** -- no tool asks the learner to generate their own example of a concept. "Give me an example from your work where this applies" is a high-value generation task missing from the toolkit.

4. **Interleaving** -- no tool connects the current chapter to previous modules. "How does this relate to what you learned in Module 2?" Cross-referencing strengthens schema building.

### Cognitive Load: Is 5 Tools Too Many?

Yes, for simultaneous presentation. Research on the paradox of choice (Schwartz, 2004) and cognitive load theory (Sweller, 1988) suggests that 5 options without guidance creates decision paralysis.

However, 5 is not too many if they're sequenced. The solution isn't to remove tools but to stage them. Consider:
- **Always visible:** 2-3 tools (Concepts, Challenge, Compress)
- **Contextual:** Prompts (integrated into the explore bar, not a separate tab)
- **End-of-module:** Next Steps (already done correctly)

This reduces the perceived tab count to 3 during normal reading, which is manageable.

### The Explore Input Problem

The explore input at the bottom of the workbench is the most important piece of unfinished work. It's always visible, it receives probe texts, and its submit handler is a TODO. This is the natural "conversational learning" interface -- the place where a learner asks questions about what they're reading. Without it working, the entire bottom bar feels like a wall of features with no conversational escape valve. Wiring this up would multiply the value of every other tool (probes feed into it, concepts feed into it, challenge feedback could feed into it).

---

## Summary of Priorities

| Priority | Tool | Change | Learning Impact |
|----------|------|--------|-----------------|
| P0 | Explore input | Wire the TODO submit handler to actually generate AI responses | Unlocks conversational learning, makes Probes functional |
| P0 | Probes | Use `generateProbes` action (already built) instead of static strings | Personalized + Bloom-aligned prompts |
| P1 | Challenge | Allow resubmission after feedback | Iterative refinement = where deep learning happens |
| P1 | Concepts | Act on "Lost"/"Unsure" classifications (micro-explanation, link to section) | Closes the diagnostic-without-treatment gap |
| P1 | Compress | Show AI compression after manual completion for comparison | Calibration + the "aha" moment of seeing what you missed |
| P2 | Tab ordering | Reorder to Concepts -> Prompts -> Challenge -> Compress -> Next Steps | Matches cognitive processing sequence |
| P2 | Next Steps | Add commitment checkboxes + implementation intentions | Transforms suggestions into plans with follow-through |
| P2 | Concepts | Require brief explanation for "Got it" instead of just clicking | Converts recognition into recall |
| P3 | All | Progressive disclosure -- stage tools, don't show all 5 at once | Reduces cognitive overload |
| P3 | Missing | Add a retrieval practice tool ("What do you remember?") | The single most effective learning technique, currently absent |
