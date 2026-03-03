# 2026-02-28 — LLM Pipeline polishing

## Co zrobione

Duży refactor pipeline'u LLM — 17 plików, ~850 linii zmian.

### Pipeline config audit
- Obniżone temperatury: handbook 0.5→0.4, exerciseGeneration 0.5→0.4 (determinizm JSON)
- Model updates: quickTip → gemini-2.5-flash, autoFill → claude-haiku-4-5
- Dodano `expect: 'object'` do exploration stages
- Fix `chatJsonForStageWithSources` — webSearchSources traciły się w storeLog

### Obserwability
- LLM Logs: badge web search + reasoning przy nazwach akcji
- Detail modal: sekcja Sources z klikalnymi linkami
- Schema: nowe pola `webSearchUsed`, `webSearchSources`, `reasoningUsed`
- Wszystkie LLM calls logują `clerkUserId` (wcześniej exerciseAi pomijał)

### Debug panel
- Export Course button (dump handbooks + profile + playbook jako .md)
- Updated model list (gemini-2.5-flash, gemini-2.5-flash-lite, gpt-4.1, claude-sonnet-4.5)
- Pipeline config table z web search i reasoning kolumnami
- Usunięty global reasoning toggle (code-defined per-stage)

### Fix: podwójne odpalanie LLM calls
Root cause: `useEffect` w `PlanStep.tsx` — callbacki w deps zmieniały referencję przy każdym update profilu. Efekt: playbook 2x, quickTip 2x, handbook 6x (3 per playbook).

Fix: `useRef` guardy (`tipFiredRef`, `outlineFiredRef`, `courseFiredRef`) + zawężone deps callbacków.

### Simplification
- `buildInternalLogContext` → sync (bez DB call po usunięciu reasoning config)
- `prepareAuthenticatedLlmAction` deleguje do `buildInternalLogContext`
- `buildProviderOptions` liczone raz zamiast 2x w retry loop
- `ConfigKey` enum zamiast raw stringów w UI
- Mid-file import fix w debugContent.ts

## Notatki techniczne

Pattern z `useRef` guardami w React effects to standard "fire-once" — ale prawdziwy fix to stabilne callbacki. Tu deps muszą zawierać `profile` fields bo callbacks ich czytają, więc guard jest jedynym sensownym rozwiązaniem bez `useReducer`.

Usunięcie globalnego reasoning toggle to dobra decyzja. Per-stage config w kodzie jest wystarczająca — nie ma scenariusza gdzie admin chce globalnie wyłączyć reasoning bez deploy'u.
