# TODO — pre-launch security holes

> **STATUS: GOLI. Tu są dziury, które musimy zaknąć ZANIM zaczniemy reklamować generowanie publicznie.**
> **Na razie pod testy ok, ale po włączeniu płatnego generowania — fixy poniżej są krytyczne.**

---

## 🔥🔥🔥 #1 — LANDING ACCESS TOKEN GATE JEST WYŁĄCZONY!!!

**Plik:** `convex/bookPipeline.ts:422-428`

**Co jest:**

```ts
// Access token gate disabled — kept for future re-enable
// const expectedToken = process.env.LANDING_ACCESS_TOKEN;
// if (!expectedToken || args.accessToken !== expectedToken) {
//   throw new Error('Invalid access token');
// }
void args.accessToken;
```

**Konsekwencje:**

- `startLandingOrder` to PUBLIC ACTION bez auth.
- BRAK rate-limitu (auth flow ma `checkAndRecordLLMRateLimit`, landing — NIE).
- Każdy kto zna URL Convex deployment może odpalać generowanie książki w pętli.
- Każda generacja = realne $$ za Gemini API.
- NIE MA NIC co go zatrzyma. Atak DoS-a-portfela = trywialny.

**Plan rozwiązania (docelowy):**

- Po podłączeniu Stripe do landing flow każda generacja będzie wymagała payment, więc token gate stanie się zbędny — wallet będzie gate'em.
- DO TEGO CZASU: nie robimy publicznej kampanii. Trzymamy URL prywatny.

**Co robić tymczasowo, jeśli zaczniemy testy publicznie:**

- Odkomentuj gate w `bookPipeline.ts:422-428`.
- Ustaw `LANDING_ACCESS_TOKEN` w Convex env (prod).
- Komuniku token tylko zaufanym testerom.

**KIEDY ZDJĄĆ Z TODO:** Gdy `startLandingOrder` wymaga payment session OR token check.

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

- Te dwa punkty TO NIE JEST kosmetyka. To są realne dziury z konsekwencjami $$ (#1) i prawnymi (#2).
- Przed publicznym launchem: oba MUSZĄ być zamknięte.
- Status checkujemy NA POCZĄTKU KAŻDEJ SESJI (instrukcja w CLAUDE.md).
