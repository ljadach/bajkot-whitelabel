# Decision Log — bajkot-pipeline

Log decyzji podjętych w trakcie projektu. Kazda decyzja jako oddzielna sekcja z datą, kontekstem, decyzją i konsekwencjami.

---

## 2026-03-04 — Struktura zespolu agentowego

**Kontekst:** Projekt wymaga portu pipeline'u z zewnetrznego repo do istniejacego frameworka Convex. Duzo pracy w roznych domenach (schemat, prompty, UI, logika pipeline'u).

**Decyzja:** 10 wyspecjalizowanych agentow w 5 falach. Research rownolegle, potem architektura, potem implementacja rownolegle, potem pipeline, potem weryfikacja.

**Konsekwencje:**
- Kazdy agent ma waski zakres odpowiedzialnosci
- Fale wymuszaja sekwencyjnosc tam gdzie jest zaleznosc (np. schemat przed pipeline'em)
- Rownoleglosc wewnatrz fal przyspiesza prace

---

## 2026-03-04 — 3 tabele zamiast rozbudowanego modelu

**Kontekst:** Pipeline produkuje ~10 artefaktow (JSON) i ~9 obrazow na zamowienie. Trzeba zdecydowac ile tabel w Convex.

**Decyzja:** 3 tabele: `bookOrders` (zamowienie + status + artefakty jako JSON strings), `bookIllustrations` (obrazy z Convex storage ID), `bookPrompts` (opcjonalne, prompty do edycji runtime). Artefakty agentow to pola JSON-string na `bookOrders`, nie osobna tabela.

**Konsekwencje:**
- Prostsze zapytania — jeden `ctx.db.get(orderId)` daje wszystko
- Zgodne z istniejacym wzorcem bajkot (`planOutline`/`planFull` jako JSON strings)
- Tracimy type safety na poziomie DB — mitygowane przez TypeScript interfaces w `bookTypes.ts`
- Ilustracje w osobnej tabeli bo jest ich 7+ i maja storageId

---

## 2026-03-04 — Kazdy agent jako osobny internalAction

**Kontekst:** Pipeline trwa 3-15 minut. Convex action timeout = 10 min. Nie mozna uruchomic calego pipeline'u w jednej akcji.

**Decyzja:** Kazdy agent (A0-A11) to osobny `internalAction` w `bookAgents.ts`. Chainowanie przez `ctx.scheduler.runAfter(0, nextAgent, { orderId })`. Jedyny publiczny endpoint to `startOrder` (auth + rate limit + schedule A0).

**Konsekwencje:**
- Kazdy agent miesci sie w limicie czasu (najdluzszy A7 ~5 min na 7 obrazow)
- Naturalny punkt odzysku — jesli agent padnie, mozna go restartowac
- Status widoczny w real-time (kazdy agent updateuje `bookOrders.status`)
- `bookPipelineHelpers.ts` jako osobny plik bez `"use node"` — queries/mutations oddzielone od actions

---

## 2026-03-04 — Parallel fork z join mutation

**Kontekst:** Po A1 pipeline rozdziela sie na story track (A2-A5) i image track (A6-A6b). Trzeba je zsynchronizowac przed A7.

**Decyzja:** A1 scheduluje oba tracki rownolegle. `checkParallelTracksComplete` mutation w `bookPipelineHelpers.ts` sprawdza czy `illustrationPlan` (A5 output) i `chosenStyle` (vote) istnieja. A5 i `submitStyleVote` oba wywoluja te mutation. Gdy oba gotowe — scheduluje A7.

**Konsekwencje:**
- Brak race condition — mutations w Convex sa serialized
- Prosty warunek: 2 pola non-null = ready
- Nie trzeba dodatkowej tabeli ani flagi stanu

---

## 2026-03-04 — Style vote jako mutation z pauzą pipeline'u

**Kontekst:** W oryginalnym pipeline vote czeka na in-memory Promise z 15-min timeout. W Convex nie ma persistent in-memory state.

**Decyzja:** A6 generuje 2 obrazy referencyjne (Style A: mixed-media Rocio Bonilla, Style B: watercolor Jona Jung), zapisuje je w Convex storage, ustawia `status: 'style_vote'`. Pipeline sie zatrzymuje. Frontend subskrybuje status, pokazuje UI z dwoma obrazami. Rodzic klika — `submitStyleVote` mutation zapisuje wybor i triggeruje join check.

**Konsekwencje:**
- Brak timeout (na MVP) — rodzic moze zaglosowac kiedy chce
- Pipeline nie marnuje zasobow na polling/czekanie
- Human-in-the-loop przez reactive query, nie SSE/websocket

---

## 2026-03-04 — jsPDF zamiast PDFKit

**Kontekst:** Architektura proponowala PDFKit z `"use node"`. Problem: PDFKit ma natywne dependencje (canvas, fontkit) ktore moga nie dzialac w Convex Node.js runtime.

**Decyzja:** Uzyc jsPDF (pure JavaScript, zero natywnych dependencji). Dynamiczny import w `bookComposer.ts` (`await import('jspdf')`). Format: 210mm kwadrat, 16 stron (cover, dedication, 6 beatow x 2 strony, parent card, back cover).

**Konsekwencje:**
- Zero ryzyka z natywnymi addonami
- Brak wsparcia dla polskich znakow w domyslnych fontach — do rozwiazania (embeddowanie fontu TTF)
- Obrazy base64-encoded z fetch + btoa — proste ale moze byc pamieciozerne dla duzych PNG

---

## 2026-03-04 — Gemini Imagen przez bezposredni REST

**Kontekst:** OpenRouter nie obsluguje generowania obrazow. Trzeba oddzielic text LLM od image generation.

**Decyzja:** Text LLM calls (A1-A5, A8, A10) przez istniejacy bajkot `chatJsonForStage` (OpenRouter). Image generation (A6, A7) przez bezposredni REST do Gemini API (`gemini-2.5-flash-image`). Klient w `convex/lib/geminiImageGen.ts`. Rate limiting: min 2s miedzy callami, retry z exponential backoff, 30s wait na 429.

**Konsekwencje:**
- Reuse istniejacego `GOOGLE_GENERATIVE_AI_API_KEY`
- Dwa rozne klienty w pipeline'u — ale jasno rozdzielone
- Fallback: 1x1 bialy PNG placeholder jesli Gemini niedostepne

---

## 2026-03-04 — Prompty w PromptTemplate enum + bookFallbacks.ts

**Kontekst:** Oryginalny pipeline ma 14 plikow .md. Bajkot ma system PromptTemplate + Langfuse fallback.

**Decyzja:** Port 14 promptow do `convex/lib/prompts/bookFallbacks.ts` jako TypeScript string arrays (join '\n'). Nowe enum values w PromptTemplate: `BookIntake`, `BookChildProfiler`, `BookStoryArchitect`, `BookStoryWriter`, `BookPsychReviewer`, `BookArtDirector`, `BookCharacterDesigner`, `BookIllustrator`, `BookVisualQa`, `BookComposer`, `BookFinalQa`, `BookDelivery`. Kazdy z system + user wariantem.

**Konsekwencje:**
- Spojne z reszta bajkot
- Langfuse moze nadpisac fallbacki runtime
- Prompty zachowuja oryginalna strukture (rola, instrukcje, format JSON)

---

## 2026-03-04 — Pipeline stages w LLM config

**Kontekst:** Bajkot ma centralny `pipelineConfig.ts` z modelami i parametrami per stage.

**Decyzja:** 7 nowych stages: `book.profiling`, `book.storyPlanning`, `book.storyWriting`, `book.psychReview`, `book.artDirection`, `book.visualQa`, `book.finalQa`. Wszystkie na `google/gemini-2.5-flash`. Temperature od 0.2 (finalQa) do 0.8 (storyWriting). A6/A7/A9/A11 nie uzywaja LLM pipeline — maja wlasne klienty.

**Konsekwencje:**
- Centralna konfiguracja modeli
- Latwa zmiana modelu na GPT-4o/Claude bez zmian w kodzie agentow
- Temperature dopasowane do zadania (niskie dla review, wyzsze dla tworzenia)

---

## 2026-03-04 — A3/A4 retry loop z limitem 3

**Kontekst:** Psych reviewer (A4) moze odrzucic historie. Potrzeba petli korekcyjnej A3->A4.

**Decyzja:** A4 zwraca `status: PASS | PASS_WITH_CORRECTIONS | FAIL`. FAIL -> retry A3 z corrections jako argument. Max 3 retry. Po limicie — proceed anyway (zachowanie demo). `retryCount` na `bookOrders`.

**Konsekwencje:**
- Gwarantowane zakonczenie — nie zapetli sie w nieskonczonosc
- PASS_WITH_CORRECTIONS: korekty dopisane do tekstu beatow (uproszczone vs oryginal)
- Oryginal mial bardziej zaawansowany system korekty (original_pl/corrected_pl) — uproszzone na MVP

---

## 2026-03-04 — Frontend jako 4 route'y z lazy loading

**Kontekst:** Bajkot uzywa React Router z lazy routes. Kazda strona ladowana dynamicznie.

**Decyzja:** 4 nowe route'y: `/book/order`, `/book/:orderId/progress`, `/book/:orderId/vote`, `/book/:orderId/result`. Kazdy to lazy-loaded wrapper importujacy komponent z `src/components/book/`. Formularz 5-krokowy (child, problem, appearance, guide, summary) z walidacja per step.

**Konsekwencje:**
- Zgodne z istniejacym wzorcem route'ow bajkot
- Code splitting — formularz nie laduje sie na stronie progresu
- i18n przez `useTranslation('book')` — klucze tlumaczen do dodania
- Formularz uzywa danych z `@lib/bookData` (frontend-facing maps z polskimi labelami)

---

## 2026-03-04 — Convex file storage zamiast S3/Cloudflare

**Kontekst:** Obrazy (2 style vote + 7 ilustracji + 1 PDF) trzeba gdzies przechowac.

**Decyzja:** Convex wbudowany file storage (`ctx.storage.store(blob)`, `ctx.storage.getUrl(storageId)`). StorageId jako `v.id('_storage')` w schemacie. URL generowany on-demand przez query.

**Konsekwencje:**
- Zero dodatkowej infrastruktury
- Automatyczny cleanup nieuzywanych plikow
- Signed URLs — bezpieczne udostepnianie
- Limit: Convex storage ma limity na planie Free — do weryfikacji dla obrazow PNG

---

## 2026-03-04 — bookData.ts zduplikowany frontend/backend

**Kontekst:** Formularz potrzebuje polskich labelow (np. "blond" -> "Blond"), backend potrzebuje angielskich tlumaczen (np. "blond" -> "blonde"). Dane musza byc spojne.

**Decyzja:** Dwa pliki `bookData.ts`: `convex/lib/bookData.ts` (backend, z ProblemDefinition, angielskie mapy) i `src/lib/bookData.ts` (frontend, z polskimi labelami do dropdownow). Klucze identyczne — walidacja w A0 sprawdza czy klucz istnieje w mapie.

**Konsekwencje:**
- Duplikacja kluczy — ryzyko rozjazdu
- Frontend nie importuje z convex (poprawne rozdzielenie)
- Do rozwiazania: wspolne zrodlo prawdy (np. shared types package)

---

## 2026-03-04 — TypeScript interfaces zamiast walidacji Zod na artefaktach

**Kontekst:** Artefakty agentow (CharacterProfile, StoryBlueprint, etc.) to JSON-stringified dane. Trzeba je jakosc typowac.

**Decyzja:** `convex/lib/bookTypes.ts` z 12 interfejsami (NormalizedOrder, CharacterProfile, StoryBlueprint, StoryDraft, PsychReview, IllustrationPlan, IllustrationSpec, VisualQa, FinalQa, etc.). JSON.parse na granicy, typowanie przez cast. Agenci uzywaja `chatJsonForStage<T>` z generycznym typem.

**Konsekwencje:**
- Brak runtime walidacji artefaktow — LLM moze zwrocic niezgodny JSON
- Mitygowane: `normalizePages()` w A3 obsluguje rozne formaty (pages/scenes/beats)
- A5 tez normalizuje: mapuje snake_case na camelCase

---

<!-- TEMPLATE dla nowych decyzji:

## RRRR-MM-DD — Tytul decyzji

**Kontekst:** Co spowodowalo potrzebe decyzji?

**Decyzja:** Co zdecydowano?

**Konsekwencje:**
- Pozytywne i negatywne skutki
- Co to oznacza dla implementacji

-->
