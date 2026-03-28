# FIX-010: Duplikacje kodu w frontend i backend

## Problem

Kilka stałych i utilsów jest zduplikowanych w różnych plikach.

### Frontend

1. **`STATUS_COLORS`** — identyczna mapa w:
   - `src/admin/pages/AdminDashboard.tsx` (linie 5-22)
   - `src/admin/pages/BookBatch.tsx` (linie 20-37)
   - Drobne różnice w shade (text-blue-700 vs text-blue-800)

2. **`timeAgo` / `formatRelativeTime`** — dwie niezależne implementacje:
   - `src/admin/pages/AdminDashboard.tsx` → `timeAgo()`
   - `src/components/book/OrderTimeline.tsx` → `formatRelativeTime()`
   - Ten sam cel, różne implementacje

3. **Suspense spinner** — identyczny markup w 6 route files:
   ```tsx
   <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="w-6 h-6 spinner" /></div>}>
   ```

### Backend

4. **`AGENT_STATUS_MAP`** — topologia pipeline zduplikowana w:
   - `convex/admin/bookBatch.ts` → `AGENT_STATUS_MAP`
   - `convex/bookPipelineEvents.ts` → `NARRATIVE_MAP`
   - `convex/lib/pipelineStateMachine.ts` → `STORY_TRACK_STATUSES`, `IMAGE_TRACK_STATUSES`

## Plan naprawy

### 1. STATUS_COLORS → shared module

```
src/admin/lib/statusColors.ts
```

- Eksportuj `STATUS_COLORS` jako single source of truth
- Import w `AdminDashboard.tsx` i `BookBatch.tsx`
- Ujednolicij shades

### 2. timeAgo → shared util

```
src/lib/formatTime.ts
```

- Eksportuj `timeAgo(timestamp: number): string`
- Zamień obie implementacje na import

### 3. Suspense spinner → komponent

```
src/components/RouteSuspense.tsx
```

```tsx
export function RouteSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-6 h-6 spinner" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
```

- Zamień w 6 route files

### 4. Backend topologia — accept as-is

`AGENT_STATUS_MAP`, `NARRATIVE_MAP`, i state machine sets służą różnym celom (admin UI, user-facing narratives, state machine guards). Próba unifikacji skomplikowałaby kod bez realnej wartości. Dodać komentarz "keep in sync with" w każdym.

## Pliki do zmian

- Nowe: `src/admin/lib/statusColors.ts`, `src/lib/formatTime.ts`, `src/components/RouteSuspense.tsx`
- Zmiany: `AdminDashboard.tsx`, `BookBatch.tsx`, `OrderTimeline.tsx`, 6 route files
