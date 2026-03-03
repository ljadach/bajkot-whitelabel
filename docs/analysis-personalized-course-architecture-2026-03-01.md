# Analiza koncepcyjna: architektura generowania spersonalizowanych kursów

**Data:** 2026-03-01
**Autor:** Atropa + chmara agentów badawczych
**Kontekst:** AITutor generuje spersonalizowane kursy AI dla learnerów. Obecne rozwiązanie to liniowy pipeline LLM. Szukamy lepszych architektur.

---

## Spis treści

1. [Dekompozycja problemu (First Principles)](#1-dekompozycja-problemu-first-principles)
2. [Obecne rozwiązanie — analiza](#2-obecne-rozwiązanie--analiza)
3. [Rozwiązanie A: Pipeline agentowy (Claude Agent SDK)](#3-rozwiązanie-a-pipeline-agentowy-claude-agent-sdk)
4. [Rozwiązanie B: RAG + Knowledge Graph](#4-rozwiązanie-b-rag--knowledge-graph)
5. [Rozwiązanie C: Content Pool + Adaptive Learning](#5-rozwiązanie-c-content-pool--adaptive-learning)
6. [Dyskusja porównawcza](#6-dyskusja-porównawcza)
7. [Rekomendacja](#7-rekomendacja)

---

## 1. Dekompozycja problemu (First Principles)

### Co właściwie robimy?

Tworzymy **spersonalizowany materiał edukacyjny** dla konkretnego człowieka. Rozbijmy to na atomy:

**Atom 1: Kim jest learner?**
- Jakie narzędzia AI zna (i na jakim poziomie)
- Jaka jest jego rola zawodowa
- Co chce osiągnąć (cele nauki)
- Czego NIE chce (negatywne preferencje)
- Ile ma czasu
- Jak sam ocenia swoje umiejętności vs jak wypada w teście

**Atom 2: Co wiemy o domenie?**
- Korpus wideo (nagrania ekranowe narzędzi AI z segmentami)
- Wiedza LLM-a o narzędziach AI (training data)
- Aktualne informacje z internetu (web search)
- Struktura wiedzy (które koncepty zależą od których)

**Atom 3: Co generujemy?**
- Plan kursu (5-6 modułów z tytułami i opisami)
- Handbook per moduł (3 rozdziały z treścią Markdown)
- Osadzone filmy z korpusu (opcjonalnie)
- Ćwiczenia per rozdział (prompt_improvement, problem_solving, reflection)

**Atom 4: Jakie są constraints jakościowe?**
- Treść musi być spersonalizowana (narzędzia learnera, jego rola, poziom)
- Treść musi być aktualna (narzędzia AI zmieniają się co miesiąc)
- Treść musi być spójna wewnętrznie (moduły nie powtarzają się, budują na sobie)
- Treść musi być stylistycznie poprawna (editorial guide)
- Filmy muszą pasować do kontekstu modułu

### Fundamentalne napięcia

| Napięcie | Strona A | Strona B |
|----------|----------|----------|
| Personalizacja vs koszt | Im głębsza personalizacja, tym więcej wywołań LLM | Każde wywołanie kosztuje tokeny i czas |
| Aktualność vs stabilność | Web search daje świeże dane | Ale wyniki są niedeterministyczne |
| Spójność vs elastyczność | Sztywna struktura = spójny kurs | Ale mniej dopasowany do profilu |
| Jakość vs latencja | Więcej passów review = lepsza jakość | Ale user czeka dłużej |
| Autonomia agenta vs kontrola | Agent sam decyduje co zbadać | Ale może pójść w złą stronę |

### Pytanie kluczowe

**Jak zbudować system, który generuje treść tak dobrą, jakby pisał ją ekspert edukacyjny znający learnera osobiście — ale robi to w minuty, nie w dni?**

---

## 2. Obecne rozwiązanie — analiza

### Flow

```
Intake Chat (5 tur)
    ↓ LLM regeneruje profileXml każdą turę
Profile XML (canonical source of truth)
    ↓
Skill Verification (scorePrompt 0-1) + AI Fluency (inferAiFluency 0-100)
    ↓
Assessment Report (180-300 słów Markdown)
    ↓
Playbook Generation (outline 5-6 stron + fullPlan per strona)
    ↓ opcjonalnie: loadAndPreselectCorpus (max 30 segmentów)
Course Initiation (tworzy courseDocuments)
    ↓ równoległe schedulowanie
Handbook Generation × N (3 rozdziały per moduł)
    ↓ per moduł: loadAndPreselectCorpus (max 15 segmentów)
    ↓ style compliance check (tylko loguje, nie odrzuca)
    ↓ opcjonalnie: auto-generate exercises
Course Ready
```

### Co działa dobrze

1. **Profil XML jako source of truth** — idempotentny, deterministyczny, parseable
2. **Równoległe generowanie handbook'ów** — parallel scheduling przez Convex
3. **Fallback chain** — Langfuse → inline prompts, preselection failure → full corpus
4. **Obserwability** — Langfuse spans na każdym etapie
5. **Konfigurowalne modele per stage** — pipelineConfig z temperaturą, retries, model override

### Co nie działa / brakuje

| Problem | Opis | Wpływ |
|---------|------|-------|
| **Brak walidacji semantycznej** | Style check tylko loguje, nigdy nie odrzuca. Brak QA gate. | Treść niskiej jakości może trafić do usera |
| **Brak źródeł** | Handbook nie cytuje źródeł. Nie wiadomo skąd LLM wziął informacje. | Brak wiarygodności, ryzyko halucynacji |
| **Płytka personalizacja** | Profil idzie do prompta, ale LLM decyduje jak go użyć. Brak strukturalnego wymuszenia. | "Spersonalizowany" = LLM wspomina narzędzie usera w tekście |
| **Brak grafu prerequisites** | 5 modułów to płaska lista. Brak gwarancji, że moduł 3 buduje na module 2. | Potencjalne luki, powtórzenia |
| **Statyczny poziom trudności** | Handbook generowany raz, na stałym poziomie. Brak feedbacku z ćwiczeń. | Nie adaptuje się do postępów learnera |
| **Preselection overhead** | Dodatkowe wywołanie LLM per handbook dla video preselekcji. | Koszt + latencja, graceful degradation do full corpus |
| **JSON-in-strings** | planOutline, planFull jako JSON strings w bazie. | Brak type safety, brak możliwości query |
| **Sztywna struktura** | Zawsze 3 rozdziały, zawsze per moduł. | Nie da się zrobić modułu z 2 lub 5 rozdziałami |

### Koszty obecnego rozwiązania

Przy Gemini 2.5 Flash (obecny workhorse):
- Playbook: ~$0.002
- 6× Handbook: ~$0.01
- 6× Preselection: ~$0.003
- 6× Exercises: ~$0.005
- **Total: ~$0.02/kurs** (absurdalnie tanio)

Przy Gemini 3.1 Pro (obecny model do playbook/handbook):
- **Total: ~$0.15-0.30/kurs** (wciąż tanio)

---

## 3. Rozwiązanie A: Pipeline agentowy (Claude Agent SDK)

### Koncept

Zamiast liniowego pipeline'u z predefiniowanymi krokami, **agent autonomicznie** buduje kurs. Ma dostęp do narzędzi (web search, file system, corpus), sam decyduje co zbadać, pisze treść i waliduje ją przed publikacją.

### Architektura

```
┌───────────────────────────────────────────────────┐
│                  ORCHESTRATOR                      │
│           (Claude Agent SDK, main loop)            │
│                                                    │
│  Input: profileXml, assessment, plan, styleGuide   │
│  Output: 6 handbook'ów + ćwiczenia + metadata      │
│                                                    │
│  Per moduł deleguje do 3 subagentów:               │
└────────────┬──────────────┬──────────────┬─────────┘
             │              │              │
    ┌────────▼─────┐  ┌─────▼──────┐  ┌───▼──────────┐
    │  RESEARCHER  │  │   WRITER   │  │   QA GATE    │
    │              │  │            │  │              │
    │ WebSearch    │  │ Write      │  │ Read         │
    │ WebFetch     │  │ Edit       │  │ Grep         │
    │ Read/Write   │  │ Read       │  │ Bash (lint)  │
    │              │  │            │  │              │
    │ → source.json│  │ → handbook │  │ → qa_result  │
    └──────────────┘  └────────────┘  └──────────────┘
```

### Jak to działa krok po kroku

1. **Orchestrator** otrzymuje profil + plan + assessment
2. Per moduł:
   a. **Researcher** szuka w internecie aktualnych informacji o narzędziach/technikach z planu modułu. Buduje `source_pack.json` z URL-ami, datami, kluczowymi faktami.
   b. **Writer** czyta source pack + profil + plan + style guide. Generuje handbook jako structured output (3 rozdziały Markdown + metadata).
   c. **QA Gate** waliduje handbook: plan adherence, personalizacja, świeżość źródeł, styl. Zwraca pass/fail + issues.
   d. Jeśli fail → Writer dostaje feedback QA → ponowna generacja (max 3 retry)
   e. Jeśli 3× fail → eskalacja do człowieka

### Kluczowe zalety

| Zaleta | Opis |
|--------|------|
| **Aktualne źródła** | Researcher szuka w internecie — handbook cytuje realne URL-e z datami |
| **QA gate** | Treść jest walidowana przed publikacją, nie tylko logowana |
| **Elastyczność** | Agent sam decyduje ile zbadać, jak głęboko. Może wrócić do researchu jeśli Writer potrzebuje więcej |
| **Structured output** | Claude Agent SDK gwarantuje JSON Schema na poziomie gramatyki, nie promptu |
| **Sandboxing** | Agent pracuje w izolowanym katalogu, zero ryzyka dla systemu |
| **Obserwability** | Hooki na PreToolUse/PostToolUse → pełny log każdej akcji agenta |

### Kluczowe ryzyka

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Niedeterminizm** | Agent może pójść w innym kierunku za każdym razem | Structured output + wąski prompt + max_turns limit |
| **Koszty tokenów** | Agent "myśli" — reasoning tokens kosztują | Sonnet 4.6 zamiast Opus, Batch API (50% rabatu) |
| **Debugowanie** | Agentowa pętla jest trudniejsza do debugowania niż linear pipeline | Hooki + Langfuse spans + session replay |
| **Latencja** | 3 subagentów × 6 modułów × retry = dużo wywołań | Parallelizacja modułów, Batch API dla non-RT |
| **Integracja z Convex** | Agent SDK to osobny proces, wyniki trzeba wpuścić do Convex | Custom MCP server lub webhook po zakończeniu |

### Szacunek kosztów

Na **Sonnet 4.6 Batch API**:
- Research: ~$0.12 (6× WebSearch + WebFetch + reasoning)
- Writing: ~$0.63 (6× handbook generation)
- QA: ~$0.17 (6× validation)
- Exercises: ~$0.47 (18× exercise generation)
- **Total: ~$1.00-1.50/kurs**

To ~50-75× drożej niż obecny pipeline na Gemini Flash. Ale jakość jest nieporównywalna — źródła, QA gate, głębsza personalizacja.

### Opcja hybrydowa: Gemini + Claude

- **Research**: Gemini 2.5 Flash z Google Search grounding ($0.003/moduł)
- **Writing**: Claude Sonnet 4.6 Batch ($0.10/moduł) — lepsza jakość tekstu
- **QA**: Claude Haiku 4.5 Batch ($0.03/moduł) — wystarczy do walidacji
- **Total hybrid: ~$0.80/kurs** — oszczędność z zachowaniem jakości

### Integracja z Convex

Opcja 1: **Convex action odpala Agent SDK**
```
Convex internalAction → spawn Agent SDK process → agent pisze pliki →
Convex czyta pliki → zapisuje do courseDocuments
```

Opcja 2: **Custom MCP server**
```
Agent SDK → MCP server → Convex HTTP action → bezpośredni zapis do bazy
```

Opcja 3: **Webhook callback**
```
Agent SDK kończy → POST na Convex HTTP endpoint → zapis wyników
```

---

## 4. Rozwiązanie B: RAG + Knowledge Graph

### Koncept

Zamiast generować treść "z głowy" LLM-a, **zbuduj strukturę wiedzy** (graf konceptów + zależności) i **przeszukuj korpus semantycznie** (vector embeddings). LLM generuje treść, ale gruntowaną w realnych materiałach i ułożoną wg grafu prerequisites.

### Architektura

```
┌─────────────────────────────────────────────────────┐
│              KNOWLEDGE GRAPH (Convex)                │
│                                                      │
│  Nodes: koncepty AI (Prompt Engineering, RAG, ...)   │
│  Edges: prerequisites, related-to, part-of           │
│  Attributes: difficulty, skill_category, tools       │
│  Mappings: concept → video segments, exercises       │
└──────────┬──────────────────────────────┬────────────┘
           │                              │
           ▼                              ▼
┌──────────────────┐          ┌────────────────────────┐
│  PATH GENERATOR  │          │   VECTOR STORE (RAG)   │
│                  │          │                        │
│  Profile → graph │          │  Embedded: segment     │
│  position → path │          │  descriptions, docs,   │
│  through concepts│          │  previous handbooks    │
│                  │          │                        │
│  Topological sort│          │  Convex @convex-dev/rag│
│  + profile match │          │  or Pinecone           │
└────────┬─────────┘          └───────────┬────────────┘
         │                                │
         ▼                                ▼
┌─────────────────────────────────────────────────────┐
│              LLM GENERATION (per moduł)              │
│                                                      │
│  Input: ordered concept sequence + retrieved chunks  │
│         + profile + style guide                      │
│                                                      │
│  Output: handbook grounded in real materials          │
│          respecting prerequisite order                │
└──────────────────────────────────────────────────────┘
```

### Knowledge Graph w Convex

Dwie nowe tabele, zero nowej infrastruktury:

```typescript
// schema.ts
knowledgeNodes: defineTable({
  name: v.string(),           // "Prompt Engineering"
  description: v.string(),
  difficulty: v.string(),     // "beginner" | "intermediate" | "advanced"
  skillCategory: v.string(),  // "prompting" | "evaluation" | "tool_usage"
  tools: v.array(v.string()), // ["ChatGPT", "Claude"]
  videoSegmentIds: v.array(v.id("videoSegments")),
  exerciseTemplateIds: v.optional(v.array(v.string())),
})
.index("by_category", ["skillCategory"])
.index("by_difficulty", ["difficulty"]),

knowledgeEdges: defineTable({
  fromNode: v.id("knowledgeNodes"),
  toNode: v.id("knowledgeNodes"),
  type: v.string(),           // "prerequisite" | "related" | "part_of"
  weight: v.optional(v.number()),
})
.index("by_from", ["fromNode"])
.index("by_to", ["toNode"]),
```

**Topological sort** w Convex action → uporządkowana sekwencja konceptów dla learnera.

**Mapowanie profilu na graf:**
1. Profil → znane koncepty (self-report skills ≥ 4) → oznacz jako "mastered"
2. Cele nauki → target koncepty
3. Najkrótsza ścieżka (BFS/DFS) od mastered do targets, z pominięciem mastered
4. Wynik: uporządkowana lista konceptów = plan kursu

### RAG w Convex

Zamiast obecnego `loadAndPreselectCorpus` (tag-based filtering + LLM preselection):

```typescript
// Embed segment descriptions przy tworzeniu segmentu
const embedding = await generateEmbedding(segment.description);
await ctx.db.insert("segmentEmbeddings", {
  segmentId: segment._id,
  embedding,
  metadata: segment.metadata,
});

// Przy generowaniu handbooka — semantic search
const queryEmbedding = await generateEmbedding(
  `${moduleTitle} for ${userRole} using ${userTools}`
);
const relevantSegments = await vectorSearch("segmentEmbeddings", queryEmbedding, {
  limit: 15,
  filter: (q) => q.eq("metadata.difficulty", learnerLevel),
});
```

**Zalety vs obecne preselection:**
- Semantyczne dopasowanie zamiast tag matching
- Brak dodatkowego wywołania LLM
- Szybsze (vector search vs LLM call)
- Automatycznie skaluje się z rozmiarem korpusu

### Kluczowe zalety

| Zaleta | Opis |
|--------|------|
| **Poprawna sekwencja nauki** | Graf gwarantuje, że prerequisites są przed zaawansowanymi konceptami |
| **Unikalne ścieżki** | Każdy profil = inna ścieżka przez graf. Prawdziwa personalizacja. |
| **Semantic content matching** | Vector search zamiast tag-based. Lepsze dopasowanie video do modułu |
| **Zero nowej infrastruktury** | Convex tables + Convex vector search. Brak Neo4j, Pinecone, etc. |
| **Skalowalność** | Dodanie nowego konceptu do grafu = natychmiast dostępny we wszystkich kursach |
| **Tanio** | Embedding generation: grosze. Vector search: milisekundy. Graf traversal: zero LLM. |

### Kluczowe ryzyki

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Budowa grafu** | Ktoś musi zdefiniować koncepty i zależności. Manualnie? LLM? | Bootstrapping z LLM, ludzka kuracja. ~50-100 node'ów na start |
| **Maintenance grafu** | AI tools domain zmienia się szybko. Graf musi być aktualny. | LLM-assisted updates: "jakie nowe koncepty pojawiły się?" |
| **Granularność** | Za gruby graf (10 node'ów) = mało wartości. Za drobny (10,000) = chaos. | Sweet spot: 50-200 node'ów dla AI tools domain |
| **Koherencja RAG** | Retrieval z wielu źródeł = patchwork. Brak spójnego voice. | RAG only for facts/examples. Narrative generowany przez LLM |

### Szacunek kosztów

- Embedding generation (jednorazowy): ~$0.01 na 1000 segmentów
- Vector search per handbook: ~$0.00 (included w Convex)
- Graf traversal: $0 (pure compute)
- LLM generation (z retrieved context): jak obecny pipeline
- **Dodatkowy koszt vs obecne: ~$0/kurs** (oszczędność na brak preselection LLM call)

---

## 5. Rozwiązanie C: Content Pool + Adaptive Learning

### Koncept

Zamiast generować kurs od zera per user, **pregeneruj pulę wariantów treści offline**. W runtime LLM wybiera i adaptuje najlepszy wariant. Dodaj **adaptacyjną pętlę** — ćwiczenia wpływają na kolejne rozdziały.

### Architektura

```
┌─────────────────────────────────────────────────────────┐
│                 OFFLINE: Content Factory                 │
│                                                          │
│  Dla top-20 profili (role × tool × level):               │
│    → Generuj pełne handbook'i z wariantami               │
│    → Review + quality gate                               │
│    → Indeksuj w content pool                             │
│                                                          │
│  Cron: co tydzień/miesiąc odświeżaj pool                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 ONLINE: Serve + Adapt                    │
│                                                          │
│  1. Profile → clusteryzacja → nearest content variant    │
│  2. LLM adaptuje wariant do dokładnego profilu           │
│     (podmiana narzędzi, przykładów, poziomu)             │
│  3. Serwuj handbook                                      │
│  4. User robi ćwiczenie → score                          │
│  5. Score wpływa na parametry następnego rozdziału:      │
│     - score < 60% → uprość, dodaj scaffolding            │
│     - score 60-80% → maintain, zmień przykłady           │
│     - score > 80% → zwiększ trudność                     │
│  6. Powtórz 3-5 dla kolejnych rozdziałów                │
└──────────────────────────────────────────────────────────┘
```

### Content Pool

**Offline generation:**
```
20 profili klastrów × 6 modułów × 3 rozdziały = 360 handbook wariantów
```

Przy Batch API na Sonnet 4.6: ~$5-10 za pełny pool (jednorazowo).

**Klastry profilów:**
```
Role: PM | Developer | Designer | Executive | Marketer
Tool: ChatGPT-centric | Claude-centric | Multi-tool | Beginner
Level: Beginner | Intermediate | Advanced | Expert
```

5 × 4 × 4 = 80 kombinacji, ale wiele jest rzadkich. Top 20 pokryje ~80% userów.

### Adaptive Learning Loop

Wykorzystuje istniejące tabele `exerciseSubmissions` i `chapterProgress`:

```typescript
// Po każdym ćwiczeniu:
const recentScores = await getRecentExerciseScores(userId, moduleId);
const avgScore = average(recentScores);

const difficultyModifier =
  avgScore < 0.6 ? 'simplify' :
  avgScore > 0.8 ? 'challenge' :
  'maintain';

// Przy generowaniu następnego rozdziału:
const nextChapter = await generateChapterWithDifficulty({
  baseContent: contentPoolVariant,
  difficultyModifier,
  recentMistakes: extractMistakePatterns(recentSubmissions),
  profileXml,
});
```

**Spaced repetition** (nowa tabela):
```typescript
reviewSchedule: defineTable({
  userId: v.id("userProfiles"),
  conceptId: v.id("knowledgeNodes"),
  nextReviewAt: v.number(),
  interval: v.number(),       // dni
  easeFactor: v.number(),     // SM-2 algorithm
  reviewCount: v.number(),
})
.index("by_user_next", ["userId", "nextReviewAt"]),
```

### Kluczowe zalety

| Zaleta | Opis |
|--------|------|
| **Latencja: sekundy zamiast minut** | 90% treści pre-generowana. LLM tylko adaptuje. |
| **Testowalna jakość** | Pool jest finitely sized. Każdy wariant można zrecenzować. |
| **Adaptacja do postępów** | Ćwiczenia wpływają na kolejne rozdziały. Kurs "żyje". |
| **Skalowalność** | 100 userów z tym samym profilem = ten sam wariant, zero dodatkowych LLM calls |
| **Spaced repetition** | LECTOR-style review scheduling. 90.2% success rate w badaniach |

### Kluczowe ryzyki

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Upfront cost** | 360 wariantów × review = dużo pracy z góry | Batch API + QA agent. ~$10 + 2 dni pracy |
| **Freshness** | Pre-generowane treści starzeją się | Cron co tydzień/miesiąc odświeża pool |
| **Pokrycie profili** | User z niestandardowym profilem nie ma wariantu | Fallback: generuj ad-hoc jak teraz |
| **Complexity** | Dwa tryby: pool-based + ad-hoc. Więcej kodu do utrzymania | Feature flag na pool-based, ad-hoc jako default |
| **Adaptive loop** | Wymaga wystarczającej ilości danych z ćwiczeń | Fallback: statyczny poziom do zebrania 3+ ćwiczeń |

### Szacunek kosztów

**Offline (jednorazowo):**
- 360 wariantów × Sonnet Batch: ~$5-10
- QA review (Haiku Batch): ~$1-2
- **Total setup: ~$10-15**

**Online (per user):**
- Content selection + adaptation: ~$0.01 (Haiku)
- Adaptive adjustments: ~$0.005/rozdział
- **Total per kurs: ~$0.05-0.10** (5-10× tańsze niż obecne, 10-30× tańsze niż agentowe)

---

## 6. Dyskusja porównawcza

### Macierz porównawcza

| Kryterium | Obecne | A: Agentowe | B: RAG+Graph | C: Pool+Adaptive |
|-----------|--------|-------------|--------------|-------------------|
| **Jakość treści** | Medium | High | Medium-High | Medium-High |
| **Personalizacja** | Shallow | Deep | Structural | Medium + Adaptive |
| **Aktualność** | Stale | Fresh (web search) | Depends on corpus | Stale (refresh cron) |
| **Źródła/cytowania** | None | Full (URLs, dates) | Corpus-grounded | Pre-verified |
| **QA gate** | None (log only) | Built-in (subagent) | None (manual) | Pre-reviewed pool |
| **Spójność kursu** | Low (flat list) | Medium (agent decides) | High (graph order) | High (curated pool) |
| **Latencja** | ~30-60s | ~2-5 min | ~20-40s | ~5-10s |
| **Koszt per kurs** | ~$0.02-0.30 | ~$1.00-1.50 | ~$0.01-0.25 | ~$0.05-0.10 |
| **Koszt setup** | Done | Medium | Medium | High ($10-15 + time) |
| **Complexity** | Low | High | Medium | Medium-High |
| **Adaptacja do postępów** | None | None | None | Built-in |
| **Debuggability** | High | Low | High | High |
| **Integracja z Convex** | Native | Requires bridge | Native | Native |

### Analiza trade-off'ów

**A (Agentowe) jest najlepsze gdy:**
- Jakość i aktualność treści to priorytet #1
- Learnerzy płacą dużo (B2B, enterprise) i oczekują premium content
- Chcesz cytowań i źródeł w materiale
- Masz budżet ~$1-2/kurs
- Nie zależy ci na sub-minutowej latencji

**B (RAG+Graph) jest najlepsze gdy:**
- Masz duży korpus materiałów (video, artykuły, dokumenty)
- Zależy ci na poprawnej sekwencji nauki (prerequisites)
- Chcesz "prawdziwej" personalizacji (unikalne ścieżki, nie tylko tone adjustment)
- Chcesz zostać w ekosystemie Convex (zero nowej infrastruktury)
- Budżet na kurs musi być niski

**C (Pool+Adaptive) jest najlepsze gdy:**
- Masz wielu userów z podobnymi profilami (clustering ma sens)
- Latencja jest krytyczna (sekundy, nie minuty)
- Chcesz systemu który "uczy się" od learnera (adaptive difficulty)
- Wolisz zweryfikować treść raz niż generować od nowa za każdym razem
- Planujesz skalę (1000+ kursów/miesiąc)

### Co mówi research?

**Google Learn Your Way:** Multi-agent pipeline + multimodal generation + fine-tuned sub-models. 11% lepsza retencja vs statyczny content. → Wspiera podejście A.

**Squirrel AI:** Knowledge graph (10,000+ nano-points) + adaptive algorithms + pre-built content. 24 mln studentów. → Wspiera podejście B+C.

**Khanmigo:** Istniejące treści + LLM interaction adaptation + Socratic method. 68K → 700K userów w rok. → Wspiera podejście C (adaptacja > generacja).

**LECTOR (spaced repetition + LLM):** 90.2% success rate. → Wspiera adaptive loop z C.

**Kluczowy insight:** Systemy które wygrywają **nie wybierają jednego podejścia — warstwują je.**

### Ryzyko "over-engineering"

Cezary, brutalna prawda: obecny pipeline kosztuje $0.02/kurs i działa. Każde z trzech rozwiązań dodaje complexity. Pytanie nie brzmi "co jest najlepsze?" ale **"co da największy skok jakości za najmniejszy koszt wdrożenia?"**

---

## 7. Rekomendacja

### Ścieżka ewolucyjna (nie rewolucyjna)

Nie proponuję wyrzucić obecnego pipeline'u i zbudować agentowy monolit. Proponuję **warstwowanie** — dodawanie capabilities jedną po drugiej, gdzie każda warstwa daje mierzalną wartość.

### Faza 1: Quick wins (1-2 tygodnie, wewnątrz obecnego pipeline'u)

| # | Co | Effort | Impact | Jak |
|---|-----|--------|--------|-----|
| 1 | **QA gate w pipeline** | 3 dni | High | Dodaj krok walidacji po generateHandbook. Haiku 4.5 ocenia: plan adherence, personalizacja, styl. Fail → retry z feedbackiem. |
| 2 | **Natywny JSON mode** | 2 dni | Medium | Zamień regex-based JSON parsing na `response_schema` z Zod. Mniej błędów, prostszy kod. |
| 3 | **Migracja z Gemini 2.0 Flash** | 1 dzień | Maintenance | Fallback model deprecates 1 czerwca 2026. Zamień na 2.5 Flash. |

### Faza 2: Structural improvements (2-4 tygodnie)

| # | Co | Effort | Impact | Jak |
|---|-----|--------|--------|-----|
| 4 | **Knowledge graph w Convex** | 2-3 tyg. | High | 2 tabele (nodes, edges). Bootstrap z LLM (~50-100 konceptów AI). Topological sort → plan kursu. |
| 5 | **Convex RAG zamiast tag preselekcji** | 1-2 tyg. | Medium | Embed segment descriptions. Vector search zamiast loadAndPreselectCorpus. Oszczędność 1 LLM call/handbook. |
| 6 | **Score-based difficulty** | 1 tyg. | Medium | exerciseSubmissions → difficultyModifier w kolejnym rozdziale. Istniejące dane, minimalny kod. |

### Faza 3: Agent PoC (2-3 tygodnie, oddzielnie)

| # | Co | Effort | Impact | Jak |
|---|-----|--------|--------|-----|
| 7 | **Agent SDK PoC** | 2-3 tyg. | Strategic | 1 moduł generowany przez 3-subagent pipeline (research, write, QA). Porównaj jakość vs obecny. Zmierz koszty. |
| 8 | **Custom MCP server dla Convex** | 1 tyg. | Enabling | Agent SDK → MCP → Convex queries (profil, assessment, corpus). |

### Faza 4: Decyzja strategiczna (po PoC)

Jeśli PoC agentowy wykaże **mierzalną przewagę jakościową**, migruj generację kursów na Agent SDK:
- Orchestrator jako Convex action → spawn Agent SDK
- Subagenci w sandboxie z dostępem do MCP server (Convex, Cloudflare Stream)
- QA gate jako hard requirement
- Batch API dla non-realtime generation

Jeśli PoC **nie wykaże przewagi** — zostań na wzbogaconym pipeline (Faza 1+2) + dodaj content pool (C) dla skali.

### Docelowa architektura (jeśli PoC potwierdzi)

```
Profile XML + Knowledge Graph
    ↓
Path Generator (graph traversal, zero LLM)
    ↓
Per moduł (parallel):
    ↓
Agent SDK Orchestrator
  ├── Researcher (WebSearch + WebFetch → source_pack)
  ├── Writer (profile + source_pack + RAG segments → handbook)
  └── QA Gate (validate → pass/fail/retry)
    ↓
Convex (via MCP) → courseDocuments
    ↓
Adaptive Loop:
  User robi ćwiczenie → score → difficultyModifier → next chapter
```

### Jedno pytanie:

Czy priorytetem jest **jakość treści** (wtedy idziemy w agentów) czy **skalowalność i latencja** (wtedy idziemy w content pool + adaptive)?

Odpowiedź na to pytanie determinuje kolejność Fazy 3 vs alternatywnej ścieżki pool-based.

---

## Źródła

### Badania i artykuły
- [FOKE: Foundation Models + Knowledge Graphs for Education (Stanford)](https://arxiv.org/html/2405.03734v1)
- [LECTOR: LLM-Enhanced Spaced Repetition](https://arxiv.org/html/2508.03275v1)
- [Google "Learn Your Way"](https://research.google/blog/learn-your-way-reimagining-textbooks-with-generative-ai/)
- [Architectures for Building Agentic AI](https://arxiv.org/pdf/2512.09458)
- [Knowledge Graph Survey for Learning Paths](https://www.mdpi.com/2079-9292/15/1/238)
- [CourseKG: Educational Knowledge Graph](https://www.mdpi.com/2076-3417/14/7/2710)
- [Deep Knowledge Tracing](https://www.nature.com/articles/s41598-025-10497-x)

### Dokumentacja techniczna
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude Code Sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)
- [Gemini API Models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini ADK](https://google.github.io/adk-docs/)
- [Convex RAG Component](https://docs.convex.dev/agents/rag)
- [MCP](https://modelcontextprotocol.io/)

### Produkcyjne przykłady
- [Squirrel AI (24M students)](https://www.squirrelai.com/)
- [Khanmigo](https://www.khanacademy.org/khan-labs)
- [AWS Education RAG](https://aws.amazon.com/blogs/publicsector/generative-ai-education-building-ai-solutions-using-course-lecture-content/)
- [Magic EdTech Agentic Workflows](https://www.magicedtech.com/blogs/building-intelligent-learning-systems-agentic-ai-workflows-in-action/)
