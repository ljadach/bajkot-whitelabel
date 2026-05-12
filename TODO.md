# TODO — pre-launch security holes

> **STATUS po 2026-05-12: #1 częściowo (audit C1/C2/H3/H1). C3 cofnięte CAŁOŚCIOWO — public intake otwarty bez gate'u i bez rate limitu. Idziemy na produkcję świadomie z ryzykiem DoS-na-budżet. #2 dalej otwarty.**

---

## ~~🔥🔥🔥 #1 — LANDING ACCESS TOKEN GATE JEST WYŁĄCZONY~~ ✅ ZAMKNIĘTE 2026-05-12

Zamknięte w ramach security audit (C1/C2/C3/H3) + override iteracji nad PR #44. Stan po fix:

- ~~**Intake gate (C3)**~~ — **COFNIĘTE 2026-05-12 hotfix**. Re-enable blokowało legit visitors w prod ("Server Error"). Bez fixu UX (ConvexError + frontend handling + magic-link dla cross-device) nie wracamy.
- ~~**Rate limit (C3)**~~ — **COFNIĘTE 2026-05-12 follow-up**. 10/h globalnie było za ciasne na realny ruch. Infrastructure (`checkAndRecordLandingStart`, `landing_start` config) zostaje jako dead code — jednolinijkowy revert gdy będziemy mieli per-IP klucz albo Stripe gate na intake.
- **Aktualna obrona przed DoS-na-budżet:** żadna. Świadome ryzyko na czas pre-launch. Przed kampanią marketingową: pay-first albo per-IP rate limit MUSI wrócić.
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

- **RODO:** mamy do czynienia z danymi osobowymi dziecka (zwłaszcza w połączeniu z `clerkUserId` rodzica). Langfuse to 3rd party, prawdopodobnie poza EU bez DPA. Naruszenie.
- Wyciek danych z Langfuse = wyciek listy "co boli dzieci użytkowników".
- Audyt RODO da nam karę.

**Plan rozwiązania:**

1. **Hash promptów w DB log** zamiast pełnego tekstu (`systemPromptHash`, `userPromptHash` + structured `{ childAge, problemId, retryCount }`).
2. **Mask payload do Langfuse** — wysyłaj tylko metadane (model, agent, retryCount, finishReason, durationMs), bez treści promptów.
3. **Albo: per-field allowlist** — `childAge`, `problemId` zostają, `childName`, `problemDetail`, `dedication` wycinane przed logowaniem.
4. Audit retention — 50 logów per user może już zawierać dziesiątki bajek.

**KIEDY ZDJĄĆ Z TODO:** Gdy żadne pole identyfikujące dziecko nie wycieka do Langfuse ani do `llmLogs`.

---

## Notatki

- #1 zamknięte 2026-05-12 (security audit + override merge na PR #44).
- Zostaje #2 (PII w Langfuse + llmLogs) — realne ryzyko prawne + RODO. Przed publicznym launchem MUSI być zamknięte.
- Status checkujemy NA POCZĄTKU KAŻDEJ SESJI (instrukcja w CLAUDE.md).
