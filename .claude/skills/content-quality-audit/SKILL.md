---
name: content-quality-audit
description: Audit quality of generated educational content after user completes the full flow. Use when "audit content", "quality check", "content quality", "score handbooks", "review generated content".
---

# Content Quality Audit

Evaluate the quality of AITutoro-generated content (handbooks, exercises, assessment) for a specific user. Produces a structured report with per-dimension scores and actionable findings.

## Prerequisites

- The user must have completed the full flow (intake → scoring → assessment → playbook → handbooks → exercises).
- You need their `clerkUserId`. Ask if not provided.

## Workflow

### Step 1: Get clerkUserId

If the user didn't provide one, ask:

> Which user should I audit? Provide their `clerkUserId`.

### Step 2: Fetch content dump

Run the Convex debug function to get all generated content:

```bash
npx convex run admin/debugContent:dumpHandbooks '{"clerkUserId":"USER_ID_HERE"}'
```

This returns profile XML, assessment report, plan outline, plan full (truncated), all handbooks (3 chapters each), and all exercises.

If the output says "Profile not found" — the user ID is wrong. Ask the user to verify.

If "NO COURSE DOCUMENTS" — handbooks haven't been generated yet. Tell the user.

### Step 3: Parse the dump

The dump has these sections separated by `---` headers:

| Section | Header | What it contains |
|---------|--------|-----------------|
| Profile | `PROFILE XML` | Full learner profile in XML |
| Assessment | `ASSESSMENT REPORT` | Markdown assessment (180-300 words) |
| Plan outline | `PLAN OUTLINE` | JSON array of 5 page cards |
| Plan full | `PLAN FULL (truncated)` | Deep guidance per page (may be truncated at 3000 chars) |
| Handbooks | `HANDBOOK: {title} [{status}]` | 3 chapters per page with title + content |
| Exercises | `EXERCISES ({N} total)` | Type, prompt, hints, rubric per exercise |

**Extract from profile XML:**
- `<tools>` — tool names and tiers
- `<role>` — job title + seniority
- `<artifacts>` — content types produced
- `<needs>` — learning goals
- `<negativePreferences>` — topics to EXCLUDE
- `<skillsSelfReport>` — per-skill scores (1-5)
- `<constraints>` — time, language

### Step 4: Score 10 quality dimensions

Evaluate each dimension on a 1-10 scale. Be specific — cite quotes from the content.

#### Dimension 1: Profile Matching (weight: high)

**Check**: Does handbook content reference the learner's specific tools, role, seniority, artifacts, and goals?

**How**: Compare `<tools>`, `<role>`, `<artifacts>`, `<needs>` from profile XML with actual handbook text. Look for:
- Tool names mentioned in examples and explanations
- Role-specific scenarios (not generic)
- Artifact types appearing in practical exercises
- Learning goals addressed across pages

**Score guide**: 10 = every page references profile data; 5 = generic content with occasional mentions; 1 = zero personalization.

#### Dimension 2: Negative Preferences (weight: high)

**Check**: Are excluded topics truly absent from all content?

**How**: Extract phrases from `<negativePreferences>`. Search all handbook chapters and exercises for those phrases or synonyms. Any match is a violation.

**Score guide**: 10 = zero violations; 7 = minor semantic overlap; 1 = excluded topics taught as main content.

#### Dimension 3: Skill Adaptation (weight: high)

**Check**: Is difficulty granular per-skill, not binary beginner/advanced?

**How**: For each skill in `<skillsSelfReport>`:
- Skill score 1-2/5 → content should have step-by-step instructions, basics, definitions
- Skill score 3/5 → intermediate tips, common mistakes, efficiency improvements
- Skill score 4-5/5 → advanced patterns, edge cases, strategic usage

Check if chapters covering different skills actually vary in depth. A handbook treating a 4/5 skill the same as a 1/5 skill fails this dimension.

**Score guide**: 10 = visible difficulty gradient across skills; 5 = some adaptation but inconsistent; 1 = uniform difficulty everywhere.

#### Dimension 4: Video Selection (weight: medium)

**Check**: Do `:::video{...}:::` embeds match the chapter topic by skill category?

**How**: For each video embed, check if the `src` filename and surrounding content relate to the chapter's skill topic. Videos about "prompt engineering" shouldn't appear in a chapter about "AI safety."

If no video embeds exist (non-video-enhanced flow), score N/A.

**Score guide**: 10 = all embeds topically relevant; 5 = some mismatches; 1 = random video placement.

#### Dimension 5: Copy Quality (weight: medium)

**Check**: Short sentences, active voice, no filler, follows editorial guide.

**How**: Check against the editorial guide rules:
- **Filler words**: Search for "very," "actually," "basically," "just," "cutting-edge," "world-class," "AI is transforming," "In today's rapidly."
- **Sentence length**: Flag paragraphs longer than 3 sentences.
- **Active voice**: Flag passive constructions ("is used by," "can be achieved," "was designed").
- **Brand**: Check "AITutoro" spelling (no space, no alternate spellings).

**Score guide**: 10 = clean, punchy prose throughout; 5 = some filler and long paragraphs; 1 = generic AI-generated wall of text.

#### Dimension 6: Prompt Examples (weight: high)

**Check**: Are AI prompt examples in content complete templates with `{{PLACEHOLDERS}}`?

**How**: Find all prompt/template examples in handbook content. Each should:
- Be multi-line (not one-liners like "Summarize this")
- Have clear structure (role, context, task, format)
- Use `{{PLACEHOLDER}}` syntax for user-specific parts
- Include expected output format when relevant

**Score guide**: 10 = all prompts are complete templates; 5 = mix of good and one-liner prompts; 1 = only trivial one-liner examples.

#### Dimension 7: Content Backbone (weight: medium)

**Check**: Does handbook follow the `fullPlan` structure?

**How**: Compare `PLAN OUTLINE` page titles and `PLAN FULL` guidance with actual handbook structure. Each handbook page should:
- Cover the topics specified in its plan page
- Follow the recommended structure from fullPlan
- Not drift into unrelated topics

**Score guide**: 10 = handbook mirrors plan structure; 5 = loose alignment; 1 = handbook ignores plan completely.

#### Dimension 8: Assessment Context (weight: medium)

**Check**: Does handbook reference findings from the assessment report?

**How**: Extract key findings/recommendations from `ASSESSMENT REPORT`. Search handbook content for:
- Themes from assessment appearing in handbook recommendations
- Assessment-identified gaps being addressed
- Skill levels from assessment reflected in content depth

**Score guide**: 10 = assessment findings woven throughout; 5 = occasional references; 1 = assessment completely ignored.

#### Dimension 9: Language Consistency (weight: high)

**Check**: Is all content in one language (matching learner's `<constraints>` language)?

**How**: Check the language specified in profile. Then verify:
- All handbook titles are in that language
- All chapter content is in that language
- All exercise prompts and rubrics are in that language
- No random English sentences in Polish content (or vice versa)

**Score guide**: 10 = fully consistent; 7 = minor slips (1-2 English terms in Polish content); 1 = mixed languages throughout.

#### Dimension 10: Exercise Quality (weight: medium)

**Check**: Rubric specificity, difficulty match, type appropriateness.

**How**: For each exercise check:
- **Rubric**: Is it specific criteria (not generic "good effort" or "demonstrates understanding")?
- **Difficulty**: Does it match the learner's skill level for the topic?
- **Type fit**: Does `prompt_improvement` have a prompt to improve? Does `problem_solving` have a concrete problem?
- **Hints**: Are hints actually helpful (not just restating the prompt)?

**Score guide**: 10 = specific rubrics, matched difficulty, appropriate types; 5 = some generic rubrics; 1 = all rubrics are generic platitudes.

### Step 5: Generate the report

Use this exact format:

```markdown
# Content Quality Report

**User**: {clerkUserId}
**Date**: {today's date}
**Overall Score**: {weighted average}/10

## Profile Summary

Role: {role} | Seniority: {seniority} | Tools: {tool list}
Skills: {skill1} {score}/5, {skill2} {score}/5, ...
Goals: {needs summary}
Excluded: {negative preferences}
Language: {language}

## Dimension Scores

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Profile matching | X/10 | {one-line finding} |
| 2 | Negative preferences | X/10 | {one-line finding} |
| 3 | Skill adaptation | X/10 | {one-line finding} |
| 4 | Video selection | X/10 or N/A | {one-line finding} |
| 5 | Copy quality | X/10 | {one-line finding} |
| 6 | Prompt examples | X/10 | {one-line finding} |
| 7 | Content backbone | X/10 | {one-line finding} |
| 8 | Assessment context | X/10 | {one-line finding} |
| 9 | Language consistency | X/10 | {one-line finding} |
| 10 | Exercise quality | X/10 | {one-line finding} |

## Detailed Findings

### {Dimension name} — {score}/10

- **Finding**: {specific observation with quoted text from content}
- **Example**: "{actual quote from handbook or exercise}"
- **Recommendation**: {what to fix in prompts or pipeline}

(Repeat for each dimension that scores below 8/10. Skip dimensions that score 8+.)

## Handbook Summary

| Page | Title | Ch1 | Ch2 | Ch3 | Issues |
|------|-------|-----|-----|-----|--------|
| 1 | {title} | {brief topic} | {brief topic} | {brief topic} | {issues or "OK"} |
| ... | ... | ... | ... | ... | ... |

## Exercises Summary

| Page | Chapter | Type | Rubric Specific? | Difficulty Match? | Issues |
|------|---------|------|-----------------|-------------------|--------|
| {title} | 1 | {type} | Yes/No | Yes/No | {issues or "OK"} |
| ... | ... | ... | ... | ... | ... |

## Top Recommendations

1. {Most impactful fix — which prompt template to change and how}
2. {Second priority}
3. {Third priority}
```

### Step 6: Save the report

Save the report to `docs/quality-reports/{date}-{clerkUserId-last-6-chars}.md`.

Create the directory if it doesn't exist.

## Scoring Weights

For the overall score, weight dimensions by impact:

- **High weight (×1.5)**: Profile matching, Negative preferences, Skill adaptation, Prompt examples, Language consistency
- **Medium weight (×1.0)**: Video selection, Copy quality, Content backbone, Assessment context, Exercise quality

Formula: `overall = sum(score × weight) / sum(weights)`

If Video selection is N/A, exclude it from the calculation.

## Reference: Editorial Guide Blacklist

These phrases should NOT appear in generated content:

```
"very", "actually", "basically", "just",
"cutting-edge", "world-class",
"AI is transforming", "In today's rapidly",
"click here", "read more",
"good effort", "demonstrates understanding"
```

## Reference: Profile XML Structure

```xml
<profile>
  <tools><tool name="..." tier="..." usage="..."/></tools>
  <role title="..." seniority="..."/>
  <artifacts><artifact type="..."/></artifacts>
  <needs><need category="...">free text</need></needs>
  <negativePreferences>text to exclude</negativePreferences>
  <skillsSelfReport>
    <skill name="prompting" score="3"/>
    <!-- ... -->
  </skillsSelfReport>
  <constraints>
    <time>...</time>
    <language>...</language>
  </constraints>
</profile>
```
