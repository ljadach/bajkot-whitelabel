# Security Remediation Plan

Data: 2026-02-08  
Zakres: audyt backendu Convex + przepływów frontendowych używających tych endpointów.  
Uwaga: zgodnie z decyzją zespołu ten dokument celowo pomija punkt nr 6 z audytu.

## Cel

Ten plik jest checklistą naprawczą. Każdy punkt zawiera:
- co jest podatne,
- jakie jest ryzyko,
- co zmienić w kodzie,
- jak sprawdzić, że naprawa działa.

## Priorytet wdrożenia

1. `SEC-01` Publiczny endpoint LLM bez auth/rate limit (krytyczne).
2. `SEC-02` Invite token bez związania z e-mailem (wysokie).
3. `SEC-03` IDOR/BOLA w exercises/progress (wysokie).
4. `SEC-04` Publiczny endpoint promptów Langfuse (średnie).
5. `SEC-05` Ekspozycja `clerkUserId` przez token sesji (średnie).
6. `SEC-07` Endpoint leadów podatny na spam (średnie).

---

## SEC-01: Publiczny endpoint LLM bez auth/rate limit

### Gdzie
- `convex/autoFillChat.ts:74`
- `convex/autoFillChat.ts:92`
- `convex/autoFillChat.ts:132`
- użycie po stronie UI: `src/components/steps/ChatStep.tsx:82`

### Ryzyko
- Dowolny klient może wywoływać akcję i generować kosztowne requesty do modelu.
- Ryzyko drenowania budżetu API i degradacji dostępności.

### Plan naprawy
- Dodać twardą autoryzację w `generateAutoFillResponse`:
  - minimum: `ctx.auth.getUserIdentity()` + reject dla anonimowych.
  - zalecane (feature debug): `assertAdmin(ctx)` i tylko dla adminów.
- Dodać rate limit jak dla innych akcji LLM (np. `internal.rateLimitMutation.checkAndRecordLLMRateLimit`).
- Dodać limity inputu:
  - maksymalna długość `customPersona`, `currentQuestion`,
  - limit liczby i długości pozycji `chatHistory`.
- Rozważyć wyłączenie funkcji w prod (feature flag).

### Kryteria akceptacji
- Użytkownik anonimowy dostaje błąd autoryzacji.
- Użytkownik nie-admin (jeśli debug-only) dostaje błąd autoryzacji.
- Po przekroczeniu limitu requestów zwracany jest kontrolowany błąd rate limit.
- Brak niekontrolowanych spike’ów kosztowych w logach po teście obciążeniowym.

---

## SEC-02: Invite token bez związania z adresem e-mail

### Gdzie
- `convex/organizations.ts:220`
- `convex/organizations.ts:232`
- `convex/organizations.ts:258`

### Ryzyko
- Osoba z przechwyconym tokenem może zaakceptować zaproszenie nieprzeznaczone dla niej.
- To bypass kontroli dostępu do organizacji.

### Plan naprawy
- W `acceptInvite` porównać `invite.email` z e-mailem zalogowanego usera (`identity.email`), po normalizacji.
- Przy braku e-maila w tożsamości odrzucać akceptację.
- Zachować statusy `pending/accepted/expired`, ale dodać jawny błąd dla mismatch e-mail.
- Dodać audyt zdarzeń:
  - poprawne użycie tokenu,
  - próba użycia tokenu przez inny adres.

### Kryteria akceptacji
- Token działa tylko dla konta z dopasowanym e-mailem.
- Użycie tokenu przez inne konto zawsze kończy się odmową.
- Testy pokrywają scenariusze: valid token + wrong email, expired token, reused token.

---

## SEC-03: IDOR/BOLA w exercises i progress (brak ownership check)

### Gdzie (przykłady)
- `convex/exercises.ts:52`
- `convex/exercises.ts:70`
- `convex/exercises.ts:175`
- `convex/exercises.ts:262`
- `convex/progress.ts:271`
- `convex/progress.ts:317`
- `convex/progress.ts:369`

### Ryzyko
- Zalogowany użytkownik może odpytywać lub modyfikować dane kursu innego użytkownika, znając ID dokumentu/ćwiczenia.

### Plan naprawy
- Wprowadzić wspólny helper autoryzacyjny, np. `assertOwnCourseDocument(ctx, clerkUserId, courseDocumentId)`.
- W `exercises.ts`:
  - `getExerciseForChapter`, `getExercisesForDocument`: sprawdzać, że dokument należy do usera.
  - `submitExercise`, `getHint`: po `exerciseId` sprawdzać ownera dokumentu ćwiczenia.
- W `progress.ts`:
  - `startChapter`, `completeChapter`, `recordTimeSpent`, `getChapterStatus` sprawdzać ownership dokumentu.
- Dodać walidację granic:
  - `chapterNumber` tylko 1..3,
  - `secondsToAdd` > 0 i rozsądny upper bound.

### Kryteria akceptacji
- Próba użycia cudzego `courseDocumentId` lub `exerciseId` kończy się odmową.
- Własne dane nadal działają bez regresji.
- Testy negatywne (cross-user) przechodzą dla wszystkich punktów wejścia.

---

## SEC-04: Publiczny endpoint do pobierania promptów Langfuse

### Gdzie
- `convex/prompts.ts:5`
- `convex/prompts.ts:12`

### Ryzyko
- Możliwy wyciek treści promptów i konfiguracji prompt management.
- Ułatwiony reverse engineering logiki aplikacji AI.

### Plan naprawy
- Jeśli endpoint jest debug-only: dodać `assertAdmin(ctx)`.
- Jeśli musi być publiczny:
  - wprowadzić allowlist nazw promptów,
  - zwracać tylko minimalne dane (bez surowych treści/system promptów),
  - dodać rate limit i monitoring.

### Kryteria akceptacji
- Nieautoryzowany użytkownik nie może pobrać promptów debugowych.
- Zwracany payload nie zawiera wrażliwych informacji o promptach (zgodnie z policy).

---

## SEC-05: Ekspozycja `clerkUserId` przez token sesji

### Gdzie
- `convex/sessions.ts:52`
- `convex/sessions.ts:58`
- `convex/sessions.ts:72`
- `src/hooks/useSessionToken.tsx:56`
- `src/hooks/useSessionToken.tsx:71`

### Ryzyko
- Token daje mapowanie do stałego identyfikatora użytkownika.
- Przechwycenie tokenu zwiększa możliwość korelowania tożsamości między systemami.
- Trwałe przechowywanie tokenu w `localStorage` zwiększa skutki ewentualnego XSS.

### Plan naprawy
- Nie zwracać `clerkUserId` z `getSessionIdFromToken`; zwracać wynik techniczny (np. `valid: true`) albo jednorazowy, krótko żyjący artefakt.
- Rozważyć:
  - skrócenie TTL tokenów,
  - jednorazowość tokenu,
  - hash tokenu w DB zamiast plaintext.
- Po stronie frontu ograniczyć trwałość:
  - preferować `sessionStorage` zamiast `localStorage` (lub tryb opt-in).

### Kryteria akceptacji
- API nie ujawnia bezpośrednio `clerkUserId`.
- Token przechwycony po czasie/po użyciu nie nadaje się do ponownego użycia (jeśli wdrożona jednorazowość).

---

## SEC-07: Endpoint leadów podatny na spam

### Gdzie
- `convex/leads.ts:232`
- `convex/leads.ts:263`
- `convex/leads.ts:34`
- `convex/leads.ts:44`

### Ryzyko
- Limit wyłącznie per e-mail można łatwo obejść rotacją adresów.
- Możliwe masowe spam submission + koszty operacyjne.

### Plan naprawy
- Dodać bot protection:
  - Cloudflare Turnstile/hCaptcha i walidacja tokenu po stronie backendu.
- Dodać dodatkowe heurystyki:
  - honeypot field,
  - minimalny czas wypełnienia formularza,
  - limity globalne (na okno czasowe), nie tylko per e-mail.
- Dodać alertowanie na anomaliach liczby leadów.

### Kryteria akceptacji
- Submission bez poprawnego captcha tokenu jest odrzucany.
- Test spamowy z wieloma różnymi e-mailami wpada w limity/ochronę.

---

## Proponowany plan realizacji (krótki)

1. Sprint 1: `SEC-01`, `SEC-02`, `SEC-03` + testy bezpieczeństwa.
2. Sprint 2: `SEC-04`, `SEC-05` (zmiany API sesji mogą wymagać migracji frontu).
3. Sprint 3: `SEC-07` + obserwowalność i alerty antyspamowe.

## Definition of Done (całość)

- Wszystkie powyższe punkty mają wdrożone fixy i testy negatywne.
- Manual testy autoryzacji wykonane dla każdego publicznego endpointu.
- Brak endpointów debugowych dostępnych dla nieuprawnionych użytkowników.
