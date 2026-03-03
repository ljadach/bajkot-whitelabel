# Audyt bezpieczeństwa AITutoro

Data: 2026-03-01  
Zakres: backend Convex (`convex/`) + krytyczne ścieżki frontendu (`src/`)  
Metoda: ręczny przegląd kodu + `npm run lint` (status: `0`, z ostrzeżeniami SSR dla `/about/contact`)

## Executive summary

Ocena ogólna: **umiarkowane ryzyko**.

Najpoważniejsze ryzyko nadal dotyczy logiki płatności, gdzie klient może sam oznaczyć płatność jako zakończoną.

Liczba ustaleń:
- `CRITICAL`: 1
- `HIGH`: 2
- `MEDIUM`: 2
- `LOW`: 2

## Ustalenia

## [CRITICAL] Client-controlled payment completion (bypass)

Lokalizacja:
- `convex/profiles.ts:373`
- `convex/profiles.ts:387`
- `convex/profiles.ts:391`

Opis:
- Publiczna mutacja `updatePaymentStatus` pozwala każdemu zalogowanemu użytkownikowi ustawić dowolny `status` (`v.string()`).
- Ustawienie `status: "completed"` automatycznie ustawia `currentStep: "complete"`.
- Brakuje serwerowej weryfikacji transakcji (np. webhook + podpis Stripe).

Ryzyko:
- Obejście kontroli płatności i błędne oznaczanie kont jako opłacone.
- Niespójność danych billingowych i ryzyko strat finansowych.

Rekomendacja:
- Usunąć tę mutację z publicznego API lub ograniczyć do `internalMutation`.
- Zmieniać status płatności wyłącznie przez zweryfikowany webhook.
- Zastąpić `v.string()` ścisłym enumem statusów.

## [HIGH] IDOR/BOLA w endpointach exercises

Lokalizacja:
- `convex/exercises.ts:31`
- `convex/exercises.ts:70`
- `convex/exercises.ts:175`
- `convex/exercises.ts:262`

Opis:
- `getExerciseForChapter`, `getExercisesForDocument`, `getHint`, `submitExercise` sprawdzają autentykację, ale nie sprawdzają własności `courseDocumentId` / `exerciseId`.
- Użytkownik z cudzym ID może czytać ćwiczenia i hinty oraz tworzyć submity dla cudzego ćwiczenia.

Ryzyko:
- Nieautoryzowany dostęp do treści ćwiczeń i artefaktów nauki innych użytkowników.

Rekomendacja:
- Dodać wspólny helper `assertOwnCourseDocument`/`assertOwnExercise`.
- Przed każdym odczytem/zapisem walidować ownera dokumentu/ćwiczenia.

## [HIGH] Manipulacja metrykami progresu (integrity abuse)

Lokalizacja:
- `convex/progress.ts:300`
- `convex/progress.ts:346`
- `convex/progress.ts:398`
- `convex/teamProgress.ts:95`
- `convex/teamProgress.ts:183`

Opis:
- Endpointy progresu przyjmują dowolne `chapterNumber` i `secondsToAdd`, bez walidacji zakresu.
- Brakuje walidacji, czy `courseDocumentId` należy do użytkownika wywołującego mutację.
- Agregacje zespołowe liczą wszystkie wpisy `chapterProgress` ze statusem `completed`, co pozwala sztucznie pompować completion.

Ryzyko:
- Fałszowanie metryk dashboardów (indywidualnych i zespołowych), potencjalnie także rankingów i KPI.

Rekomendacja:
- Walidować `chapterNumber` do `1..3`.
- Walidować `secondsToAdd > 0` i sensowny upper bound.
- Wymusić ownership check dla `courseDocumentId`.

## [MEDIUM] Publiczny formularz kontaktowy podatny na spam-flood

Lokalizacja:
- `convex/contact.ts:22`
- `convex/contact.ts:78`

Opis:
- `submitContactForm` jest publiczny i ma wyłącznie rate limit per e-mail.
- Brakuje globalnego throttlingu, captcha, honeypota i minimalnego czasu wypełniania.

Ryzyko:
- Łatwe obejście limitu przez rotację adresów e-mail.
- Spam w tabeli `contactSubmissions` i obciążenie operacyjne.

Rekomendacja:
- Dodać globalny limit (okno czasowe).
- Dodać captcha/honeypot oraz minimalny czas wypełniania.

## [MEDIUM] Zbyt szeroki dostęp do mapy streamów wideo

Lokalizacja:
- `convex/videoLookup.ts:23`
- `convex/videoLookup.ts:31`

Opis:
- Każdy zalogowany użytkownik dostaje mapę wszystkich przetworzonych filmów (`fileName` + `cloudflareStreamUid`), bez scoping per user/organization/rola.

Ryzyko:
- Niepotrzebna ekspozycja identyfikatorów materiałów wideo poza docelową grupę.

Rekomendacja:
- Ograniczyć odpowiedź do dozwolonego zbioru filmów (np. per kurs/organizacja).
- Rozważyć endpoint per dokument zamiast globalnej mapy.

## [LOW] Potencjalna enumeracja zaproszeń między organizacjami

Lokalizacja:
- `convex/organizations.ts:199`
- `convex/organizations.ts:204`

Opis:
- `inviteMember` sprawdza istniejące zaproszenie po indeksie `by_email` (globalnie), a nie w ramach `organizationId`.
- Manager/admin jednej organizacji może po komunikacie błędu inferować aktywne zaproszenie do innej organizacji.

Ryzyko:
- Niski wyciek metadanych o procesach rekrutacji/invite.

Rekomendacja:
- Indeks + check w zakresie `organizationId + email`.
- Ujednolicić komunikat błędu, by ograniczyć sygnał enumeracyjny.

## [LOW] Brak rate limitu na walidacji tokenu sesji

Lokalizacja:
- `convex/sessions.ts:59`

Opis:
- `getSessionIdFromToken` jest publicznym query bez dodatkowego throttlingu.
- Tokeny są losowe i długie, ale endpoint można masowo odpytwać.

Ryzyko:
- Niskie: abuse zasobów (query flood), mimo niskiego ryzyka skutecznego brute force tokenów.

Rekomendacja:
- Dodać prosty rate-limit per IP/fingerprint (lub per anonimowy identyfikator klienta).

## Co zostało już poprawione od wcześniejszych audytów

Pozytywne zmiany potwierdzone w kodzie:
- `convex/streaming.ts`: brak wildcard CORS, whitelist origin.
- `convex/organizations.ts`: `acceptInvite` weryfikuje zgodność e-mail zaproszenia z tożsamością.
- `convex/autoFillChat.ts`: endpoint debug auto-fill wymaga `assertAdmin` i ma limitowanie + walidację wejścia.
- `convex/prompts.ts`: endpoint promptów ograniczony do admina.
- `convex/sessions.ts`: endpoint tokenu nie zwraca `clerkUserId` (tylko `valid`).
- `convex/leads.ts`: dodane anti-spam (honeypot, min fill time, global rate limit, opcjonalna captcha).

## Priorytety napraw

P0:
- Zamknąć bypass płatności (`profiles.updatePaymentStatus`).

P1:
- Dodać ownership checks w `exercises.ts`.
- Uszczelnić walidację i ownership w `progress.ts`.

P2:
- Wzmocnić antyspam w `contact.ts`.
- Ograniczyć zakres `videoLookup.getVideoStreamMap`.

P3:
- Zawęzić check invite po e-mailu do scope organizacji.
- Dodać throttling dla `sessions.getSessionIdFromToken`.
