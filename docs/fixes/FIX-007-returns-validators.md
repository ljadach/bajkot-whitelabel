# FIX-007: Brakujące returns validators i v.any() overuse

## Problem

Kilka funkcji Convex nie ma `returns` validatorów lub używa `v.any()`, wyłączając type safety na granicy API.

### Brak `returns`

- `convex/llmLogs.ts`:
  - `storeLlmLog` (linia ~6) — brak returns
  - `getLlmLogs` (linia ~54) — brak returns
  - `getAllLogUsers` (linia ~78) — brak returns
  - `getLlmLogById` (linia ~139) — brak returns

### `v.any()` returns

- `convex/bookPipelineHelpers.ts`:
  - `listRecentOrders` — returns `v.any()`
  - `getOrder` — returns `v.any()` (najważniejszy — wołany w każdym agencie)
  - `getIllustrations` — returns `v.any()`
- `convex/admin/bookBatch.ts`:
  - `getOrderDetail` — returns `v.any()`

## Plan naprawy

### Faza 1: Dodaj `returns` do llmLogs (quick win)

```ts
// storeLlmLog
returns: v.null(),

// getLlmLogs
returns: v.array(v.object({...})), // lub v.any() tymczasowo

// getAllLogUsers
returns: v.array(v.string()),

// getLlmLogById
returns: v.union(v.object({...}), v.null()),
```

### Faza 2: Zamień `v.any()` na typed returns (wymaga pracy)

`getOrder` jest najważniejszy — jest wołany 20+ razy w pipeline. Pełny validator dla `bookOrders` row byłby ~40 linii. Pragmatyczne podejście:

1. Wyeksportuj `bookOrderValidator` z `schema.ts` area
2. Użyj go w `getOrder` returns
3. Albo: zostaw `v.any()` na internal queries (Convex internal queries nie są dostępne z zewnątrz)

### Rekomendacja

Faza 1 (llmLogs) jest quick win. Faza 2 jest nice-to-have — `v.any()` na internal queries to accepted trade-off w Convex codebasach.

## Pliki do zmian

- `convex/llmLogs.ts` — dodaj returns validators
- Opcjonalnie: `convex/bookPipelineHelpers.ts`, `convex/admin/bookBatch.ts`
