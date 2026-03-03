# 2026-02-17 — Corpus preselection

## Problem

Workflow video → corpus → manual wstrzykiwał cały korpus do promptu generacji handbooków.
Przy 500 segmentach (~125 tokenów/segment) to ~62.5k tokenów szumu w prompcie.
Technicznie mieści się w 1M kontekście Gemini Flash, ale:

1. LLM dostaje szum — musi sam wyszukać 5-10 relevantnych segmentów z setek
2. Koszt rośnie liniowo: korpus ładowany 5× per user (raz na stronę handbooka)
3. Brak filtrowania per-page — strona o "prompt engineering" dostawała segmenty o Excelu

## Rozwiązanie

Dodany **LLM preselection step** między korpusem a generacją.

### Architektura

```
knowledgeCorpora
  ├── content (YAML-like text, backward compat)
  └── segments (JSON array, structured) ← NOWE
        ↓
  preselectCorpusSegments()
    ├── Buduje kompaktowy katalog (~30 tok/segment vs ~125)
    ├── LLM wybiera top-N indices z katalogu
    └── Rekonstruuje YAML text tylko z wybranych segmentów
        ↓
  generateHandbookInternal / generatePlaybook
    └── Dostaje przefiltrowany korpus
```

### Kluczowe decyzje

- **Kompaktowy katalog** — preselekcja nie potrzebuje videoFile/timestamps, tylko semantykę.
  Format: `[0] prompt_writing/beginner: "User enters prompt" | Shows workflow [verified]`
- **Fallback** — jeśli preselekcja fail lub korpus ≤15 segmentów → stare zachowanie
- **Dwa progi** — handbook (per-page): max 15 segmentów, playbook (all pages): max 30
- **Same model** — ten sam model co reszta pipeline (configurable via LLM_MODEL_GLOBAL)
- **Structured segments w corpus** — `knowledgeCorpora.segments` (JSON string, optional)
  pozwala uniknąć parsowania YAML-like textu. Legacy corpora parsowane z textu.

### Pliki

- `convex/lib/corpusPreselection.ts` — nowy moduł, cała logika preselekcji
- `convex/admin/corpus.ts` — merge() buduje i zapisuje structured segments
- `convex/schema.ts` — `segments` field w knowledgeCorpora
- `convex/courseAi.ts` — handbook generation używa preselekcji
- `convex/ai.ts` — playbook generation używa preselekcji

### Konwencje

- `chatJsonWithRetries` z 2 retries (vs 3 standardowe) — optymalizacja, nie krytyczny krok
- `startActiveObservation` z Langfuse span
- `console.info/warn` na każdym etapie decision — skip, preselect, fallback
- Graceful degradation: zawsze zwraca corpus text (preselected albo pełny)

### Polish pass

Code review wyłapał duplikację i wyeliminowałem ją:

- **`loadAndPreselectCorpus()`** — wyciągnięty helper konsolidujący powtórzony blok
  load-corpus → preselect → format z `ai.ts` i `courseAi.ts`. Obie strony zredukowane do
  jednego wywołania.
- **`buildCorpusText()`** wyeksportowane i reużyte w `corpus.ts` merge — eliminuje podwójne
  parsowanie metadanych i zduplikowaną serializację YAML.
- **`PROFILE_SUMMARY_MAX_CHARS`** — named constant zamiast magic number `800`.
- Usunięte nieużywane importy `Id` z `ai.ts`.
