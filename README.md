# AITutor - Personalized AI Training Platform

This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).

This project is connected to the Convex deployment named [`accomplished-schnauzer-177`](https://dashboard.convex.dev/d/accomplished-schnauzer-177).

## Project structure

The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).

The backend code is in the `convex` directory.

`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.

- If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
- Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
- Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.

## Observability

- Backend spans and LLM calls are instrumented with Langfuse through `@langfuse/tracing`. Provide `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, and optionally `LANGFUSE_BASE_URL` in the Convex environment; if the keys are missing the helpers in `convex/lib/langfuse.ts` become a no-op.
- For a manual smoke test, visit `/test` in the frontend: it renders a button that hits `observability.testTrace`, logs verbosely in Convex, and sends a Langfuse trace via the REST endpoint (plus prompt fetch diagnostics).
- Server helpers (`withLangfuseSpan`, `langfuseLog`, `langfuseError`) now emit Langfuse spans/logs through the REST OTLP exporter defined in `convex/lib/langfuseRest.ts`, so every LLM call routed via `chatJsonWithRetries` automatically records a compact trace.
- `convex/lib/langfuse.ts` also exposes `startActiveObservation`, `startObservation`, `observe`, `updateActiveObservation`, and `propagateAttributes` with signatures mirroring the official Langfuse SDK, so existing instrumentation snippets can be ported without changes.

## Prompt management

- Langfuse prompts can be created/updated via `@langfuse/client`. Provide the same `LANGFUSE_*` environment variables as above.
- The `prompts.getPrompt` Convex action fetches (and optionally compiles) prompts at runtime. The `/test` page also includes a “Fetch prompt ‘foo’” button which calls this action and renders the returned payload for quick verification.
- Backend prompt templates are now loaded from Langfuse (with automatic fallback to the versions in `convex/lib/prompts.ts`). See `docs/migration.md` (PL) for the list of prompt names and required placeholders.

@Documentation: finalize and shorten readme
