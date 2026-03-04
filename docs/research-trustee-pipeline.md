# Research: trustee-book-pipeline Codebase Analysis

> Comprehensive analysis of `../trustee-book-pipeline/demo/` for porting to bajkot (Convex + React + Vite).

---

## 1. Data Model

### Current: SQLite via Turso + Drizzle ORM

Single table only — prompts are the only persisted data. Everything else lives as JSON files on disk.

**`prompts` table** (`demo/src/db/schema.ts`):
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | auto-increment |
| filename | text UNIQUE | e.g. `A1_child_profiler.md` |
| agent_name | text | extracted from `# heading` |
| content | text | full prompt markdown |
| is_modified | integer(0/1) | tracks if edited via UI |
| updated_at | text | timestamp |

**File-based artifacts per order** (written to `demo/output/{order_id}/`):

| File | Producer | Consumers |
|------|----------|-----------|
| `order.json` | A0 | A1, A2, A4 |
| `character_profile.json` | A1 | A2, A3, A5, A6, A8, A9, A10 |
| `story_blueprint.json` | A2 | A3, A4, A5 |
| `story_draft.json` | A3 | A4, A5, A9, A10 |
| `psych_review.json` | A4 | orchestrator |
| `illustration_plan.json` | A5 | A6, A7, A8 |
| `ref_metadata.json` | A6 | A6b |
| `character_ref_style_a.png` | A6 | A6b, A7 |
| `character_ref_style_b.png` | A6 | A6b |
| `illustrations/*.png` (7 files) | A7 | A8, A9 |
| `visual_qa.json` | A8 | A10 |
| `book.pdf` | A9 | A10, A11 |
| `final_qa.json` | A10 | A11 |

### Key data types (TypeScript interfaces)

**`FormData`** (A0 input — from web form):
- child_name, age_bracket (`3-5`|`6-8`|`9+`), gender (`boy`|`girl`)
- problem_id (from closed list of 15 problems)
- problem_detail? (free text, max 500 chars)
- favorite_toy? (max 100 chars)
- glasses? (`yes`|`no`)
- hair_color, hair_style, eye_color, skin_tone, outfit (all from dropdown maps)
- email?

**`Order`** (A0 output):
- order_id (UUID), created_at, status
- child: { name, age_bracket, gender, appearance: { hair_color, hair_style, hair_description_en, eye_color, skin_tone, outfit_pl, outfit_en, glasses } }
- problem: { id, title_pl, context_pl, metaphor_pl, category, detail? }
- guide_seed?: { favorite_toy? }
- contact?: { email? }
- preferences: { language: 'pl' }

**`CharacterProfile`** (A1 output):
- child_character: { name, age_bracket, description_pl, description_en, visual_anchor, personality_sketch }
- guide_character: { name, description_pl, description_en, role }
- art_style_spec: { style, modifiers, mood_palette[] }
- character_reference_prompt: string

**`StoryBlueprint`** (A2 output):
- title, subtitle, arc_type, target_total_words
- beats[6]: { beat_number, beat_name, emotional_beat, therapeutic_element, word_budget, summary_pl, summary_en, visual_direction, key_dialogue }
- old_strategy, new_strategy
- actionable_takeaway: { strategy_name_pl, how_to_pl, strategy_name_en }
- parent_questions[3]
- pages_plan[]: { page_number, content_type, beat_ref, illustration_id }

**`StoryDraft`** (A3 output):
- title, dedication, cover_blurb
- scenes[6]: { beat_number, text_pl, word_count }
- parent_card: { title, intro_pl, questions[], activity_pl }
- total_word_count

**`PsychReview`** (A4 output):
- status: `PASS` | `PASS_WITH_CORRECTIONS` | `FAIL`
- summary, checks (6 check categories), corrections[], confidence

**`IllustrationPlan`** (A5 output):
- total_illustrations, aspect_ratios, character_description_en, guide_description_en, visual_anchor
- illustrations[7]: { id, scene_ref, aspect_ratio, composition, mood, prompt, negative_prompt, visual_anchor_visible, characters_present[] }

**`VisualQA`** (A8 output):
- status: `PASS` | `REGENERATE` | `ESCALATE`
- overall_consistency_score, images[] with scores, summary, confidence

**`FinalQA`** (A10 output):
- status: `PASS` | `MINOR_ISSUES` | `FAIL`
- page_count, checks (5 categories), overall_quality_score, recommendation, confidence

---

## 2. Agent Specifications

### A0 — Intake (Code only, no LLM)
- **Input:** FormData from web form
- **Output:** Order JSON + creates output directory
- **Logic:** Validates all fields against closed lists (problems, hair/eye/skin/outfit maps), generates UUID, builds normalized Order object
- **Dependencies:** `data/problems.ts` (maps of PL->EN values + problem definitions)
- **LLM:** None

### A1 — Child Profiler (LLM)
- **Input:** Order
- **Output:** CharacterProfile
- **LLM call:** `chatJsonWithRetries` — system prompt from `A1_child_profiler.md` with `{{order_json}}` and `{{ART_STYLE_SPEC}}` substituted, user message: "Generate the character profile..."
- **Temperature:** 0.7
- **Key behavior:** Creates child+guide character descriptions in PL and EN, selects visual anchor, generates character reference prompt. Uses STYLE_A as default art style.

### A2 — Story Architect (LLM)
- **Input:** Order + CharacterProfile
- **Output:** StoryBlueprint
- **LLM call:** system prompt with `{{order_json}}` and `{{character_profile}}`
- **Temperature:** 0.6
- **Key behavior:** Designs 6-beat Aristotelian narrative arc with word budgets, therapeutic elements, visual directions. Modified Aristotle: Exposition -> Inciting Incident -> Hamartia -> Peripeteia+Anagnorisis -> Triumph -> Catharsis.

### A3 — Story Writer (LLM)
- **Input:** StoryBlueprint + CharacterProfile + optional corrections
- **Output:** StoryDraft
- **LLM call:** system prompt with `{{story_blueprint}}` + `{{character_profile}}`, user includes explicit JSON schema
- **Temperature:** 0.8
- **Key behavior:** Writes full Polish prose. Has extensive `normalizeScenes()` function to handle LLM output variations (scenes vs story_text vs beats arrays). Supports retry with corrections from A4. Age-appropriate language rules enforced via prompt.

### A4 — Psych Reviewer (LLM)
- **Input:** StoryDraft + StoryBlueprint + Order + CharacterProfile
- **Output:** PsychReview
- **LLM call:** system prompt with all 4 data sources
- **Temperature:** 0.3
- **Key behavior:** Adversarial safety gate. Checks: safety scan, therapeutic structure (6 beats), metaphor coherence, personalization accuracy, language appropriateness, emotional calibration. Returns PASS/PASS_WITH_CORRECTIONS/FAIL. Has `applyCorrections()` function for inline text replacement.

### A5 — Art Director (LLM)
- **Input:** StoryDraft + CharacterProfile + StoryBlueprint
- **Output:** IllustrationPlan
- **LLM call:** system prompt with 3 data sources + art style vars, user message includes explicit JSON schema for 7 illustrations
- **Temperature:** 0.6
- **Max retries:** 4 (more than default)
- **Key behavior:** Plans 7 illustrations (cover + 6 scenes). Writes detailed image generation prompts in English. Extensive normalization of LLM output field names.

### A6 — Character Designer (Image generation, no LLM text)
- **Input:** CharacterProfile
- **Output:** RefMetadata + 2 PNG images
- **Image API:** Gemini `gemini-2.5-flash-image` via REST
- **Key behavior:** Generates 2 character reference images — one in Style A (Rocio Bonilla mixed media) and one in Style B (Jona Jung watercolor). Uses `generateImage()` which falls back to colored placeholder rectangles if API unavailable.

### A6b — Style Vote (Human-in-the-loop, no LLM)
- **Input:** RefMetadata + orderId
- **Output:** StyleChoice
- **Key behavior:** Emits SSE event with image URLs for frontend to show style picker. Waits for parent POST to `/api/vote/:orderId`. 15-minute timeout defaults to Style A. Uses Promise + in-memory Map for pending votes.
- **Important:** This is the only human interaction point in the pipeline.

### A7 — Illustrator (Image generation, no LLM text)
- **Input:** IllustrationPlan + StyleChoice
- **Output:** SceneImages (7 PNG files)
- **Image API:** Gemini `gemini-2.5-flash-image`
- **Key behavior:** Builds consistency preamble (style + character descriptions + visual anchor) prepended to every prompt. Cover is portrait (600x900), scenes are landscape (900x600). Sequential generation with rate limiting.

### A8 — Visual QA (LLM, demo mode — text only, no vision)
- **Input:** IllustrationPlan + CharacterProfile + SceneImages
- **Output:** VisualQA
- **LLM call:** Inline system prompt (not from file), evaluates illustration plan descriptions for consistency
- **Temperature:** 0.3
- **Key behavior:** In demo mode, does NOT actually analyze images. Evaluates text consistency of prompts instead. Checks character descriptions, visual anchor mentions, guide presence rules.

### A9 — Book Composer (Code only, PDFKit)
- **Input:** StoryDraft + SceneImages + CharacterProfile
- **Output:** PDF file path
- **Key behavior:** 16-page PDF (210mm square):
  - Page 1: Cover (full-bleed image + title overlay)
  - Page 2: Dedication
  - Pages 3-14: 6 beats x 2 pages each (illustration + text)
  - Page 15: Parent card
  - Page 16: Back cover
- Uses `canvas` for image optimization (PNG -> JPEG compression)
- Font size varies by age bracket: 3-5 (18pt), 6-8 (14pt), 9+ (12pt)
- Resolves system fonts for Polish diacritics support

### A10 — Final QA (LLM, demo mode — text only)
- **Input:** StoryDraft + CharacterProfile + IllustrationPlan + VisualQA
- **Output:** FinalQA
- **LLM call:** Inline system prompt (demo mode), evaluates source data not actual PDF
- **Temperature:** 0.2
- **Key behavior:** Checks personalization, completeness, text-image coherence, content safety. Returns PASS/MINOR_ISSUES/FAIL with quality score and recommendation.

### A11 — Delivery (Code only)
- **Input:** Order + pdfPath + FinalQA
- **Output:** DeliveryResult { download_url, order_id, status }
- **Key behavior:** Simply logs completion and returns download URL. In demo, no email/storage — just serves the PDF via Express.

---

## 3. Pipeline Orchestration Pattern

### Architecture: Sequential with parallel tracks

The pipeline is a single `runPipeline()` function in `demo/src/pipeline.ts` that runs agents in sequence with one parallel fork:

```
A0 (code) -> A1 (LLM) -> FORK:
  Track 1 (story):  A2 -> A3 <-> A4 (retry loop) -> A5
  Track 2 (images): A6 -> A6b (human wait)
JOIN -> A7 -> A8 -> A9 -> A10 -> A11
```

### Parallel execution:
- After A1, Track 1 (A2->A3->A4->A5) and Track 2 (A6->A6b) run **simultaneously**
- Track 2 starts immediately (`const imageTrack = (async () => {...})()`)
- Both tracks join before A7: `const style = await imageTrack`

### A3/A4 retry loop:
- Max 3 attempts
- On PASS: break
- On PASS_WITH_CORRECTIONS: apply corrections via `a4.applyCorrections()` and break
- On FAIL: loop back to A3 with corrections as additional input
- After max retries: proceed anyway (demo mode)

### Progress reporting:
- `ProgressCallback` emits `(agent, message, extra?)` at start and end of each agent
- Forwarded to SSE clients via `emitSSE(orderId, 'progress', data)`
- Additional `StyleVoteCallback` and `LlmDebugCallback` for specialized events

### Error handling:
- Each agent catches and logs errors
- A3/A4 loop catches errors and retries
- Pipeline-level errors emit SSE error event
- No persistent job queue — pipeline runs as in-memory async function

---

## 4. Image Generation Approach

### Primary: Gemini Flash Image (`gemini-2.5-flash-image`)

**`demo/src/lib/geminiImageGen.ts`:**
- Direct REST API calls to `generativelanguage.googleapis.com/v1beta/models`
- `responseModalities: ["IMAGE"]` — native image generation
- Rate limiting: 2-second minimum interval between calls
- 3 retry attempts with exponential backoff (5s between, 30s on 429)
- Extracts base64 image data from response `candidates[].content.parts[].inlineData`

**Fallback: Placeholder images** (`demo/src/lib/imageGenerator.ts`):
- Colored rectangles with diagonal lines and text labels
- Style A: coral (#E07A5F), Style B: teal (#81B29A), neutral: sand (#F2CC8F)
- Generated via `node-canvas`

### Style system (2 options presented to parent):

**Style A** — "Mixed Media Illustration (Rocio Bonilla)":
- Thick black ink outlines, paper collage textures, flat color fills
- Limited palette (3-4 colors), geometric shapes, scrapbook aesthetic

**Style B** — "Ecoline & Colored Pencil Illustration (Jona Jung)":
- No outlines, wet watercolor technique, full rainbow palette
- Dreamy ethereal atmosphere, paint drips and granulation effects

### Image pipeline flow:
1. A6 generates 2 reference images (child in Style A and Style B) — 512x512
2. A6b presents both to parent, waits for choice
3. A7 generates 7 scene illustrations in chosen style
   - Builds consistency preamble from style + character descriptions
   - Cover: 600x900 (portrait), Scenes: 900x600 (landscape)

### Production proposal (from AGENT_PIPELINE_PROPOSAL.md):
- MVP: GPT-4o native images (~$0.25/book for 7 images)
- V2: Midjourney v7 with --cref (best consistency)
- V3: Flux Pro + IP-Adapter (cheapest at scale, needs GPU)

---

## 5. PDF Composition Approach

### Technology: PDFKit (`pdfkit` npm package)

**`demo/src/agents/a9_book_composer.ts`:**

- 210mm x 210mm square format (standard children's book)
- 40pt margins, content width = PAGE_SIZE - 80pt

**Page layout (16 pages):**
| Page | Content |
|------|---------|
| 1 | Cover — full-bleed illustration + title overlay (white semi-transparent bands) |
| 2 | Dedication — title + dedication text centered |
| 3-14 | 6 story beats x 2 pages: odd=illustration (full page), even=text (vertically centered) |
| 15 | Parent card — questions + activity |
| 16 | Back cover — blurb + copyright |

**Image optimization:**
- Uses `canvas` (node-canvas) to resize and re-encode images
- PNG -> JPEG at 0.75 quality
- Cover: max 800px, interior: max 1200px
- Keeps optimized buffers in `Map<string, Buffer>` cache

**Typography:**
- Resolves platform-specific fonts (NotoSans on Linux, Arial Unicode on macOS)
- Falls back to Helvetica built-in
- Font sizes by age: 3-5 (body:18, title:28), 6-8 (body:14, title:24), 9+ (body:12, title:22)

**Colors:**
- Background: #FFFBF5 (warm cream)
- Text: #2D2D2D (soft black)
- Accent: from `art_style_spec.mood_palette[0]` or #E07A5F

---

## 6. Error Handling / Retry Pattern

### LLM Client (`demo/src/lib/llmClient.ts`)

**`chatJsonWithRetries<T>(params, retries=3, baseDelayMs=1000)`:**
- Uses `@ai-sdk/google` with `generateText()` (Vercel AI SDK)
- Default model: `gemini-2.5-flash`
- Exponential backoff: 1s, 2s, 4s

**JSON extraction pipeline:**
1. Strip code fences (`\`\`\`json...\`\`\``)
2. Try `JSON.parse(stripped)`
3. On failure: `tryExtractJson()` — regex for first `{...}` or `[...]`
4. Parse extracted text
5. On failure: throw

**Non-retryable errors:**
- Content safety blocks (`PROHIBITED_CONTENT`, `SAFETY`)
- Auth errors (401, 403)
- Explicit `isRetryable === false`

**Debug callback:**
- Optional `LlmDebugCallback` captures: agent name, system/user prompts, model, temperature, raw/parsed response, errors, attempt count, duration

### Image generation retry:
- 3 attempts with 5s between
- Special handling for 429 (rate limit): wait 30s * attempt
- Falls back to placeholder on all-fail

### Pipeline-level retry:
- A3/A4 loop: max 3 iterations
- No retry for other agents
- On A4 FAIL after max retries: proceed anyway (demo mode)

### No persistent job queue:
- Pipeline runs as a single async function
- If server restarts, in-progress orders are lost
- SSE connections are in-memory Maps

---

## 7. Server Architecture

### Express.js (`demo/src/server.ts`)

**Authentication:**
- Simple password-based: `APP_PASSWORD` env var -> SHA256 hash -> first 16 chars as token
- Token checked via `x-auth-token` header or `?token=` query param
- Login page at `/login`, auth POST to `/api/auth`

**SSE (Server-Sent Events):**
- `sseClients` Map: orderId -> Response[]
- Events: `connected`, `progress`, `style_vote`, `llm_debug`, `complete`, `error`
- Client connects to `GET /api/progress/:orderId`

**Key routes:**
| Route | Purpose |
|-------|---------|
| `POST /api/start` | Start pipeline (returns orderId, runs pipeline in background) |
| `GET /api/progress/:orderId` | SSE stream |
| `POST /api/vote/:orderId` | Submit style vote |
| `GET /download/:orderId` | Download finished PDF |
| `GET /api/style-images/:orderId/:filename` | Serve style reference images |
| `GET/PUT /api/prompts/:filename` | Prompt editor CRUD |
| `POST /api/prompts/reset-all` | Reset all prompts to file originals |

**Prompt editor:**
- Full CRUD for prompts stored in Turso DB
- Reset individual or all prompts from .md files
- Tracks `is_modified` flag
- Extracts `{{variables}}` for display

**Views (HTML):**
- `form.html` — order form with all dropdowns
- `progress.html` — SSE-driven progress display with style vote UI
- `done.html` — completion page with download link
- `login.html` — password entry
- `prompts.html` — prompt editor UI

---

## 8. Prompt System

### Prompt loading (`demo/src/lib/promptLoader.ts`):
1. Try Turso DB first (if configured)
2. Fall back to `.md` files from `prompts/` directory
3. Parse: extract text between ` ```...``` ` after `## System Prompt` heading
4. `substituteVars()`: replaces `{{key}}` with values from vars dict

### Prompt template variables used across agents:
| Variable | Source | Used by |
|----------|--------|---------|
| `{{order_json}}` | A0 | A1, A2, A4 |
| `{{character_profile}}` | A1 | A2, A3, A5 |
| `{{story_blueprint}}` | A2 | A3, A4 |
| `{{story_draft}}` | A3 | A4, A5 |
| `{{ART_STYLE_SPEC}}` | config | A1 |
| `{{art_style_spec.style}}` | profile | A5 |
| `{{art_style_spec.modifiers}}` | profile | A5 |

### All prompt files (in `prompts/`):
| File | Lines | Has system prompt | Variables |
|------|-------|-------------------|-----------|
| A0_intake.md | 170 | No (code spec) | — |
| A1_child_profiler.md | 188 | Yes | order_json, ART_STYLE_SPEC |
| A2_story_architect.md | 210 | Yes | order_json, character_profile |
| A3_story_writer.md | 272 | Yes | story_blueprint, character_profile |
| A4_psych_reviewer.md | 249 | Yes | story_draft, story_blueprint, character_profile, order_json |
| A5_art_director.md | 222 | Yes | character_profile, story_blueprint, story_draft, art_style_spec.* |
| A6_character_designer.md | 241 | Partial (template) | character_profile.* fields |
| A6b_style_vote.md | 212 | No (UX spec) | — |
| A7_illustrator.md | 241 | Partial (template) | art_style_spec.*, illustration_plan.* |
| A8_visual_qa.md | 219 | Yes | illustration_plan.*, character refs |
| A9_book_composer.md | 345 | No (code spec) | — |
| A10_final_qa.md | 184 | Yes | book_pdf, story_draft, character_profile, illustration_plan |
| A11_delivery.md | 140 | No (code spec) | — |
| PIPELINE_INDEX.md | 151 | No (reference) | — |

---

## 9. Problem / Content Data

### 15 predefined problems in 5 categories (`data/problems.ts`):

**fears:** fear_of_dark, fear_of_doctor, fear_of_separation, fear_of_monsters
**emotions:** tantrums, jealousy_sibling, low_self_esteem
**social:** shyness, sharing_difficulty, bullying
**routine:** picky_eating, potty_training, screen_addiction
**change:** new_sibling, moving_house

Each problem has: `title_pl`, `context_pl` (therapeutic context for LLM), `metaphor_pl` (metaphor + guide character seed), `category`.

### Appearance dropdown maps:
- 6 hair colors, 8 hair styles, 5 eye colors, 4 skin tones, 10 outfits
- All map PL keys to EN descriptions
- Outfits have both PL and EN descriptions

### Art style definitions:
- STYLE_A: "Rocio Bonilla" — bold mixed-media, thick outlines, paper collage
- STYLE_B: "Jona Jung" — soft watercolor, no outlines, dreamy

---

## 10. What Can Be Directly Reused vs Needs Rewriting

### DIRECTLY REUSABLE (copy or minor adaptation):

1. **All prompt .md files** — can be stored as string constants in Convex. The prompt loading system from Turso/files needs rewriting, but the prompt *content* is production-ready.

2. **TypeScript interfaces** — `FormData`, `Order`, `CharacterProfile`, `StoryBlueprint`, `StoryDraft`, `PsychReview`, `IllustrationPlan`, `VisualQA`, `FinalQA`, `DeliveryResult` — can be converted to Convex validators (`v.object({...})`).

3. **Data maps** (`problems.ts`) — `PROBLEMS`, `HAIR_COLOR_MAP`, `HAIR_STYLE_MAP`, etc. — copy directly. `STYLE_A` and `STYLE_B` — copy directly.

4. **JSON utilities** (`jsonUtils.ts`) — `stripCodeFences`, `tryExtractJson`, `safeParseJson` — copy directly.

5. **A4's `applyCorrections()` function** — pure logic, no dependencies.

6. **A3's `normalizeScenes()` function** — handles LLM output variations, very useful.

7. **Pipeline orchestration logic** — the parallel tracks pattern and A3/A4 retry loop.

### NEEDS REWRITING for Convex:

1. **LLM Client** — currently uses `@ai-sdk/google` with `generateText()`. Needs to be rewritten for Convex actions using either the same SDK or direct API calls. Key: Convex actions can run Node.js, so `@ai-sdk/google` should work in `"use node"` actions.

2. **Image generation** — `geminiImageGen.ts` uses raw `fetch()` to Gemini REST API. Works in Convex actions. The `node-canvas` dependency for placeholder images and JPEG optimization may NOT work in Convex runtime (native C++ addon). Need alternative for placeholder generation.

3. **PDF generation** — `pdfkit` and `canvas` are native Node.js addons. May not work in Convex's serverless environment. Options:
   - Use Convex actions with `"use node"` — test if PDFKit works
   - Generate PDF client-side
   - Use a third-party PDF service
   - Store raw data and generate on download

4. **File storage** — currently `writeFileSync()` to local disk. Convex has its own file storage API. All image and PDF artifacts need to use Convex storage.

5. **SSE progress** — currently Express SSE with in-memory Map. Convex has real-time subscriptions via queries. Progress state should be stored in a Convex table that the frontend subscribes to.

6. **Style vote** — currently in-memory Promise with Express route. Needs to become a Convex mutation that the frontend calls, with the pipeline checking for it via query/polling.

7. **Prompt storage** — Turso -> Convex table. Simple migration.

8. **Server/routes** — Express -> Convex HTTP routes + mutations/actions.

### Architecture decisions needed:

1. **Long-running pipeline**: The pipeline takes 3-15 minutes. Convex actions have a 10-minute timeout (or configurable). Options:
   - Run the entire pipeline as a chain of scheduled actions
   - Each agent is a separate Convex action, orchestrated by mutations that schedule the next step
   - Store intermediate results in Convex tables

2. **Image storage**: Use Convex file storage for PNG/PDF artifacts. Each agent stores its output, next agent reads it.

3. **Progress tracking**: Use a Convex `pipelineProgress` table with agent status, messages, and timestamps. Frontend subscribes to this table for real-time updates.

4. **Style vote**: Instead of in-memory Promise, store vote state in DB. Pipeline polls or uses a scheduled function that checks for the vote.

5. **Native addons**: `canvas` (node-canvas) and `pdfkit` use C++ addons. Test if they work in Convex's Node.js runtime. If not, consider:
   - `@react-pdf/renderer` for PDF (pure JS)
   - Skip image optimization (use PNGs directly)
   - Use a cloud function (AWS Lambda) for PDF generation if needed

---

## 11. Narrative Structure Reference

The pipeline implements a **6-beat modified Aristotelian arc** specifically designed for therapeutic children's stories:

| Beat | Name | Psychological Function | Rule |
|------|------|----------------------|------|
| 1 | Exposition (Safe Base) | Bowlby: attachment security | Warm BEFORE scary |
| 2 | Inciting Incident | Validation: "it's OK to feel" | NAME the emotion |
| 3 | Hamartia (Old Strategy Fails) | Vygotsky: ZPD opening | No judgment on old way |
| 4 | Peripeteia + Anagnorisis | Scaffolding + Reframe | Guide ASKS, doesn't tell |
| 5 | Triumph | Bandura: self-efficacy | CHILD acts, not Guide |
| 6 | Catharsis | Emotional integration | Sensory calm, not lesson |

**3 quality gates:**
- A4 (Psych Reviewer) — blocks on FAIL, max 2 retries
- A8 (Visual QA) — blocks on REGENERATE, max 3 retries per image
- A10 (Final QA) — blocks on FAIL, routes to responsible agent

---

## 12. Dependencies

### npm packages used by demo:

| Package | Purpose | Convex compatible? |
|---------|---------|-------------------|
| `ai` + `@ai-sdk/google` | LLM calls via Vercel AI SDK | Yes (in `"use node"` actions) |
| `pdfkit` | PDF generation | Needs testing (native addon dependencies) |
| `canvas` | Image manipulation, placeholders | Likely NOT (C++ addon) |
| `express` | HTTP server | Not needed (Convex handles) |
| `uuid` | UUID generation | Yes, or use Convex's built-in IDs |
| `drizzle-orm` + `@libsql/client` | Turso DB | Not needed (Convex replaces) |
| `dotenv` | Env vars | Not needed (Convex env vars) |

---

## 13. Output Example Analysis

Examined order `e23f94c0` — a complete pipeline run:

- **Child:** Gustaw, 3-5, boy, blonde curly hair, blue eyes, olive skin, glasses, purple hoodie
- **Problem:** tantrums (napady zlosci)
- **Guide character:** Smok Babelek (small rainbow soap bubble dragon)
- **Story:** "Gustaw i Smok Babelek" — 761 words total, 6 beats
- **Images:** 2 style references (Gemini-generated, ~1.7MB each) + 7 scene illustrations
- **PDF:** 1.4MB final book
- **QA:** Both visual QA and final QA passed

The output demonstrates the full pipeline working end-to-end with Gemini Flash for both text and image generation.
