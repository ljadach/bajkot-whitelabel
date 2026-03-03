## TODO Comment Conventions

- `@Incomplete` – brakująca implementacja / funkcja w toku.
- `@Security` – potencjalny wektor ataku, brak autoryzacji, wrażliwe dane.
- `@Robustness` – edge‑case, limit, odporność na błędy / DoS.
- `@Performance` – kwestia wydajności / kosztu.
- `@Documentation` – potrzebne lepsze wyjaśnienie, kontrakt, przykład.
- `@Testing` – brak testu / trudno testowalne miejsce.
- `@Product` – decyzja produktowa wymagająca doprecyzowania (np. tryb demo vs prod).
- `@Observability` – brak metryk/logów/trace lub zbyt gadatliwe.

## Telemetry & tracing (Langfuse) – How we instrument

### What we use

- Manual Langfuse helpers from `convex/lib/langfuse.ts` (no SDK auto-patching).
- REST exporter in `convex/lib/langfuseRest.ts` to send spans/logs.
- Convenience wrappers exposed as:
  - `startActiveObservation(name, fn, { asType })` — run a block inside a span.
  - `observe(fn, { name, asType })` — wrap a function with tracing.
  - `withLangfuseSpan(name, attrs, fn)` — simple span wrapper for fire-and-forget logs.

### Minimal span around an action

```ts
import { startActiveObservation } from '../lib/langfuse';

export const doThing = action({
  args: { payload: v.string() },
  handler: async (ctx, args) => {
    return startActiveObservation(
      'myAction.doThing',
      async (span) => {
        span.update({ input: args.payload });
        // ...your logic
        span.update({ output: 'ok' });
        return 'ok';
      },
      { asType: 'span' }
    );
  },
});
```

### Nesting child observations

```ts
const parent = await startActiveObservation('parent', async (span) => {
  span.update({ step: 'start' });
  const child = span.startObservation('child.step', { detail: 123 });
  child.update({ status: 'running' });
  await child.end();
  span.update({ step: 'done' });
});
```

### Wrapping utilities/tools

```ts
import { observe } from '../lib/langfuse';

const tracedFetch = observe(
  async (url: string) => {
    const res = await fetch(url);
    return res.status;
  },
  { name: 'http.fetch', asType: 'tool' }
);
```

### Propagating attributes

Helpers automatically propagate `userId`, `sessionId`, `version`, `tags`, and `metadata` when provided to `startActiveObservation`. Downstream spans inherit these fields for consistent trace context.

### Error logging

```ts
import { langfuseError } from '../lib/langfuse';

try {
  // risky op
} catch (err) {
  await langfuseError('payment.failed', err);
  throw err;
}
```

### Frontend note

Frontend telemetry (PostHog) is separate; Langfuse tracing is server-side (Convex actions). Use `telemetry.track(...)` only after consent; do not send PII.
