# Security Audit Report - AITutor

**Data audytu:** 2026-01-06
**Zakres:** Wszystkie pliki backend Convex (`convex/`)
**Audytor:** Claude Code (automated)

---

## Executive Summary

**Status ogólny: UMIARKOWANE RYZYKO**

Backend ma solidną autentykację via Clerk i rate limiting, ale zidentyfikowano kilka krytycznych i wysokiego ryzyka problemów:

| Poziom | Liczba | Opis |
|--------|--------|------|
| CRITICAL | 2 | CORS wildcard, brak weryfikacji płatności |
| HIGH | 2 | IDOR w exercises, brak walidacji ownership |
| MEDIUM | 6 | Różne problemy z autoryzacją i walidacją |
| LOW | 3 | Drobne usprawnienia |

---

## Macierz podatności

| Severity | Issue | Plik | Status |
|----------|-------|------|--------|
| CRITICAL | Wildcard CORS (`*`) | streaming.ts:26 | VULNERABLE |
| CRITICAL | Manipulacja statusu płatności bez weryfikacji | profiles.ts, payments.ts | VULNERABLE |
| HIGH | IDOR - brak weryfikacji ownership na exercises | exercises.ts | VULNERABLE |
| HIGH | IDOR - brak weryfikacji courseDocumentId | exercises.ts | VULNERABLE |
| MEDIUM | Pole `status` przyjmuje dowolny string | profiles.ts:updatePaymentStatus | VULNERABLE |
| MEDIUM | acceptInvite nie weryfikuje email | organizations.ts | VULNERABLE |
| MEDIUM | Session token enumeration (zwraca userId) | sessions.ts | VULNERABLE |
| MEDIUM | Brak ownership verification w updateDocumentStatus | courseDocuments.ts | NEEDS_REVIEW |
| MEDIUM | Brak walidacji XML schema | profiles.ts:profileXml | NEEDS_REVIEW |
| MEDIUM | Hinty można pobierać out-of-order | exercises.ts | NEEDS_REVIEW |
| LOW | XSS w odpowiedziach LLM | ai.ts | Frontend responsibility |
| LOW | Email enumeration w zaproszeniach | organizations.ts | ACCEPTABLE |

---

## Szczegółowa analiza per-file

### 1. streaming.ts - VULNERABLE

**Problem krytyczny:** CORS Wildcard
```typescript
// Linia 25-26
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',  // NIEBEZPIECZNE!
```

**Impact:** Każda strona w internecie może wykonywać authenticated requests do tego endpointu.

**Fix:**
```typescript
'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'https://aitutor.example.com',
```

**Status:** Oznaczone `@security` TODO - do naprawy przed produkcją.

---

### 2. profiles.ts - NEEDS_REVIEW

**Problem 1:** `updatePaymentStatus` przyjmuje dowolny string
```typescript
args: {
  status: v.string(),  // Powinno być: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed'))
```

**Problem 2:** User może bezpośrednio zmienić status płatności bez weryfikacji Stripe.

**Fix:** Stripe webhook powinien być jedynym źródłem zmian statusu płatności.

---

### 3. exercises.ts - VULNERABLE (IDOR)

**Problem:** Brak weryfikacji ownership na queries
```typescript
export const getExerciseForChapter = query({
  handler: async (ctx, args) => {
    // BRAK: sprawdzenia czy courseDocumentId należy do użytkownika!
    const exercise = await ctx.db
      .query('exercises')
      .withIndex('by_document_chapter', ...)
```

**Impact:** User A może czytać ćwiczenia User B.

**Fix:**
```typescript
const document = await ctx.db.get(args.courseDocumentId);
if (!document || document.clerkUserId !== identity.subject) {
  throw new Error('Not authorized');
}
```

Dotyczy: `getExerciseForChapter`, `getExercisesForDocument`, `getHint`

---

### 4. organizations.ts - NEEDS_REVIEW

**Problem:** `acceptInvite` nie weryfikuje czy email zaproszenia odpowiada email użytkownika
```typescript
export const acceptInvite = mutation({
  handler: async (ctx, args) => {
    // BRAK: if (invite.email !== identity.email) throw Error
```

**Impact:** User A może zaakceptować zaproszenie wysłane do User B jeśli ma token.

**Fix:**
```typescript
if (invite.email.toLowerCase() !== identity.email?.toLowerCase()) {
  throw new Error('This invite is not for your email');
}
```

---

### 5. sessions.ts - NEEDS_REVIEW

**Problem:** `getSessionIdFromToken` to PUBLIC query która zwraca `clerkUserId`
```typescript
export const getSessionIdFromToken = query({
  args: { token: v.string() },
  returns: v.union(v.string(), v.null()),  // Zwraca userId!
```

**Impact:** Token enumeration - atakujący może brute-force'ować tokeny i zdobywać userIds.

**Fix:** Zmienić na `returns: v.boolean()` i używać tokenu bezpośrednio do autentykacji.

---

### 6. payments.ts - VULNERABLE

**Problem:** Brak implementacji Stripe webhook z weryfikacją signature.

```typescript
// @Incomplete @Product: implement real payment provider (Stripe?) webhook + signature verification
```

**Impact:** Użytkownik może ominąć płatność manipulując `updatePaymentStatus`.

**Fix:** Implementacja Stripe webhook z `stripe.webhooks.constructEvent()`.

---

## Pliki SECURE

| Plik | Powód |
|------|-------|
| auth.ts | Proper Clerk integration, admin checks |
| llmLogs.ts | Wszystkie queries admin-only |
| config.ts | list/set admin-only, get publiczne ale bezpieczne |
| lib/roles.ts | Poprawna implementacja RBAC |
| lib/rateLimiter.ts | Sliding window, per-user limits |
| rateLimitMutation.ts | Internal only, proper implementation |
| courseAi.ts | Ownership checks present |
| exerciseAi.ts | Ownership checks present |
| quickTipAi.ts | Auth + rate limiting |
| teamProgress.ts | Role-based access correct |
| schema.ts | Proper indexes and validators |

---

## Pozytywne ustalenia

- Clerk integration poprawnie skonfigurowany
- Rate limiting na operacjach LLM (30/5min)
- Admin endpoints chronione przez `assertAdmin()`
- Internal functions nie są publicznie dostępne
- Indeksy DB obecne dla security-relevant queries
- Session expiry (30 dni) z cleanup job
- Ownership checks w kluczowych funkcjach (regenerateDocument, evaluateExercise)

---

## Plan naprawczy

### P0 - CRITICAL (natychmiast)

1. **CORS Fix** - streaming.ts
   - Zmienić `'*'` na konkretną domenę
   - Estymacja: 15 min

2. **Stripe Webhook** - payments.ts
   - Implementacja webhook z signature verification
   - Usunięcie możliwości bezpośredniej zmiany statusu
   - Estymacja: 3-4h

3. **IDOR Fix** - exercises.ts
   - Dodać ownership verification do 3 queries
   - Estymacja: 30 min

### P1 - HIGH (tydzień)

4. **Enum validation** - profiles.ts:updatePaymentStatus
   - Zmienić `v.string()` na `v.union(v.literal(...))`
   - Estymacja: 15 min

5. **Email verification** - organizations.ts:acceptInvite
   - Dodać sprawdzenie email
   - Estymacja: 15 min

6. **Session token enumeration** - sessions.ts
   - Zmienić return type na boolean
   - Dodać rate limiting
   - Estymacja: 1h

### P2 - MEDIUM (miesiąc)

7. **XML Schema validation** - profiles.ts
8. **Progressive hint reveal** - exercises.ts
9. **CSP headers** - streaming.ts
10. **Ownership checks** - courseDocuments.ts, progress.ts

---

## Rekomendacje testowe

### Test cases do wykonania

1. **CORS Test**
   ```bash
   curl -X OPTIONS https://api.example.com/stream-question \
     -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST"
   ```

2. **IDOR Test**
   - Zaloguj jako User A
   - Spróbuj pobrać exercises z courseDocumentId należącego do User B

3. **Payment Bypass Test**
   - Wywołaj `updatePaymentStatus({ status: 'completed' })` bezpośrednio
   - Sprawdź czy można ominąć płatność

4. **Rate Limit Test**
   - Wykonaj 31 LLM calls w 5 minut
   - Zweryfikuj że 31. jest odrzucony

5. **Session Enumeration Test**
   - Brute-force getSessionIdFromToken z różnymi tokenami
   - Sprawdź czy można enumerować userIds

---

## Compliance

| Aspekt | Status |
|--------|--------|
| GDPR - prawo do usunięcia | OK (deleteAccount) |
| Session security | OK (30-dni expiry) |
| PII protection | OK (scoped to user) |
| Rate limiting | OK (LLM operations) |
| Admin access | OK (assertAdmin) |

---

## Następny review

- **Po naprawie P0:** 1 tydzień
- **Pełny re-audit:** przed produkcją

---

*Raport wygenerowany automatycznie przez Claude Code.*
