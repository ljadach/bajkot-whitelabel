# TODO — pre-launch security holes

> **STATUS po 2026-05-12: #1 częściowo (audit C1/C2/H3/H1). C3 cofnięte CAŁOŚCIOWO — public intake otwarty bez gate'u i bez rate limitu. Idziemy na produkcję świadomie z ryzykiem DoS-na-budżet. #2 dalej otwarty.**
>
> **AKTUALIZACJA 2026-07-28:** nowy audyt — `docs/security-audit-2026-07-28.md` (33 ustalenia).
> Dwie dziury niżej dalej otwarte, doszły trzy nowe klasy ryzyka: płatność, wyciek tokena
> i zgodność prawna. Skrót w sekcji „Nowe z audytu 2026-07-28" na dole tego pliku.

---

## ~~🔥🔥🔥 #1 — LANDING ACCESS TOKEN GATE JEST WYŁĄCZONY~~ ✅ ZAMKNIĘTE 2026-05-12

Zamknięte w ramach security audit (C1/C2/C3/H3) + override iteracji nad PR #44. Stan po fix:

- ~~**Intake gate (C3)**~~ — **COFNIĘTE 2026-05-12 hotfix**. Re-enable blokowało legit visitors w prod ("Server Error"). Bez fixu UX (ConvexError + frontend handling + magic-link dla cross-device) nie wracamy.
- ~~**Rate limit (C3)**~~ — **COFNIĘTE 2026-05-12 follow-up**. 10/h globalnie było za ciasne na realny ruch. Infrastructure (`checkAndRecordLandingStart`, `landing_start` config) zostaje jako dead code — jednolinijkowy revert gdy będziemy mieli per-IP klucz albo Stripe gate na intake.
- **Aktualna obrona przed DoS-na-budżet:** żadna. Świadome ryzyko na czas pre-launch. Przed kampanią marketingową: pay-first albo per-IP rate limit MUSI wrócić.
- **Server-side analytics (od 2026-05-21):** Vercel edge middleware → Convex `POST /track` → tabela `pageViews`. Widok w `/admin/analytics` (path filter, hide-bots, summary card). Daje obserwowalność "kto puka" zanim publicznie odpalimy landing gate. Raw IP + manual purge (`npx convex run analytics:purgeOld '{"olderThanMs": 2592000000}'`). Env: `ANALYTICS_SECRET` (Convex + Vercel), `CONVEX_SITE_URL` (Vercel).
- **Per-order tokeny (C2)** — każde landing order ma `accessTokenHash` (sha256 hex). Raw token zwracany raz z `startLandingOrder`, zapisywany w localStorage (`bajkot_landing_order_tokens` mapa), dołączany do każdego późniejszego wywołania (progress / vote / dedication / preview / download / print-thanks / Stripe checkout). `assertLandingOrder` weryfikuje przez timing-safe compare i fail-closes gdy hash brak (legacy data).
- **`skipStripe` killed (C1)** — public actions już nie przyjmują flagi. `isPaid()` patrzy tylko na `paymentStatus === 'completed'`. UI panel diagnostyczny zniknął.
- **H3** — `createLandingCheckoutSession` używa per-order tokena (eliminuje fail-open scenario PR #44, gdzie endpoint był otwarty dla każdego z orderId).

Świadomy UX trade-off: parent który wraca z emaila na innym browserze nie ma tokena w localStorage → musi przejść przez magic link albo support. Akceptujemy: ochrona danych dziecka > comfort cross-device.

Devlog: `docs/devlog/2026-05-12.md`. Audit doc: `docs/security-audit-2026-05-12.md` (PR #43).

---

## 🔥🔥🔥 #2 — PII DZIECI W LLM LOGACH I W LANGFUSE!!!

**Pliki:**

- `convex/llmLogs.ts` — pełne `systemPrompt` + `userPrompt` w DB (last 50 per user, retencja).
- `convex/lib/langfuse.ts` — pełne prompty w span attributes, wysyłane do Langfuse cloud.

**Co tam wpada (per call):**

- imię dziecka (`childName` z order)
- problem terapeutyczny (`problemDetail` — często bardzo osobiste, np. "boi się ciemności od śmierci dziadka")
- wiek, płeć, opis wyglądu
- czasem dedykacja od rodzica

**Konsekwencje:**

- **RODO:** mamy do czynienia z danymi osobowymi dziecka (zwłaszcza w połączeniu z `clerkUserId` rodzica). Langfuse to 3rd party. ~~prawdopodobnie poza EU~~ — **korekta 2026-07-28:** domyślny `LANGFUSE_BASE_URL` w kodzie to `https://cloud.langfuse.com`, czyli region EU; teza „poza EU" była niepotwierdzona. Do sprawdzenia: czy env produkcji (`wonderful-egret-522`) nie nadpisuje go na `us.cloud.langfuse.com`, oraz czy jest podpisane DPA. Bez DPA to nadal naruszenie.
- Wyciek danych z Langfuse = wyciek listy "co boli dzieci użytkowników".
- Audyt RODO da nam karę.

**Plan rozwiązania:**

1. **Hash promptów w DB log** zamiast pełnego tekstu (`systemPromptHash`, `userPromptHash` + structured `{ childAge, problemId, retryCount }`).
2. **Mask payload do Langfuse** — wysyłaj tylko metadane (model, agent, retryCount, finishReason, durationMs), bez treści promptów.
3. **Albo: per-field allowlist** — `childAge`, `problemId` zostają, `childName`, `problemDetail`, `dedication` wycinane przed logowaniem.
4. Audit retention — 50 logów per user może już zawierać dziesiątki bajek.

**KIEDY ZDJĄĆ Z TODO:** Gdy żadne pole identyfikujące dziecko nie wycieka do Langfuse ani do `llmLogs`.

---

## Nowe z audytu 2026-07-28

Pełna lista i cytaty kodu: `docs/security-audit-2026-07-28.md`. Triage (co naprawiamy,
co akceptujemy) jest do wyklikania — decyzje jeszcze nie zapadły. Tu tylko to, co dotyka
launchu:

- **Kupon 100% = darmowa książka.** Webhook odblokowuje zamówienie po samym
  `payment_status === 'paid'`, bez sprawdzenia kwoty i bez porównania sesji z zapisanym
  `stripeSessionId`, a Checkout ma `allow_promotion_codes: true` (`convex/stripe.ts:86,170,247-257`).
  **Do sprawdzenia w dashboardzie Stripe:** czy istnieje jakikolwiek kupon 100% i czy są
  Payment Linki — to przesądza, czy dziura jest teoretyczna czy dzisiejsza.
- **Brak obsługi refundów i płatności odroczonych.** Obsługiwany tylko
  `checkout.session.completed`; po refundzie dostęp zostaje na zawsze, a przy P24/BLIK
  (`payment_status: 'unpaid'` + brak handlera `async_payment_succeeded`) klient płaci
  i nigdy nie dostaje książki. Sprawdzić, które metody płatności są włączone.
- **Token landingowy wycieka do Google Analytics.** Linki w mailach niosą `?t=<token>`,
  a `gtag` w `<head>` wysyła pełny `location.href` zanim frontend zdejmie parametr.
  Ten token to jedyna autoryzacja do danych zamówienia dziecka.
- **Surowe IP + `bookOrderId` w `pageViews`, bezterminowo i przed zgodą.** `SKIP_PREFIXES`
  w `middleware.ts` ma `/book`, ale ścieżki landingowe to `/landing/book/…` — nie są
  pomijane. `analytics.purgeOld` istnieje, ale nie ma go w cronie.
- **Zgodność prawna (do prawnika, nie do kodu):** polityka prywatności nie wymienia
  Google/Gemini, Langfuse, Resend, PostHog ani własnego VPS jako odbiorców danych dziecka;
  zgoda na dane szczególne odebrana na „wybór problemu z listy", a wysyłamy 500 znaków
  wolnego tekstu; polityka obiecuje trwałe usuwanie PDF-ów, mail mówi „zarchiwizowany na
  zawsze" (kod potwierdza mail); brak jakiejkolwiek ścieżki realizacji praw z art. 15/17.
- **Zależności:** 43 podatności w drzewie produkcyjnym. Jedyna krytyczna pochodzi
  z **nieużywanej** paczki `@convex-dev/auth` (projekt stoi na Clerku) — usunięcie ją
  likwiduje. Osobno `react-router` 7.13.1 jest w zakresie podatnym (RCE przez turbo-stream)
  przy `ssr: true`; fix dopiero w linii 8.x, czyli migracja majorowa.

---

## Notatki

- #1 zamknięte 2026-05-12 (security audit + override merge na PR #44), ale **C3 cofnięte**
  tego samego dnia — publiczny intake jest dziś otwarty bez gate'u i bez rate-limitu
  (patrz nagłówek pliku). „Zamknięte" dotyczy C1/C2/H3/H1, nie całości #1.
- Zostaje #2 (PII w Langfuse + llmLogs) — realne ryzyko prawne + RODO. Przed publicznym launchem MUSI być zamknięte.
- Status checkujemy NA POCZĄTKU KAŻDEJ SESJI (instrukcja w CLAUDE.md).
