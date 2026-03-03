# 2026-02-15 — Audyt jakości kodu

## Kontekst

Pełny audyt jakości kodu codebase — backend (Convex) i frontend (React). Dwa równoległe agenty przeszły ~60 plików, szukając problemów z typami, bezpieczeństwem, performance, error handling, a11y i spójnością wzorców.

## Wyniki

| Warstwa | Ocena | Verdict |
|---------|-------|---------|
| Backend (Convex) | 7/10 | Solidna architektura, spójne wzorce, normalny tech debt |
| Frontend (React) | 6/10 | Działa, ale wymaga hardening — typy, a11y, error boundaries |

Backend: 5 HIGH, 18 MEDIUM, 7 LOW.
Frontend: 5 HIGH, 5 MEDIUM, reszta LOW.

## Backend — co boli

### HIGH severity

1. **Brakujące `returns` validators** — `config.ts:33`, `ai.ts:126`. Łamie własne reguły z CLAUDE.md. Najłatwiejszy fix w całym audycie.
2. **`.filter()` zamiast indeksu** — `exercises.ts:151`. Pobiera WSZYSTKIE submissions usera, potem filtruje client-side po `courseDocumentId`. Brakuje composite indexu `by_user_document` w schema.
3. **Unbounded `.collect()`** — `progress.ts:193`. Activity logs bez limitu. Przy aktywnym userze z tysiącami eventów = timeout.
4. **Brak input validation** — `exercises.ts:164` przyjmuje `submissionText: v.string()` bez max length. Ktoś może uploadować megabajt tekstu.
5. **Brak rate limit na `admin/config.set`** — inne admin mutations mają, ta nie.

### Wzorce które działają

- Rate limiting konsekwentny (poza jednym wyjątkiem powyżej)
- Auth patterns spójne — `assertAdmin` + audit log
- Convex conventions przestrzegane
- Langfuse observability z graceful degradation (no-op gdy brak kluczy)
- Retry logic w `llmClient.ts`

### Tech debt markers

11 komentarzy `@robustness` w schema bez powiązanych GitHub issues:
- `rateLimits.calls` — array rośnie per user bez cleanup crona
- `backendLogs` — brak retention policy, tabela rośnie w nieskończoność
- `planOutline`, `planFull`, `profileState` — JSON-in-strings zamiast typed objects
- N+1 query w `admin/videos.ts` (loop po videos + query segments per video)

10 plików z `any` type — głównie `ai.ts`, `llmClient.ts`, `langfuse.ts`, `roles.ts`.

## Frontend — co boli

### HIGH severity

1. **24 pliki z `any` type** — ChatStep, SummaryStep, planHelpers. TypeScript bez typów to JavaScript z extra krokami.
2. **Brak error boundaries** — tylko ChatStep ma ErrorBoundary. Reszta step components = biały ekran przy crashu.
3. **Accessibility: 3/10** — brak ARIA labels na interaktywnych elementach, brak keyboard navigation, brak focus trapping w modalach. WCAG Level A failure.
4. **Wyłączony eslint exhaustive-deps** — `ChatStep.tsx:199`. Stale closure bug czeka na trigger.
5. **God component `App.tsx`** — 738 linii. HomePage + routing + breadcrumbs + language detection w jednym pliku.

### Wzorce które działają

- Dobra separacja w `/course/` — HandbookContent, ExercisePanel, LearningTools
- Lazy loading AdminLayout
- Proper useMemo w PlanStep
- Clean step components pattern

### Drobniejsze

- 52 console.log/debug/error statements w 23 plikach — brak proper logging
- Mutex pattern w ChatStep (`operationLockRef`) — fragile, lepiej state machine
- Mieszane naming conventions — `handleSubmit` vs `onSubmit`, `loading` vs `isLoading`

## Plan naprawy

### Ten tydzień (~2h)

- Dodać brakujące `returns` validators
- Dodać indeks `by_user_document` w schema + użyć w exercises.ts
- Dodać max length na `submissionText`
- Dodać rate limit na `admin/config.set`

### Ten miesiąc (~1 dzień)

- Error boundaries na wszystkie step components
- Zamiana `any` na proper types (backend + frontend)
- Retention policy dla `backendLogs` (scheduled cleanup)
- Bounded `.collect()` w `progress.ts`

### Kiedyś

- A11y audit i naprawa WCAG
- Pagination w admin queries
- Cleanup cron dla `rateLimits.calls`
- Refactor App.tsx — wyciągnięcie HomePage
- State machine zamiast mutex w ChatStep
- GitHub issues dla wszystkich `@robustness` comments

## Wnioski

Kod jest production-ready na obecną skalę. Żadnych critical security holes, żadnych data corruption risks. Największe ryzyko to performance przy wzroście bazy użytkowników — unbounded queries i brakujące indeksy uderzą pierwsze. Type safety to drugi front — 34 pliki z `any` (łącznie backend + frontend) to bomba zegarowa na runtime errors.

Najlepszy ROI: 2 godziny na fixy z "tego tygodnia" dają spokój na następne kilka miesięcy skalowania.
