# LLM Pipeline — Quality Testing & Open Issues

> Work in progress. Merged from `README_llm_tests.md` + `tofix-pipeline.md`.

## Pipeline Overview

AITutoro generates personalized AI training content through a multi-stage LLM pipeline.
Quality depends on how well each stage uses the learner profile, selects relevant video content,
and produces copy that matches the editorial style guide.

The pipeline has **22 LLM calls** across 6 stages. Each call receives a system+user prompt pair.
Prompt templates live in two places:

1. **Code fallbacks** — `convex/lib/prompts.ts` (source of truth for development)
2. **Langfuse** — remote prompt management (production override when enabled)

### Current State

`USE_LANGFUSE_PROMPTS = false` in `convex/lib/prompts.ts`.

Langfuse prompts are **stale** — they predate the quality improvements made in the
`feat/corpus-preselection` branch. Specifically, Langfuse versions:

- Have "English" hardcoded instead of `{{LANGUAGE}}` — breaks non-English users
- Use binary beginner/advanced personalization (should be granular per-skill)
- Missing NEGATIVE PREFERENCES enforcement
- Missing LEARNING STYLE & TIME adaptation
- Missing EDITORIAL STYLE GUIDE injection
- Missing `skill_categories` in playbook schema
- Missing VIDEO REFERENCES in exercise generation
- Missing FULL PLAN USAGE instructions for handbook
- Missing prompt example quality bar
- Missing assessment summary injection into handbook

**Until Langfuse prompts are synced, all prompts run from code fallbacks.**

---

## Pipeline Stages & What To Test

### Stage 1: Intake (3 calls)

- `intakeXmlSystem` / `intakeXmlUser` — conversational profile building
- `intakeXmlStreamingSystem` — streaming variant
- **Test**: Does it collect all profile fields? Does it respect `{{LANGUAGE}}`?

### Stage 2: Scoring + Fluency (2 calls)

- `scoreSystem` — prompt quality evaluation (0-1)
- `inferAiFluencySystem` / `inferAiFluencyUser` — AI fluency score (0-100)
- **Test**: Are scores calibrated? Does fluency reference actual tools from profile?

### Stage 3: Assessment (1 call)

- `assessmentXmlSystem` / `assessmentXmlUser`
- **Test**: Does report reference specific profile data? Is it 180-300 words?

### Stage 4: Playbook (1 call, 2 variants)

- `playbookXmlSystem` / `playbookXmlUser` — standard
- `playbookXmlSystemVideoEnhanced` / `playbookXmlUserVideoEnhanced` — with video corpus
- **Test**:
  - Does outline reflect skill gaps from `<skillsSelfReport>`?
  - Are `negativePreferences` excluded from page topics?
  - Does `skill_categories` array match the page content?
  - (video) Are `videoSegments` selected with matching `skill_category` and `difficulty_level`?

### Stage 5: Handbook (1 call per page x 6 pages, 2 variants)

- `handbookSystem` / `handbookUser` — standard
- `handbookSystemVideoEnhanced` / `handbookUserVideoEnhanced` — with video embeds
- **Test**:
  - Is vocabulary adapted to seniority (not generic)?
  - Does content reference the learner's specific tools and role?
  - Are `negativePreferences` respected (no excluded topics)?
  - Does `fullPlan` data appear as content backbone (not ignored)?
  - Is `assessmentSummary` used to contextualize recommendations?
  - (video) Are `:::video{...}:::` embeds placed after concept explanations?
  - (video) Do embeds use correct `startSeconds`/`endSeconds` from corpus?
  - (video) Max 2 video embeds per chapter?

### Stage 6: Exercises (1 call per chapter x 3 per page)

- `exerciseGenerationSystem` / `exerciseGenerationUser`
- `exerciseEvaluationSystem` / `exerciseEvaluationUser`
- **Test**:
  - Is exercise type appropriate for chapter content?
  - Does difficulty match learner's skill level (not binary)?
  - Do exercises reference video demonstrations when chapter has them?
  - Is rubric specific (not generic "good effort" criteria)?

---

## Quality Dimensions

| Dimension                | What to check                                                                  |
| ------------------------ | ------------------------------------------------------------------------------ |
| **Profile matching**     | Does content reference the learner's tools, role, seniority, artifacts, goals? |
| **Negative preferences** | Are excluded topics truly absent?                                              |
| **Skill adaptation**     | Is difficulty granular (per-skill <=2/5, 3/5, >=4/5) not binary?              |
| **Video selection**      | Do embedded videos match chapter topic by `skill_category`?                    |
| **Video difficulty**     | Does `difficulty_level` match learner profile?                                 |
| **Copy quality**         | Short sentences, active voice, no filler words, no "AI is transforming..."?    |
| **Prompt examples**      | Are they complete templates with `{{PLACEHOLDERS}}`? Not one-liners?           |
| **Content backbone**     | Does handbook follow `fullPlan` blocks structure?                              |
| **Assessment context**   | Does handbook reflect assessment findings?                                     |
| **Language**             | Is content in the learner's preferred language?                                |

---

## Open Issues (TODO)

### HIGH Priority

#### 1. Brak twardej walidacji struktury odpowiedzi LLM przed zapisem
- `convex/lib/llmClient.ts:37` (`expect`) jest deklarowane, ale nie wymusza runtime walidacji shape.
- `convex/lib/llmClient.ts:118` parsuje JSON, ale nie waliduje kontraktu domenowego.
- `convex/courseAi.ts:123` i `convex/ai.ts:323` zapisuja wynik LLM do trwalych struktur.
- **Fix**: Dodac walidacje Zod dla playbook, handbook, exercise payload. Kontrolowany fallback + logowanie przy bledzie.

#### 2. `videoEnhanced` moze byc uzyte ze stara wartoscia (stale closure) w UI
- `src/components/steps/PlanStep.tsx:91` uzywa `videoEnhanced`, ale dependency callbacku nie zawiera `videoEnhanced`.
- `src/components/steps/CoursePreviewStep.tsx:50` i `:69` analogicznie.
- **Fix**: Uzupelnic dependency arrays o `videoEnhanced`. Test e2e: porownanie zachowania ON/OFF.

### MEDIUM Priority

#### 3. Fallbacki generuja sie po angielsku i bez lokalizacji usera
- `convex/courseAi.ts:364` (`defaultHandbook`) i `convex/ai.ts:334` (`defaultPlaybook`) maja staly EN.
- **Fix**: Parametryzowac fallbacki przez `language`. Mapa szablonow EN/PL/DE.

#### 4. Niespojnosc kontraktu liczby modulow (prompt 6 vs fallback 5)
- Prompt wymaga 6 stron, fallback zwraca 5.
- **Fix**: `defaultPlaybook()` na 6 modulow + walidacja `outline.length === 6`.

#### 5. Drift promptow video-enhanced (martwe/nieuzywane sciezki)
- Dedykowane template'y video-enhanced istnieja ale runtime uzywa standardowych.
- `MODULE_HINTS_JSON` w schema ale nie jest przekazywane.
- **Fix**: Jawnie przelaczac na template video-enhanced przy `videoEnhanced=true`, albo usunac deprecated.

#### 6. Brak limitowania rozmiaru corpusu w promptach
- Status: `ACCEPTED RISK` — na teraz zarzadzanie manualne.
- Future: top-k/retrieval (RAG-like) jesli zacznie bolec koszt/jakosc.

### LOW Priority

#### 7. Parser znacznikow wideo jest kruchy na odchylenia formatu
- `src/components/course/HandbookContent.tsx:37` — regex + parsowanie atrybutow.
- **Fix**: Uodpornic parser, dodac testy komponentowe.

#### 8. Prompt video-segment-extraction — brakujace few-shoty i cleanup Gemini
- Prompt ma tylko 1 few-shot (BAD vs GOOD), stary skrypt mial 6.
- Pliki Gemini nie sa kasowane po przetworzeniu.
- `finish_reason: MAX_TOKENS` na chunkach z duza liczba interakcji.
- **Fix**: Dodac 4-6 few-shot, cleanup plikow Gemini, zmniejszyc chunk lub podniesc `maxOutputTokens`.

---

## Decyzje produktowe (ustalone)

1. Docelowa liczba modulow w planie: **6**.
2. Fallbacki i tresci awaryjne maja byc w **jezyku wybranym w UX**.
3. Dwie sciezki: bez wideo / z wideo — kontrolowane flaga `videoEnhanced` per user.
4. Na teraz: **bez twardego limitu corpusu** (zarzadzanie reczne).

---

## Test Procedure

### Manual End-to-End Test

1. Go through the full intake flow with a test persona
2. Complete skill verification
3. Wait for assessment + playbook generation
4. Generate course (with `videoEnhanced: true` if testing video path)
5. Read generated handbooks and exercises

### Prompt Dump (for Claude Code analysis)

```bash
npx convex run admin/debugPrompts:dumpAll
npx convex run admin/debugPrompts:dumpOne '{"template": "handbookSystem"}'
```

### Test Personas

**Persona A — CTO Marek (advanced)**
- Tools: Claude Pro, Cursor, ChatGPT Plus, Gemini Advanced
- Role: CTO, seniority: executive
- Skills: prompting 4/5, evaluation 3/5, contextWindow 4/5, safety 2/5
- Needs: team AI strategy, prompt engineering frameworks
- Negative: "no basic tutorials, no beginner content"
- Language: Polish

**Persona B — Junior HR Kasia (beginner)**
- Tools: ChatGPT free
- Role: HR specialist, seniority: junior
- Skills: prompting 1/5, evaluation 1/5, contextWindow 1/5, safety 1/5
- Needs: recruitment automation, candidate communication
- Language: Polish

Both personas should produce visibly different content at every stage.

---

## Langfuse Sync Procedure

1. Run `npx convex run admin/debugPrompts:dumpAll` to get current fallback content
2. For each prompt marked `[fallback]` — update the Langfuse version to match
3. Ensure all `{{PLACEHOLDER}}` variables are preserved (not hardcoded)
4. Set `USE_LANGFUSE_PROMPTS = true` in `convex/lib/prompts.ts`
5. Run the test procedure above to verify Langfuse versions produce same quality
6. Alternatively, use `/langfuse-prompts` skill to push code fallbacks to Langfuse

---

## Key Files

| File                                 | Purpose                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `convex/lib/prompts.ts`              | All prompt templates + `USE_LANGFUSE_PROMPTS` kill switch              |
| `convex/lib/editorialGuide.ts`       | Editorial style guide injected into system prompts                     |
| `convex/lib/profileXml.ts`           | Profile XML helpers + `buildProfileSummary()`                          |
| `convex/lib/corpusPreselection.ts`   | Video segment preselection + `buildCorpusFromVideoSegments()`          |
| `convex/courseAi.ts`                 | Handbook generation (with assessment summary + video pass-through)     |
| `convex/exerciseAi.ts`               | Exercise generation (with video markers + profile summary)             |
| `convex/ai.ts`                       | Intake, scoring, assessment, playbook generation                       |
| `convex/admin/debugPrompts.ts`       | Prompt dump utility for analysis                                       |
| `convex/lib/config.ts`               | `USE_LANGFUSE_PROMPTS` also in ConfigKey enum (for admin UI reference) |
| `docs/analysis-content-quality.html` | Previous quality audit with scoring and fix priorities                  |

## Improvement History

### feat/corpus-preselection branch (13 items)

1. Removed `profileXml.slice(0, 800)` — full profile everywhere
2. Full profile in preselection and exercise generation
3. NEGATIVE PREFERENCES enforcement in all generation prompts
4. LEARNING STYLE & TIME instructions in all generation prompts
5. Granular per-skill personalization (replaced binary beginner/advanced)
6. fullPlan -> Handbook backbone instructions
7. `skill_categories` in playbook output schema
8. Playbook videoSegments pass-through to handbook (skip double preselection)
9. maxSegments lowered to 8 for handbook
10. Prompt example quality bar in editorial guide
11. Exercise content limit increased to 4000 chars + `buildProfileSummary()`
12. Video markers passed to exercise generation
13. Assessment summary injected into handbook context (via `ASSESSMENT_SUMMARY` placeholder in both HandbookUser prompts)

### Content quality audit (6 items)

1. Video segment validation + dedup (min 5s, >80% overlap filtering)
2. Missing 6th handbook enforcement (warning log + prompt reinforcement)
3. Handbook prompt quality (paragraph max 2 sentences, opener blacklist, title consistency, skill-level adaptation)
4. Debug content exercises (pageTitle in query, empty state messaging)
5. Schema + dependencies (toolPreferences, assessmentReport, remark-gfm)
6. Assessment summary injection into handbook generation context
