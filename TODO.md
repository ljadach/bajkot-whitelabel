# TODO — pre-launch security holes

> **STATUS:** Po zamknięciu #1 zostaje #2 (PII). Stripe spięty end-to-end (dev + prod).

---

## ✅ #1 — LANDING ACCESS TOKEN GATE — CLOSED 2026-05-12

Zostawiamy obecny model UX (pipeline darmowy, paywall na PDF) i chronimy intake przez **token + rate limit** zamiast pay-first.

Zmiany:

- `convex/bookPipeline.ts:763-786` — odkomentowany gate, dwa osobne errory (missing config vs invalid token).
- `convex/lib/rateLimiter.ts` — nowy `landing_order` actionType, 10 calls / 1h (globalny ceiling, bo wszystkie landing dziele LANDING_USER_ID).
- `convex/rateLimitMutation.ts` — `landing_order` w validatorze.

Atak DoS-na-portfel kapuje po ~10 generacjach (≈$3) zanim hard-stop.

Devlog: `docs/devlog/2026-05-12.md`.

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

- #1 zamknięte 2026-05-12. Zostaje #2 (PII).
- Przed publicznym launchem #2 MUSI być zamknięte (RODO ryzyko).
- Status checkujemy NA POCZĄTKU KAŻDEJ SESJI (instrukcja w CLAUDE.md).
