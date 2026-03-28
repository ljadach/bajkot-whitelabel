# FIX-003: skipQaReviews dostępne bez admin auth

## Problem

`startOrder` (publiczny action w `bookPipeline.ts`) akceptuje `skipQaReviews: v.optional(v.boolean())` bez sprawdzenia czy caller jest adminem. Każdy zalogowany user może wysłać `skipQaReviews: true` i pominąć psych review (A4), visual QA (A8), i final QA (A10).

## Wpływ

Funkcjonalny, nie security-critical — pipeline nadal produkuje output. Ale:

- Pomija recenzję psychologiczną (A4) — bajka może zawierać szkodliwe wzorce
- Pomija QA ilustracji (A8) — deformacje postaci nie zostaną wyłapane
- Dla produktu terapeutycznego to jest gap w safety

## Plan naprawy

### Opcja A: Guard w `startOrder` (rekomendowana)

1. W `startOrder` handler, ignoruj `skipQaReviews` jeśli user nie jest adminem:

```ts
const isAdmin = (identity as any).isAdmin === true;
const skipQa = isAdmin ? args.skipQaReviews : undefined;
```

2. Przekaż `skipQa` zamiast `args.skipQaReviews` do `createOrder`
3. Frontend checkbox w `BookOrderForm` — schowaj za `import.meta.env.DEV` guard (FIX osobny)

### Opcja B: Usuń z publicznego API

1. Usuń `skipQaReviews` z `startOrder` args
2. Zostaw tylko w `admin/bookBatch.ts` `createBatchOrder` (który już ma `assertAdmin`)
3. Frontend dev tools — schowaj za DEV guard

### Pliki do zmian

- `convex/bookPipeline.ts` — `startOrder` i `createOrder`
- `convex/lib/roles.ts` — opcjonalnie eksportuj `isAdmin(identity)` helper
- `src/components/book/BookOrderForm.tsx` — DEV guard na checkbox

### Ryzyko

Niskie. Zmiana jest addytywna — dodaje guard, nic nie usuwa.
