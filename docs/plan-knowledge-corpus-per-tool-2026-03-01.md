# Plan: Knowledge Corpus per Tool — przeróbka pipeline'u

**Data:** 2026-03-01
**Problem:** Content generowany przez LLM bazuje na training data (~styczeń 2025). Narzędzia AI zmieniły się od tego czasu wielokrotnie. User dostaje nieaktualny kurs.
**Rozwiązanie:** Zamknięta lista narzędzi, każde z curated knowledge corpus (Markdown) + video corpus (istniejący). Deterministyczne wstrzykiwanie do pipeline'u na bazie profilu usera.

---

## 1. Co sądzę

To jest dobre podejście. Oto dlaczego:

**Trafione:**
- Curated corpus > web search. Kontrolujesz jakość, aktualność, pokrycie.
- Indeksowanie po nazwie narzędzia — proste, deterministyczne, debugowalne.
- `npm run upload-corpus` — dev-friendly workflow. Markdown w repo = wersjonowane, diffowalne, review-owalne.
- Playbook jako punkt decyzyjny "jakie narzędzia" — logiczne miejsce. Profil mówi czego user używa, playbook decyduje czego powinien się nauczyć.
- Mix narzędzia + zasady w modułach — to jest USP. Nie "kurs z ChatGPT" tylko "jak nauczyciel może używać NotebookLM do lekcji i ElevenLabs do podcastów".

**Mocne strony vs alternatywy:**
- Zero nowej infrastruktury (brak vector DB, brak Agent SDK, brak graph DB)
- Deterministyczne — ten sam profil = te same korpusy = powtarzalny wynik
- Debugowalne — widzisz dokładnie co poszło do prompta
- Tanie — zero dodatkowych LLM calls (usuwasz nawet preselekcję)
- Skalowalne — dodanie narzędzia = dodanie pliku Markdown + upload

---

## 2. Zagrożenia

| # | Zagrożenie | Prawdopodobieństwo | Impact | Mitygacja |
|---|-----------|-------------------|--------|-----------|
| 1 | **Prompt za długi** — 20 narzędzi × knowledge corpus = za dużo tokenów | Wysokie | Wysoki | Playbook wybiera 3-5 narzędzi per kurs, nie wszystkie 20. Handbook dostaje 1-2 corpusy per moduł. |
| 2 | **Stale corpus** — Markdown się starzeje jak training data | Średnie | Wysoki | Datuj corpusy (`lastUpdated: 2026-03-01`). Cron/reminder do odświeżania co miesiąc. |
| 3 | **Naming collision** — user pisze "ChatGPT" ale myśli "GPT-4o" | Średnie | Niski | Enum z aliasami: `chatgpt` → `tl-chatgpt`, includes GPT-4o, GPT-4o mini, etc. |
| 4 | **Playbook tool selection niedeterministyczny** — LLM wybiera inne narzędzia za każdym razem | Średnie | Średni | Silny prompt z regułami: "user używa X, Y → muszą być. Dodaj max 2 nowe." |
| 5 | **Video corpus + knowledge corpus = redundancja** — dwa corpusy opisują to samo narzędzie | Niskie | Niski | Różne role: video = "jak wygląda UI, kliknij tu", knowledge = "co to umie, kiedy użyć, aktualne features" |
| 6 | **Handbook quality drop** — za dużo kontekstu = model gubi się | Średnie | Średni | Limituj knowledge corpus do 2000-3000 tokenów per narzędzie. Compact format. |
| 7 | **Upload race condition** — upload podczas gdy ktoś generuje kurs | Niskie | Niski | Wersjonowanie corpusów. Upload tworzy nową wersję, stara żyje aż nikt jej nie używa. |

---

## 3. Stan obecny (as-is)

### Jak narzędzia trafiają do pipeline'u teraz

```
Intake (chat)
  → user wybiera narzędzia w multi-select widget
  → LLM zapisuje do profileXml: <tool name="ChatGPT" tier="free" frequency="daily"/>
  → extractToolNames() → ["ChatGPT", "Claude"]

Playbook generation (ai.ts:308)
  → buildModuleHints(profileXml) → { toolFocus: ["ChatGPT", "Claude"] }
  → MODULE_HINTS_JSON wstrzyknięty do prompta
  → LLM generuje 6-page outline — SAM DECYDUJE co z narzędziami zrobić
  → opcjonalnie: loadAndPreselectCorpus() ładuje aktywny korpus video (jeden globalny)

Handbook generation (courseAi.ts:164)
  → opcjonalnie: loadAndPreselectCorpus() ładuje segmenty video
  → LLM generuje 3 rozdziały — dostaje profil ale nie dostaje knowledge o narzędziach
```

### Problemy obecnego flow

1. **Brak knowledge corpus** — LLM wie o narzędziach tyle ile ma w training data
2. **Jeden globalny video corpus** — wszystkie filmy w jednym worku, preselekcja LLM-em
3. **Narzędzia jako free-text** — user pisze "chatgpt", "Chat GPT", "GPT" — brak normalizacji
4. **Playbook nie wybiera narzędzi strukturalnie** — LLM dostaje `toolFocus` jako hint ale sam decyduje
5. **Brak connection tool → corpus** — nie ma mapowania "ten moduł jest o Copilot → załaduj corpus Copilot"

---

## 4. Stan docelowy (to-be)

### Nowe elementy

```
TOOL REGISTRY (kod)
  → enum ToolId = 'tl-chatgpt' | 'tl-claude' | 'tl-copilot' | ...
  → metadata per tool: displayName, aliases, category, hasVideoCorpus, hasKnowledgeCorpus

KNOWLEDGE CORPORA (Convex DB, tabela toolKnowledgeCorpora)
  → per narzędzie: toolId, content (Markdown), version, lastUpdated
  → upload z repo via `npm run upload-corpus`
  → pliki w repo: corpus/tl-chatgpt.md, corpus/tl-claude.md, ...

VIDEO CORPUS (istniejący, rozszerzony)
  → pipelineVideos.toolId: ToolId — tag per wideo
  → query by toolId zamiast globalnego active_corpus_id
```

### Zmieniony flow

```
Intake (chat)
  → user wybiera narzędzia → normalizacja do ToolId enum
  → profileXml: <tool id="tl-chatgpt" name="ChatGPT" tier="pro" frequency="daily"/>

Playbook generation — NOWY KROK: tool selection
  → extractToolIds(profileXml) → ["tl-chatgpt", "tl-claude"]
  → LLM decyzja: "dla tego profilu (nauczyciel) poleć też tl-notebooklm i tl-elevenlabs"
  → selectedTools: ["tl-chatgpt", "tl-claude", "tl-notebooklm", "tl-elevenlabs"]
  → per tool: załaduj knowledge corpus snippet (nazwy, kluczowe features, 200-300 słów)
  → wstrzyknij snippets do prompta playbooka
  → LLM generuje 6-page outline z przypisaniem narzędzi per moduł:
    page 1: "Podstawy promptowania" → tools: [tl-chatgpt, tl-claude]
    page 2: "Audio i multimedia" → tools: [tl-notebooklm, tl-elevenlabs]
    page 3: "Asystent kodowania" → tools: [tl-copilot]
    ...

Handbook generation — DETERMINISTYCZNE wstrzyknięcie
  → z outline bierzemy tools per page
  → per tool: ładujemy PEŁNY knowledge corpus + video corpus
  → wstrzykujemy do prompta handbooka
  → LLM generuje handbook z aktualną wiedzą + referencjami do video
```

### Diagram

```
                   ┌──────────────────────┐
                   │     TOOL REGISTRY    │
                   │ (convex/lib/tools.ts)│
                   │                      │
                   │ tl-chatgpt           │
                   │ tl-claude            │
                   │ tl-copilot           │
                   │ tl-gemini            │
                   │ ...20 tools          │
                   └──────┬───────────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
   ┌────────▼───┐  ┌──────▼──────┐  ┌──▼──────────────┐
   │  Markdown   │  │ Video       │  │ Profile XML     │
   │  in repo    │  │ Pipeline    │  │ (user's tools)  │
   │             │  │ (existing)  │  │                 │
   │ corpus/     │  │ pipelined   │  │ <tool id="tl-   │
   │  tl-chat.md │  │ Videos +    │  │  chatgpt" .../>│
   │  tl-clau.md │  │ toolId tag  │  │                 │
   └──────┬──────┘  └──────┬──────┘  └────────┬────────┘
          │                │                   │
    npm run upload    query by toolId    extractToolIds()
          │                │                   │
   ┌──────▼────────────────▼───────────────────▼────────┐
   │              PLAYBOOK GENERATION                    │
   │                                                     │
   │  1. User tools from profile                         │
   │  2. LLM suggests additional tools (max 2)           │
   │  3. Load knowledge snippets for all selected tools  │
   │  4. Generate 6-page outline with tool assignments   │
   └──────────────────────┬──────────────────────────────┘
                          │
          per page: tools[] assignment
                          │
   ┌──────────────────────▼──────────────────────────────┐
   │              HANDBOOK GENERATION                     │
   │                                                      │
   │  Input per module:                                   │
   │  - outline page (title, summary, tools[])            │
   │  - full plan page (detailed guidance)                │
   │  - profile XML                                       │
   │  - KNOWLEDGE_CORPUS: full Markdown for assigned tools│
   │  - VIDEO_CORPUS: segments for assigned tools         │
   │  - editorial guide                                   │
   │                                                      │
   │  Output: 3 chapters with current knowledge + videos  │
   └──────────────────────────────────────────────────────┘
```

---

## 5. Plan implementacji

### Krok 1: Tool Registry (`convex/lib/tools.ts`) — 0.5 dnia

Nowy plik z enum i metadatą:

```typescript
export type ToolId =
  | 'tl-chatgpt'
  | 'tl-claude'
  | 'tl-gemini'
  | 'tl-copilot'
  | 'tl-midjourney'
  | 'tl-notebooklm'
  | 'tl-elevenlabs'
  | 'tl-perplexity'
  | 'tl-cursor'
  | 'tl-v0'
  | 'tl-bolt'
  | 'tl-lovable'
  | 'tl-runway'
  | 'tl-suno'
  | 'tl-gamma'
  | 'tl-canva-ai'
  | 'tl-dall-e'
  | 'tl-sora'
  | 'tl-heygen'
  | 'tl-replit';

export interface ToolMeta {
  id: ToolId;
  displayName: string;
  aliases: string[];     // "GPT", "Chat GPT", "GPT-4o" → tl-chatgpt
  category: 'chat' | 'code' | 'image' | 'audio' | 'video' | 'productivity' | 'search';
  hasKnowledgeCorpus: boolean;
  hasVideoCorpus: boolean;
}

export const TOOL_REGISTRY: Record<ToolId, ToolMeta> = { ... };

/** Normalize free-text tool name to ToolId. Returns undefined if unknown. */
export function resolveToolId(rawName: string): ToolId | undefined { ... }
```

### Krok 2: Schema — nowa tabela `toolKnowledgeCorpora` — 0.5 dnia

```typescript
// schema.ts
toolKnowledgeCorpora: defineTable({
  toolId: v.string(),        // ToolId enum value, e.g. "tl-chatgpt"
  content: v.string(),       // Full Markdown knowledge corpus
  version: v.number(),       // Auto-incremented on upload
  lastUpdated: v.string(),   // ISO date of content freshness, e.g. "2026-03-01"
  uploadedAt: v.number(),    // Convex timestamp of upload
  tokenEstimate: v.optional(v.number()), // Rough token count for budget tracking
})
  .index('by_tool', ['toolId'])
  .index('by_tool_version', ['toolId', 'version']),
```

### Krok 3: Markdown pliki w repo — 1-2 dni (content work)

Struktura:
```
corpus/
  tl-chatgpt.md
  tl-claude.md
  tl-gemini.md
  tl-copilot.md
  tl-notebooklm.md
  tl-elevenlabs.md
  ...
```

Format per plik (~2000-3000 tokenów):
```markdown
---
toolId: tl-chatgpt
displayName: ChatGPT
lastUpdated: 2026-03-01
---

# ChatGPT

## Co to jest
OpenAI's conversational AI. Wersje: Free (GPT-4o mini), Plus ($20/mo, GPT-4o, o1),
Team ($25/user/mo), Enterprise.

## Kluczowe features (stan na marzec 2026)
- **Canvas** — collaborative editing space for text and code
- **Projects** — organize conversations by topic with custom instructions
- **GPTs** — custom chatbots (GPT Store)
- **Advanced Data Analysis** — upload CSV/Excel, Python sandbox
- **DALL-E 3** — image generation inline
- **Browse with Bing** — real-time web access
- **Memory** — persistent context across conversations
- **Scheduled Tasks** — recurring prompts
- **Sora integration** — video generation (Plus/Pro)

## Typowe use cases per rola
- **Marketer:** copy, social media, campaign ideas, A/B test analysis
- **Developer:** code review, debugging, documentation, architecture
- **Nauczyciel:** scenariusze lekcji, quizy, materiały dydaktyczne
- **PM:** user stories, PRD drafts, competitive analysis

## Prompt patterns specyficzne dla ChatGPT
- Custom Instructions: dwa pola (about you / how to respond)
- Canvas: "edit this in canvas" → collaborative mode
- Code Interpreter: "analyze this data" + file upload

## Czego NIE robi / ograniczenia
- Brak real-time collaboration (nie Google Docs)
- Memory ograniczona, nie zawsze trafna
- DALL-E 3 nie rozumie tekstu w obrazach dobrze
- Brak natywnego API w free tier
```

### Krok 4: Upload script (`scripts/upload-corpus.ts`) — 0.5 dnia

```bash
npm run upload-corpus          # upload all
npm run upload-corpus chatgpt  # upload single tool
```

Skrypt:
1. Glob `corpus/tl-*.md`
2. Parse frontmatter (toolId, lastUpdated)
3. Waliduj toolId vs TOOL_REGISTRY
4. Dla każdego pliku: Convex mutation `toolKnowledgeCorpora.upsert` (inkrementuj version)
5. Log: "Uploaded tl-chatgpt v3 (2847 tokens)"

### Krok 5: `pipelineVideos.toolId` — tag na wideo — 0.5 dnia

- Dodaj `toolId: v.optional(v.string())` do `pipelineVideos` w schema
- Admin UI: dropdown z TOOL_REGISTRY do tagowania wideo
- Istniejące wideo: backfill z `toolDetected` → `resolveToolId(toolDetected)`
- Nowa query: `getVideoSegmentsByToolId(toolId)` — zwraca segmenty z enabled=true

### Krok 6: Profile XML normalizacja — 0.5 dnia

- W `profileXml.ts`: `extractToolIds()` zamiast `extractToolNames()`
- W intake prompt: po zebraniu narzędzi, normalizuj do ToolId
- Backwards compat: `extractToolNames()` nadal działa, `extractToolIds()` jest nowa

### Krok 7: Playbook — tool selection step — 1 dzień

Nowy krok w `generatePlaybook` (ai.ts):

```typescript
// 1. Extract user's tools from profile
const userToolIds = extractToolIds(profileXml);

// 2. Load knowledge snippets (short version, ~200 words per tool)
const allToolSnippets = await loadToolSnippets(ctx, TOOL_REGISTRY_IDS);

// 3. LLM selects tools for this course
const selectedTools = await chatJsonForStage<{ tools: string[]; reasoning: string }>(
  'toolSelection',
  {
    system: TOOL_SELECTION_SYSTEM,
    user: buildToolSelectionPrompt({
      profileXml,
      userTools: userToolIds,
      availableTools: allToolSnippets, // short descriptions of all 20 tools
      assessmentReport,
    }),
    model: llmModel,
  },
);

// 4. Inject selected tools into playbook prompt
// NEW variable: {SELECTED_TOOLS_JSON}
```

Nowy stage w `pipelineConfig.ts`:
```typescript
toolSelection: { temperature: 0.3, retries: 2, baseDelayMs: 250, expect: 'object' },
```

Prompt tool selection:
```
Jesteś ekspertem od doboru narzędzi AI. Na bazie profilu learnera wybierz 4-6 narzędzi
które powinny pojawić się w kursie.

Reguły:
- Narzędzia które user już używa (userTools) MUSZĄ być w liście
- Dodaj max 2-3 nowe narzędzia które pasują do roli i celów
- Dla każdego narzędzia napisz 1-zdaniowe uzasadnienie
- Zwróć JSON: { tools: ["tl-chatgpt", ...], reasoning: "..." }

AVAILABLE TOOLS:
{TOOL_SNIPPETS}
```

### Krok 8: Playbook prompt — tool assignment per page — 1 dzień

Modyfikacja `PlaybookXmlSystem` prompt:

Dodaj do Rules:
```
- Dla KAŻDEJ strony w outline, dodaj pole `tools: ["tl-chatgpt", "tl-notebooklm"]`
  z listą narzędzi używanych w tym module.
- Rozkładaj narzędzia across pages — nie pakuj wszystkich do jednej strony.
- Mieszaj zasady (prompting, evaluation, workflows) z narzędziami.
  Przykład: strona "Audio i multimedia w edukacji" → tools: [tl-notebooklm, tl-elevenlabs],
  ale treść dotyczy ZASAD tworzenia materiałów audio + HOW-TO w konkretnych narzędziach.
```

Dodaj nową zmienną `{SELECTED_TOOLS_JSON}`:
```
## Selected Tools

The following tools have been selected for this course:
{SELECTED_TOOLS_JSON}

Use ONLY these tools in the curriculum. For each page, assign 1-3 relevant tools.
```

Output format rozszerzony:
```json
{
  "outline": [
    {
      "page": 1,
      "title": "...",
      "summary": "...",
      "tools": ["tl-chatgpt", "tl-claude"],
      "teasers": ["..."],
      "cta": "..."
    }
  ]
}
```

### Krok 9: Handbook — deterministyczne wstrzyknięcie korpusów — 1 dzień

W `generateHandbookInternal` (courseAi.ts):

```typescript
// Parse tools from outline page
const outlineData = JSON.parse(args.outlinePage);
const pageToolIds: ToolId[] = outlineData.tools || [];

// Load knowledge corpora for assigned tools
const knowledgeSection = await loadKnowledgeCorpora(ctx, pageToolIds);

// Load video segments for assigned tools (replaces loadAndPreselectCorpus)
const videoSection = await loadVideoCorpusByTools(ctx, pageToolIds);

// Inject both into handbook prompt
const userPrompt = renderPrompt(PromptTemplate.HandbookUser, {
  ...existingVars,
  KNOWLEDGE_CORPUS: knowledgeSection,
  VIDEO_CORPUS: videoSection,
});
```

**Nowe helper functions:**

```typescript
// Load full knowledge Markdown for given tools
async function loadKnowledgeCorpora(ctx, toolIds: ToolId[]): Promise<string> {
  const sections: string[] = [];
  for (const toolId of toolIds) {
    const corpus = await ctx.runQuery(internal.toolCorpus.getLatest, { toolId });
    if (corpus) {
      sections.push(`## ${TOOL_REGISTRY[toolId].displayName}\n\n${corpus.content}`);
    }
  }
  return sections.length > 0
    ? `# KNOWLEDGE CORPUS\n\n${sections.join('\n\n---\n\n')}`
    : '';
}

// Load video segments tagged with given tools
async function loadVideoCorpusByTools(ctx, toolIds: ToolId[]): Promise<string> {
  const segments: CorpusSegment[] = [];
  for (const toolId of toolIds) {
    const toolSegments = await ctx.runQuery(internal.videoCorpus.getByToolId, { toolId });
    segments.push(...toolSegments);
  }
  return segments.length > 0
    ? `# VIDEO CORPUS\n\n${buildCorpusText(segments)}`
    : '';
}
```

### Krok 10: Handbook prompt update — 0.5 dnia

Nowa zmienna `{KNOWLEDGE_CORPUS}` w `HandbookUser`:

```
## Knowledge Reference

The following is curated, up-to-date knowledge about the tools covered in this module.
Use this as your PRIMARY source for tool-specific information. Do NOT rely on your
training data for tool features, UI descriptions, or capabilities — use this corpus instead.

{KNOWLEDGE_CORPUS}
```

Kluczowa instrukcja w `HandbookSystem`:
```
## Current Knowledge Policy

- Your training data about AI tools may be outdated.
- The KNOWLEDGE CORPUS section contains verified, current information.
- When writing about a tool's features or UI, ALWAYS reference the knowledge corpus.
- If the knowledge corpus contradicts your training data, the corpus is correct.
- Include the tool's current state (pricing tiers, key features) from the corpus.
- Do NOT invent features not mentioned in the corpus.
```

### Krok 11: Cleanup — usunięcie LLM preselekcji — 0.5 dnia

- `loadAndPreselectCorpus` — deprecate (zostaw dla backward compat)
- Nowe handbook'i używają `loadVideoCorpusByTools` (deterministyczne)
- Usunięcie preselekcji = -1 LLM call per handbook = szybciej + taniej
- Feature flag `video-enhanced-lessons` → zamień na "czy narzędzie ma video corpus"

---

## 6. Narzędzia na start (Tier 1)

Proponuję 12 narzędzi na start, pogrupowanych:

### Core Chat/Assistant (must have — większość userów)
| # | ToolId | Display Name | Kategoria | Priorytet corpusu |
|---|--------|-------------|-----------|-------------------|
| 1 | `tl-chatgpt` | ChatGPT | chat | Dzień 1 |
| 2 | `tl-claude` | Claude | chat | Dzień 1 |
| 3 | `tl-gemini` | Gemini | chat | Dzień 1 |
| 4 | `tl-perplexity` | Perplexity | search | Dzień 1 |

### Code (developers)
| # | ToolId | Display Name | Kategoria | Priorytet corpusu |
|---|--------|-------------|-----------|-------------------|
| 5 | `tl-copilot` | GitHub Copilot | code | Tydzień 1 |
| 6 | `tl-cursor` | Cursor | code | Tydzień 1 |

### Creative (content creators, marketerzy, nauczyciele)
| # | ToolId | Display Name | Kategoria | Priorytet corpusu |
|---|--------|-------------|-----------|-------------------|
| 7 | `tl-midjourney` | Midjourney | image | Tydzień 1 |
| 8 | `tl-dall-e` | DALL-E | image | Tydzień 2 |
| 9 | `tl-canva-ai` | Canva AI | productivity | Tydzień 2 |

### Audio/Video (nauczyciele, content creators)
| # | ToolId | Display Name | Kategoria | Priorytet corpusu |
|---|--------|-------------|-----------|-------------------|
| 10 | `tl-notebooklm` | NotebookLM | productivity | Tydzień 1 |
| 11 | `tl-elevenlabs` | ElevenLabs | audio | Tydzień 2 |

### No-code builders
| # | ToolId | Display Name | Kategoria | Priorytet corpusu |
|---|--------|-------------|-----------|-------------------|
| 12 | `tl-gamma` | Gamma | productivity | Tydzień 2 |

### Tier 2 (dodaj później)
`tl-v0`, `tl-bolt`, `tl-lovable`, `tl-runway`, `tl-suno`, `tl-sora`, `tl-heygen`, `tl-replit`

### Dlaczego te 12

1. **Pokrywają 90% profili** — PM, developer, nauczyciel, marketer, designer
2. **Pokrywają wszystkie kategorie** — chat, code, image, audio, productivity, search
3. **Największy churn wiedzy** — to narzędzia które zmieniają się najszybciej
4. **Mamy (lub łatwo zrobimy) video content** dla większości z nich

---

## 7. Effort estimate

| Krok | Co | Effort | Zależności |
|------|-----|--------|-----------|
| 1 | Tool Registry | 0.5 dnia | — |
| 2 | Schema + tabela | 0.5 dnia | Krok 1 |
| 3 | Markdown content (4 core tools) | 1-2 dni | Krok 1 |
| 4 | Upload script | 0.5 dnia | Krok 1, 2 |
| 5 | pipelineVideos.toolId | 0.5 dnia | Krok 1 |
| 6 | Profile XML normalizacja | 0.5 dnia | Krok 1 |
| 7 | Playbook tool selection | 1 dzień | Krok 1, 2, 3 |
| 8 | Playbook prompt update | 1 dzień | Krok 7 |
| 9 | Handbook corpus injection | 1 dzień | Krok 2, 5, 8 |
| 10 | Handbook prompt update | 0.5 dnia | Krok 9 |
| 11 | Cleanup preselekcji | 0.5 dnia | Krok 9 |
| **Total** | | **~7-8 dni** | |

Kroki 1-4 mogą iść równolegle z krokami 5-6.
Kroki 7-10 są sekwencyjne (każdy buduje na poprzednim).

---

## 8. Sequencing — co robić w jakiej kolejności

**Dzień 1-2:** Kroky 1, 2, 4 — infrastruktura (registry, schema, upload script)
**Dzień 2-3:** Krok 3 — content (4 core tool corpusy: chatgpt, claude, gemini, perplexity)
**Dzień 3-4:** Kroky 5, 6 — tagowanie wideo, normalizacja profilu
**Dzień 4-5:** Kroky 7, 8 — playbook tool selection + prompt
**Dzień 6-7:** Kroky 9, 10 — handbook injection + prompt
**Dzień 7-8:** Krok 11 — cleanup + testy end-to-end

**Milestone:** Po dniu 5 możesz wygenerować pierwszy playbook z tool assignments.
**Milestone:** Po dniu 7 masz pełny pipeline z knowledge corpus w handbook.
