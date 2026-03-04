Updated: 13 Feb 2026

# Illustration & Imagery Guide

Companion to the [Visual Brand System](visual_brand_system.md). That document governs UI and components. This document governs **all non-UI visuals**: illustrations, graphics, thumbnails, social images, diagrams, and any visual content produced by humans or AI agents.

---

## 1. Style: Dynamic Line Art with Strategic Color Infusions

Our illustration style extends the icon language already used in the product (Heroicons-based line art) into fuller, more expressive compositions.

**Core identity:**

| Property           | Definition                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------ |
| **Technique**      | Line art — outlined strokes, no fills except for strategic color infusions                 |
| **Stroke**         | Consistent weight (1.5-2px at standard size), round caps, round joins                      |
| **Color strategy** | Predominantly ink/neutral lines with **targeted coral** infusions for emphasis             |
| **Complexity**     | Medium — more detailed than icons, simpler than traditional illustration                   |
| **Perspective**    | Flat or subtle isometric. No 3D rendering, no photorealism.                                |
| **Human figures**  | Minimal and abstract — silhouettes, gestures, single-line faces. Never detailed portraits. |
| **Objects**        | Recognizable but simplified. Screens, documents, charts rendered as clean outlines.        |
| **Negative space** | Generous. Illustrations breathe. Never fill the entire canvas.                             |

### Why This Style

- **Consistency with product** — same visual DNA as the Heroicons in the UI
- **Scalable** — works at 64px thumbnail and 1920px hero
- **AI-reproducible** — line art with defined parameters is the most consistent style for AI generation
- **"Guide on the Side"** — warm but not playful, precise but not clinical
- **Efficient** — every stroke serves a purpose, matching the Efficiency Mandate

---

## 2. Core Principles

### 2.1 The Illustration Efficiency Mandate

Mirrors the editorial principle: **every visual element must contribute signal**.

- If a line doesn't help communicate the concept, remove it.
- If a color doesn't create hierarchy or emphasis, remove it.
- If a human figure doesn't add meaning, remove it.
- White space IS part of the illustration.

### 2.2 Intellectual Respect in Visuals

- No cartoons, mascots, or childish elements. Ever.
- No generic "person at desk with lightbulb" stock illustration tropes.
- Represent AI concepts with precision: neural connections as clean node graphs, not as glowing brains.
- Represent learning as transformation, not as classrooms.

### 2.3 Warmth Without Playfulness

- Coral infusions add warmth and energy without making things "fun."
- Rounded line caps and joins soften the geometry.
- Human elements (when present) are gestural, not cartoonish.
- The mood is "focused expert sharing insight" — not "startup trying to be cool."

---

## 3. Visual Elements Vocabulary

### 3.1 Line Work

| Element             | Usage                           | Stroke                   |
| ------------------- | ------------------------------- | ------------------------ |
| **Primary lines**   | Main subject outlines           | 2px, `#0f0f0f`           |
| **Secondary lines** | Supporting details, connections | 1.5px, `#525252`         |
| **Tertiary lines**  | Background structure, grids     | 1px, `#e5e5e5`           |
| **Dashed lines**    | Flow, movement, connection      | 1.5px, dashed, `#737373` |
| **Accent strokes**  | Emphasis, active elements       | 2px, `#ff6b35`           |

### 3.2 Color Infusions

"Strategic" means: **maximum 15-20% of the illustration area should carry color.** The rest is line work on white.

| Color                    | Role              | When to use                                           |
| ------------------------ | ----------------- | ----------------------------------------------------- |
| **Coral `#ff6b35`**      | Primary emphasis  | The key concept, the "aha moment," the active element |
| **Coral Wash `#fff5f0`** | Soft highlight    | Background area behind the key concept                |
| **Ink `#0f0f0f`**        | Primary structure | All main line work                                    |
| **Mid Gray `#737373`**   | Supporting detail | Secondary elements, labels                            |
| **Light Gray `#e5e5e5`** | Structural grid   | Background geometry, guidelines                       |

**Segment-specific illustrations** may swap coral for the segment accent:

- Business: Navy `#1e3a5f` infusions
- Education: Forest `#4a7c59` infusions
- Executive: Slate `#4a5568` infusions

### 3.3 Recurring Visual Motifs

These motifs form a shared vocabulary across all illustrations:

| Motif                   | Represents                           | Visual form                           |
| ----------------------- | ------------------------------------ | ------------------------------------- |
| **Node graph**          | AI, neural networks, connections     | Circles connected by lines            |
| **Ascending steps**     | Progress, learning path              | Staircase or rising blocks            |
| **Screen with content** | Digital workspace, tools             | Simplified rectangle with line "text" |
| **Arrow / path**        | Flow, process, direction             | Clean directional line                |
| **Magnifying glass**    | Analysis, prompt optimization        | Circle + handle                       |
| **Clock / timer**       | "5 minutes a day," efficiency        | Simple circle with hands              |
| **Person silhouette**   | Learner, professional                | Single-stroke abstract figure         |
| **Document stack**      | Company documents, training material | Overlapping rectangles                |
| **Checkmark**           | Completion, mastery                  | Clean angular check                   |
| **Spark / star**        | Insight, result                      | Small angular burst (not emoji-like)  |

---

## 4. Composition Rules

### 4.1 Layout Balance

```
+------------------------------------------+
|                                          |
|     [Subject - 40% of canvas]            |
|          [Coral infusion here]           |
|                                          |
|  [Supporting elements - 25%]             |
|                                          |
|     [Negative space - 35%]               |
|                                          |
+------------------------------------------+
```

- Subject occupies ~40% of the canvas.
- Supporting elements provide context (~25%).
- Negative space is mandatory (~35% minimum).
- Subject is slightly off-center for dynamism.

### 4.2 Focal Point

Every illustration has ONE focal point — the element with the coral infusion. The eye should go there first, then flow through supporting elements.

- Coral element = "the point of the illustration"
- If you can't identify a single focal point, the illustration is too complex.

### 4.3 Direction & Flow

- Default reading direction: top-left to bottom-right.
- Progress/growth: left-to-right or bottom-to-top.
- Data flow: top-to-bottom.
- Avoid circular compositions — they lack direction and feel static.

---

## 5. Content Type Specifications

### 5.1 Dimensions & Formats

| Content Type             | Dimensions                  | Aspect Ratio | Format        | Safe Zone                        |
| ------------------------ | --------------------------- | ------------ | ------------- | -------------------------------- |
| **Blog header**          | 1200 x 630px                | ~1.9:1       | PNG/SVG       | 10% margin all sides             |
| **Social card (OG)**     | 1200 x 630px                | ~1.9:1       | PNG           | 15% margin (text overlay zone)   |
| **Social post (square)** | 1080 x 1080px               | 1:1          | PNG           | 10% margin                       |
| **Thumbnail (small)**    | 400 x 300px                 | 4:3          | PNG/SVG       | 5% margin                        |
| **Hero illustration**    | 1920 x 800px                | ~2.4:1       | SVG preferred | Center-weighted, edges can bleed |
| **In-article diagram**   | 800px wide, variable height | Flexible     | SVG           | Full bleed within content column |
| **Email header**         | 600 x 200px                 | 3:1          | PNG           | 10% margin                       |
| **Favicon / icon**       | 512 x 512px                 | 1:1          | PNG/SVG       | 15% margin                       |

### 5.2 Text in Illustrations

- **Avoid text in illustrations** where possible — it creates localization problems (EN/PL/DE).
- If text is necessary: use Inter Semibold, minimum 14px equivalent at final render size.
- Text in illustrations uses Ink `#0f0f0f` only. Never coral text inside illustrations.
- Keep to labels, single words, or short phrases.

### 5.3 Background

- Default: transparent or white `#ffffff`.
- Alternative: off-white `#fafafa` when the illustration sits on a white page (adds subtle boundary).
- For blog/social: white background with the illustration centered.
- Never use gradients, textures, or photos as backgrounds.

---

## 6. AI Generation Guide

### 6.1 Prompt Architecture

Every AI image generation prompt should follow this structure:

```
[STYLE] + [SUBJECT] + [COMPOSITION] + [COLOR RULES] + [EXCLUSIONS]
```

**Template:**

```
A clean, minimal line art illustration in a technical documentation style.
[SUBJECT DESCRIPTION].
Drawn with consistent 2px black outlines on a white background.
One element highlighted with coral/orange (#ff6b35) color infusion — [WHICH ELEMENT].
Generous negative space. No fills except the coral highlight.
Flat perspective, no shadows, no gradients.
Professional and sophisticated, suitable for an edtech brand targeting professionals.
```

### 6.2 Approved Style Keywords

Use these in prompts. They are "on brand":

**Aesthetic:** minimal, clean, precise, technical, line art, outlined, editorial, sophisticated, professional, diagrammatic, architectural

**Mood:** focused, insightful, efficient, clear, warm, confident, analytical, mentoring

**Technique:** single-weight stroke, consistent line weight, flat, 2D, vector-style, outlined shapes, geometric, structural

### 6.3 Banned Keywords (Negative Prompts)

Never use these. They produce off-brand results:

**Style:** cartoon, cute, playful, whimsical, kawaii, chibi, retro, vintage, grunge, neon, cyberpunk, photorealistic, 3D render, painted, watercolor, sketch, hand-drawn, doodle

**Mood:** fun, exciting, adventurous, mysterious, dramatic, dark, moody, epic

**Elements:** mascot, emoji, sticker, icon set (as a grid), stock photo, person smiling at camera, handshake, lightbulb over head, rocket ship, brain glowing

### 6.4 Subject-Specific Prompt Templates

#### AI / Machine Learning Concept

```
A clean, minimal line art illustration showing [SPECIFIC AI CONCEPT, e.g., "a prompt being refined through multiple iterations"].
Central element: [e.g., "a text document with arrows showing transformation stages"].
Coral (#ff6b35) color infusion on [e.g., "the final optimized output"].
Connected by thin dashed lines showing data flow.
White background, generous negative space, consistent 2px black outlines.
No fills except coral highlight. Flat, diagrammatic style.
```

#### Learning / Progress Concept

```
A clean, minimal line art illustration representing [SPECIFIC LEARNING CONCEPT, e.g., "personalized learning paths"].
Central element: [e.g., "branching paths diverging from a single starting point, each leading to different endpoints"].
Coral (#ff6b35) color infusion on [e.g., "the path relevant to the viewer"].
Supporting elements in light gray (#e5e5e5).
White background, flat perspective, no shadows.
Professional technical documentation aesthetic.
```

#### Professional / Workplace Concept

```
A clean, minimal line art illustration depicting [SPECIFIC WORKPLACE CONCEPT, e.g., "team members each receiving customized AI training"].
Central element: [e.g., "abstract person silhouettes connected to personalized screens showing different content"].
Coral (#ff6b35) color infusion on [e.g., "the personalized content on each screen"].
Minimal detail — figures are single-stroke abstractions, not detailed people.
White background, generous whitespace, 2px consistent outlines.
```

### 6.5 Composition Recipes

Pre-defined combinations for common visual needs:

| Recipe                       | Subject                                      | Coral on               | Supporting                   |
| ---------------------------- | -------------------------------------------- | ---------------------- | ---------------------------- |
| **Hero: Platform**           | Screen outline with lesson cards inside      | Active lesson card     | Navigation elements, sidebar |
| **Hero: Speed**              | Clock with 5-minute mark + condensed content | The 5-min marker       | Content lines flowing inward |
| **Feature: Personalization** | Branching path from single origin            | User's chosen path     | Unchosen paths in light gray |
| **Feature: Assessment**      | Chat bubble sequence + analysis              | Analysis output        | Chat messages in gray        |
| **Feature: Competency**      | Grid/matrix with filled and empty cells      | Filled cells (mastery) | Empty cells (gaps)           |
| **Blog: Generic**            | Document + magnifying glass + node graph     | Core finding           | Supporting structure         |
| **Social: Quote**            | Large quotation marks + text lines           | Quotation marks        | Text lines in gray           |

### 6.6 Quality Checklist

Before publishing any generated or created illustration:

- [ ] **One focal point?** Can you point to exactly ONE coral element?
- [ ] **35%+ negative space?** Does the illustration breathe?
- [ ] **No banned elements?** No cartoons, mascots, lightbulbs, rockets?
- [ ] **Correct dimensions?** Matches the content type spec from Section 5.1?
- [ ] **Stroke consistency?** All lines same weight (within their tier)?
- [ ] **Color budget?** Coral covers max 15-20% of canvas?
- [ ] **Text-free?** Or if text is present, is it localizable?
- [ ] **On brand?** Does it feel like "expert mentor sharing insight"?
- [ ] **Scalable?** Does it work at 50% size without losing clarity?

---

## 7. Photography

**Bajkot does not use photography in its primary visual language.**

If photography is ever needed (press, partnerships, physical events):

- Black and white only, high contrast.
- People in professional contexts, candid (not posed).
- No stock photography. Ever.
- Treat photos as documentary, not promotional.

---

## 8. Data Visualization

When illustrating data, charts, or metrics:

| Element            | Color                     | Usage                        |
| ------------------ | ------------------------- | ---------------------------- |
| **Primary data**   | `#0f0f0f` (Ink)           | Main data series             |
| **Highlight data** | `#ff6b35` (Coral)         | Featured metric, key insight |
| **Secondary data** | `#737373` (Muted)         | Comparison, context          |
| **Grid / axes**    | `#e5e5e5` (Line)          | Background structure         |
| **Labels**         | `#525252` (Ink Secondary) | Axis labels, annotations     |

- Prefer bar charts and line charts. Avoid pie charts (hard to read accurately).
- Always label axes. Never rely on color alone for meaning.
- Keep grid lines light. Data should dominate, not the frame.

---

## 9. Do's and Don'ts

### Do

- Extend the icon language into illustration naturally.
- Use coral sparingly — it's the visual exclamation point.
- Leave space for the content around the illustration to breathe.
- Create variations for different segments (swap coral for segment accent).
- Test at multiple sizes before publishing.
- Keep illustrations concept-first: illustrate the idea, not the literal scene.

### Don't

- Don't fill entire compositions with color. Line work + white space is the identity.
- Don't mix illustration styles. Line art only.
- Don't use gradients within illustrations (the CTA button gradient is a UI exception, not an illustration pattern).
- Don't add drop shadows to illustration elements.
- Don't include detailed human faces or realistic body proportions.
- Don't create busy, "Where's Waldo" compositions.
- Don't use the coral and a segment accent in the same illustration.

---

## 10. Version History

| Version | Date        | Summary                                                                    | Author          |
| ------- | ----------- | -------------------------------------------------------------------------- | --------------- |
| 1.0     | 2026 Feb 13 | Initial publication. Style definition, AI prompt guide, composition rules. | Lukasz + Claude |
|         |             |                                                                            |                 |
