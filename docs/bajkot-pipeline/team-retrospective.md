# Retrospektywa zespolu — bajkot-pipeline

Data: 2026-03-04

---

## Jak pracowal zespol

10 agentow, 5 fal, jeden dzien. Kazdy agent mial wasko zdefiniowany zakres odpowiedzialnosci i dostawal kontekst od poprzednich fal. Koordynacja przez team-lead z task system.

**Fala 1 — Research (rownolegle):**
- `researcher-pipeline` — przeanalzowal trustee-book-pipeline: 14 promptow, 12 agentow (A0-A11), model danych, flow z parallel fork i human-in-the-loop style vote
- `researcher-bajkot` — przeanalyzowal konwencje bajkot: schemat Convex, PromptTemplate enum, `chatJsonForStage`, Langfuse fallback, file storage, route patterns
- `documentalist` — postawil strukture dokumentacji (README, decision-log, team-retrospective)

**Fala 2 — Architektura:**
- `architect` — stworzyl `architecture.md` (898 linii). Projekt 3 tabel, mapowanie agentow na internalAction, flow pipeline'u z parallel fork/join, file storage, frontend routes, prompt integration, pipeline stages config

**Fala 3 — Implementacja (rownolegle):**
- `schema-builder` — dodalschemat do `convex/schema.ts`: tabele `bookOrders` (30+ pol), `bookIllustrations`, `bookPrompts` z indeksami
- `prompt-porter` — sportowal 14 promptow z Markdown do `bookFallbacks.ts` jako TypeScript string constants, dodalenumvalues do PromptTemplate
- `frontend-builder` — 4 route'y + 4 komponenty: formularz 5-krokowy, progress z reactive query, style vote, result z PDF download

**Fala 4 — Pipeline:**
- `pipeline-builder` — zaimplementowal 4 pliki: `bookPipeline.ts` (public API), `bookAgents.ts` (12 agentow A0-A11), `bookPipelineHelpers.ts` (queries/mutations), `bookComposer.ts` (PDF). Plus `geminiImageGen.ts`, `bookTypes.ts`, `bookData.ts`

**Fala 5 — Weryfikacja + dokumentacja:**
- `verifier` — sprawdzenie kompilacji i integracji
- `documentalist` — finalna dokumentacja (ten dokument + decision-log + devlog)

## Co poszlo dobrze

**Architektura jako single source of truth.** `architecture.md` dzialal jako kontrakt miedzy falami. Schema-builder, prompt-porter, frontend-builder i pipeline-builder mogli pracowac rownolegle bo mieli te same spec'y.

**Waski zakres agentow.** Kazdy agent mial jasne wejscie/wyjscie. Nie bylo sytuacji "kto to powinien zrobic". Prompt-porter nie musial wiedziec jak dziala pipeline — portowal prompty. Frontend-builder nie musial wiedziec jak dziala LLM — budowal UI na API.

**Reuse istniejacych wzorcow bajkot.** Zamiast wymyslac nowe — uzyto: PromptTemplate, chatJsonForStage, Langfuse fallback, Convex file storage, lazy route loading. Zmniejszylo ilosc nowego kodu i ryzyko bledow integracji.

**Podział `bookAgents.ts` i `bookPipelineHelpers.ts`.** Rozdzielenie `"use node"` actions od queries/mutations. Czysty wzorzec: agenci czytaja dane, robia prace, piszą wynik, scheduluja nastepnego.

## Co bylo trudne

**Duplikacja danych frontend/backend.** `bookData.ts` istnieje w dwoch wersjach (convex/lib i src/lib). Klucze identyczne ale dane rozne (polskie labele vs angielskie tlumaczenia). Ryzyko rozjazdu. Brak mechanizmu wymuszenia spojnosci.

**Brak runtime walidacji artefaktow LLM.** Agenci uzywaja `chatJsonForStage<T>` z generycznym typem, ale brak Zod runtime validation na odpowiedziach. LLM moze zwrocic snake_case zamiast camelCase — mitygowane przez normalizatory (np. `normalizePages` w A3, normalizacja w A5), ale kruche.

**PDF i polskie znaki.** jsPDF uzywa domyslnych fontow ktore nie wspieraja polskich diakrytykow (a, e, o, s, z, z, c, n, l). Wymaga embeddowania fontu TTF. Na MVP moze byc problem z wyswietlaniem.

**Rozmiar bookFallbacks.ts.** 14 promptow w jednym pliku — duzo tokensw. Plik przekracza 25k tokenow. Utrudnia czytanie i edycje. Mozna podzielic na osobne pliki per agent.

## Wnioski na przyszlosc

1. **Wspólne zrodlo danych frontend/backend.** Rozwazyc shared package lub generowanie z jednego zrodla (np. JSON schema -> TS types + frontend labels + backend maps).

2. **Zod validation na artefaktach LLM.** Dodac runtime walidacje zamiast polegac na TypeScript cast. `chatJsonForStage` powinien przyjmowac Zod schema.

3. **Testowanie per agent.** Kazdy agent powinien miec unit test z mockowanym LLM response. Obecna architektura (osobne internalAction) to ulatwia.

4. **Font embedding od razu.** Nie zostawiac polskich znakow na pozniej — to krytyczne dla produktu polskojezycznego.

5. **Architektura jako dokument traktowac powaznie.** `architecture.md` sie sprawdzil. Warto inwestowac czas w architekture zanim zacznie sie kodowac — szczegolnie przy zespolach wieloagentowych.

6. **Prompt files rozbic.** Jeden plik na agenta (np. `bookPrompts/A1_child_profiler.ts`) zamiast jednego monolitu.

## Statystyki

| Metryka | Wartosc |
|---|---|
| Liczba agentow w zespole | 10 |
| Liczba fal | 5 |
| Liczba taskow | 10 (core) + agentowe |
| Pliki backend (nowe) | 7 (`bookPipeline.ts`, `bookAgents.ts`, `bookPipelineHelpers.ts`, `bookComposer.ts`, `bookTypes.ts`, `bookData.ts`, `geminiImageGen.ts`) |
| Pliki prompts (nowe) | 1 (`bookFallbacks.ts` — 14 promptow) |
| Pliki frontend (nowe) | 8 (4 route + 4 komponenty) |
| Pliki docs (nowe) | 4 (architecture.md, README.md, decision-log.md, team-retrospective.md) |
| Tabele DB (nowe) | 3 (`bookOrders`, `bookIllustrations`, `bookPrompts`) |
| Agentow w pipeline | 12 (A0-A11) |
| Ilustracji per book | 7 (cover + 6 scen) |
| Stron PDF | 16 |
