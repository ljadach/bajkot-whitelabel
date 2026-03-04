# Bajkot Codebase Patterns & Conventions

Reference document for implementing new features in the Bajkot codebase.
Derived from reading: schema.ts, ai.ts, courseAi.ts, llmClient.ts, pipelineConfig.ts,
prompts.ts, langfuse.ts, langfusePrompts.ts, config.ts, streaming.ts, http.ts,
admin/videos.ts, profiles.ts, routes.ts, ChatStep.tsx, actionHelpers.ts, roles.ts,
adminGuards.ts, rateLimiter.ts, logger.ts, dbHelpers.ts, and .cursor/rules/convex_rules.mdc.

---

## 1. Convex Function Patterns

### Function Types

| Type               | Import                  | Visibility | Has DB?        | Use Case                               |
| ------------------ | ----------------------- | ---------- | -------------- | -------------------------------------- |
| `query`            | `'./_generated/server'` | Public API | Yes (`ctx.db`) | Read data, subscriptions               |
| `mutation`         | same                    | Public API | Yes            | Write data                             |
| `action`           | same                    | Public API | **No**         | Side effects, LLM calls, external APIs |
| `internalQuery`    | same                    | Private    | Yes            | Helper reads (called from actions)     |
| `internalMutation` | same                    | Private    | Yes            | Helper writes (called from actions)    |
| `internalAction`   | same                    | Private    | No             | Scheduled background work              |

### Syntax (ALWAYS follow)

```typescript
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

export const myAction = action({
  args: {
    profileId: v.id('userProfiles'),
    title: v.string(),
    count: v.optional(v.number()),
  },
  // returns validator is used in queries/mutations, optional in actions
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // ...
    return { success: true };
  },
});
```

**Key rules:**

- ALWAYS include `args` validators (even if empty: `args: {}`)
- ALWAYS include `returns` validators for queries and mutations
- Actions that return nothing: `returns: v.null()`, handler returns `return null;`
- Use `v.id('tableName')` for document IDs, not `v.string()`
- Use `v.union(v.literal('a'), v.literal('b'))` for enums

### Function References

```typescript
import { api } from './_generated/api';       // public functions
import { internal } from './_generated/api';   // internal functions

// Calling from action:
await ctx.runQuery(internal.courseAiHelpers.getProfileForCourseGeneration, { clerkUserId });
await ctx.runMutation(internal.courseDocuments.updateDocumentStatus, { documentId, status: 'generating' });

// Scheduling background work:
await ctx.scheduler.runAfter(0, internal.courseAi.generateHandbookInternal, { ... });
```

**Never** pass a function directly - always use `api.file.functionName` or `internal.file.functionName`.

### Public vs Internal Convention

- **Public** (`query`/`mutation`/`action`): Exposed to frontend. Handle auth inside.
- **Internal** (`internalQuery`/`internalMutation`/`internalAction`): Called from other backend functions only. No auth check needed (trusted caller).
- Pattern: public action authenticates -> calls internal mutations/queries for DB work.

Example from `courseAi.ts`:

```typescript
// Public action: handles auth + rate limit
export const startCourseGeneration = action({
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const clerkUserId = identity.subject;

    // Rate limiting
    await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
      actionType: 'llm_call', clerkUserId,
    });

    // Read data via internal query (no auth check inside)
    const profile = await ctx.runQuery(internal.courseAiHelpers.getProfileForCourseGeneration, { clerkUserId });

    // Schedule background work
    await ctx.scheduler.runAfter(0, internal.courseAi.generateHandbookInternal, { ... });
  },
});

// Internal action: no auth, called by scheduler
export const generateHandbookInternal = internalAction({
  handler: async (ctx, args) => {
    // Update status
    await ctx.runMutation(internal.courseDocuments.updateDocumentStatus, {
      documentId: args.documentId, status: 'generating',
    });

    // Do LLM work...

    // Update status on completion
    await ctx.runMutation(internal.courseDocuments.updateDocumentStatus, {
      documentId: args.documentId, status: 'completed', handbook,
    });
  },
});
```

---

## 2. LLM Client & How Actions Call LLMs

### Architecture

All LLM calls go through **OpenRouter** via the Vercel AI SDK (`generateText`/`streamText`).

```
Action -> llmClient.ts -> OpenRouter -> Gemini/Claude/etc.
```

### Pipeline Config (`convex/lib/pipelineConfig.ts`)

Every LLM call is associated with a **PipelineStage**. Config is centralized:

```typescript
export type PipelineStage = 'intake' | 'handbook' | 'playbook' | 'exerciseGeneration' | ...;

// Each stage has:
interface StageConfig {
  model: string;           // e.g. 'google/gemini-2.5-flash'
  temperature: number;     // 0.0-1.0
  retries: number;         // typically 3
  baseDelayMs: number;     // exponential backoff base (250ms)
  webSearch?: { enabled: true; maxResults: number };
  reasoning?: boolean;     // Google reasoning toggle
  expect?: 'object' | 'array' | 'any';  // JSON parse hint
}
```

**To add a new stage:**

1. Add the stage name to `PipelineStage` union type
2. Add config entry in `DEFAULT_LLM_CONFIG`

### LLM Client Functions (`convex/lib/llmClient.ts`)

Two main entry points:

```typescript
// Standard JSON response (most common)
const result = await chatJsonForStage<MyType>(
  'handbook', // PipelineStage
  { system: systemPrompt, user: userPrompt }, // prompts
  fallbackValue, // used if all retries fail
  logContext, // for LLM logging
);

// JSON response + web search sources
const { data, sources } = await chatJsonForStageWithSources<MyType>(
  'playbook',
  { system, user },
  fallback,
  logContext,
);
```

**Retry behavior:**

- Exponential backoff: `baseDelayMs * 2^attempt`
- On all retries exhausted: returns `fallback` if provided, throws otherwise
- JSON parse errors trigger retries (LLM sometimes returns invalid JSON)

### LLM Log Context

Every LLM call gets logged to `llmLogs` table:

```typescript
// For authenticated public actions:
const { logContext } = await prepareAuthenticatedLlmAction(ctx);
// This handles: auth check + rate limiting + builds logContext

// For internal actions (no auth):
const logContext = buildInternalLogContext(ctx, args.clerkUserId);
```

### Fallback Pattern

Always provide a sensible fallback that matches the expected return type:

```typescript
const fallback = {
  chapter1: { title: 'Chapter 1', content: '...', imagePrompt: '...' },
  chapter2: { ... },
  chapter3: { ... },
};
const { data: result, sources } = await chatJsonForStageWithSources<HandbookType>(
  'handbook', { system, user }, fallback, logContext
);
```

---

## 3. Prompt Management

### Two-layer system: Langfuse (remote) -> TypeScript fallbacks (local)

Currently `USE_LANGFUSE_PROMPTS = false` (all prompts come from local TS files).

### Structure

```
convex/lib/prompts.ts           -- Entry point, renderPrompt(), template schemas
convex/lib/prompts/types.ts     -- PromptTemplate enum, PromptConfig type
convex/lib/prompts/intakeFallbacks.ts
convex/lib/prompts/courseFallbacks.ts
convex/lib/prompts/exerciseFallbacks.ts
convex/lib/prompts/toolFallbacks.ts
```

### Adding a New Prompt

1. **Add enum value** in `convex/lib/prompts/types.ts`:

```typescript
export enum PromptTemplate {
  // ... existing
  MyNewSystem = 'myNewSystem',
  MyNewUser = 'myNewUser',
}
```

2. **Add fallback** in the appropriate domain file (e.g. `courseFallbacks.ts`):

```typescript
export const courseFallbacks: Partial<Record<PromptTemplate, PromptConfig>> = {
  // ... existing
  [PromptTemplate.MyNewSystem]: {
    name: 'aitutoro-my-new-system', // Langfuse prompt name
    type: 'text',
    fallback: `You are an expert... {{LANGUAGE}}... {{SOME_PARAM}}`,
  },
};
```

3. **Add Zod schema** in `convex/lib/prompts.ts`:

```typescript
const templateSchemas: Record<PromptTemplate, z.ZodType<any>> = {
  // ... existing
  [PromptTemplate.MyNewSystem]: z
    .object({
      LANGUAGE: z.string().default('English'),
      SOME_PARAM: z.string(),
    })
    .strict(),
};
```

4. **Use** in your action:

```typescript
const system = await renderPrompt(PromptTemplate.MyNewSystem, {
  LANGUAGE: language,
  SOME_PARAM: someValue,
});
```

### Placeholder syntax

Use `{{PARAM_NAME}}` in fallback strings. The `renderPrompt` function validates all params are provided via Zod schema.

---

## 4. Observability (Langfuse)

### Pattern

Wrap LLM calls in `startActiveObservation`:

```typescript
import { startActiveObservation } from './lib/langfuse';

return startActiveObservation(
  'action.generateHandbook', // observation name
  async (span) => {
    span.update({
      // attach metadata
      action: 'generateHandbook',
      documentId: args.documentId,
      language,
    });

    // ... do LLM work ...

    span.update({
      // attach results
      chapter1_length: result.chapter1?.content?.length || 0,
      web_search_sources: sources.length,
    });
    return { result, sources };
  },
  { asType: 'span' }, // 'span' | 'generation' | 'tool' | 'log'
);
```

**When Langfuse credentials are missing**, the entire system becomes no-op (dummy observation).

The `llmClient.ts` automatically wraps each retry loop in its own observation with `asType: 'generation'`.

### Logger (`convex/lib/logger.ts`)

For non-LLM logging:

```typescript
import { createLogger } from './lib/logger';
const log = createLogger(ctx, 'myAction');
log.info('Processing started', { documentId });
log.error('Failed', { error: e.message });
```

Logs go to both console AND `backendLogs` table (fire-and-forget).

---

## 5. Real-time UI (Convex Subscriptions)

### How it works

Frontend uses `useQuery(api.profiles.getCurrentProfile)` which is a **reactive subscription**.
When backend writes via `ctx.db.patch(...)`, the query automatically re-runs and pushes to client.

### Status polling pattern (courseDocuments)

```typescript
// Frontend subscribes to document list
const documents = useQuery(api.courseDocuments.listByProfile);
// Each document has status: 'pending' | 'generating' | 'completed' | 'failed'
// UI reacts to status changes automatically
```

### Streaming pattern (intake chat)

The intake chat uses **HTTP streaming** (not Convex subscriptions) for real-time text:

1. Frontend calls `POST /stream-question` (HTTP action)
2. Backend uses `streamText()` from AI SDK
3. Response streams via `TransformStream` -> `ReadableStream`
4. Frontend reads chunks via `useChatStream` hook

```typescript
// Backend (streaming.ts):
const result = await streamText({
  model: openrouter(llmModel),
  temperature: streamConfig.temperature,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
});

// Return streaming response
return new Response(readable, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
});
```

---

## 6. Authentication (Clerk)

### Pattern

```typescript
// In public actions:
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error('Not authenticated');
const clerkUserId = identity.subject; // This is the stable Clerk user ID

// Shortcut for LLM actions:
const { clerkUserId, logContext } = await prepareAuthenticatedLlmAction(ctx);
```

### Admin role check

```typescript
import { assertAdmin } from './lib/roles';

// In admin-only functions:
const { subject: actor } = await assertAdmin(ctx);
// Throws 'Access denied: requires admin role' if not admin

// Check without throwing:
import { isAdmin } from './lib/roles';
if (await isAdmin(ctx)) { ... }
```

Admin role comes from Clerk JWT custom claim: `identity.isAdmin === true`.

### User identification

All tables use `clerkUserId: v.string()` (Clerk subject) as the user identifier.
Index pattern: `.index('by_clerk_user', ['clerkUserId'])`.

### DB helper for profile lookup

```typescript
import { getAuthenticatedProfile, getProfileByClerkUserId } from './lib/dbHelpers';

// In queries/mutations:
const profile = await getAuthenticatedProfile(ctx); // checks auth + looks up profile
const profile = await getProfileByClerkUserId(ctx, clerkUserId); // direct lookup
```

---

## 7. Rate Limiting

### Sliding window algorithm

Defined in `convex/lib/rateLimiter.ts`. Configuration:

| Action           | Max Calls | Window |
| ---------------- | --------- | ------ |
| `llm_call`       | 30        | 5 min  |
| `profile_update` | 100       | 1 min  |
| `admin_action`   | 60        | 1 min  |

### Usage pattern

```typescript
// Option A: Via actionHelpers (combines auth + rate limit)
const { logContext } = await prepareAuthenticatedLlmAction(ctx);

// Option B: Manual (in public actions)
await ctx.runMutation(internal.rateLimitMutation.checkAndRecordLLMRateLimit, {
  actionType: 'llm_call',
  clerkUserId,
});

// Option C: Direct (in mutations)
import { checkRateLimit } from './lib/rateLimiter';
const result = await checkRateLimit(ctx, clerkUserId, 'admin_action');
if (!result.allowed) throw new Error(result.message);
```

---

## 8. Schema Design Patterns

### Table definition

```typescript
const myTable = defineTable({
  clerkUserId: v.string(), // Owner
  status: v.union(
    // Enum as union of literals
    v.literal('pending'),
    v.literal('processing'),
    v.literal('completed'),
    v.literal('failed'),
  ),
  content: v.optional(v.string()), // Optional fields
  metadata: v.optional(v.string()), // JSON strings for flexible data
  createdAt: v.number(), // Timestamp (Date.now())
  error: v.optional(v.string()), // Error message on failure
})
  .index('by_clerk_user', ['clerkUserId'])
  .index('by_status', ['status']);
```

### Index naming convention

- Single field: `by_fieldName` (e.g. `by_clerk_user`)
- Multiple fields: `by_field1_and_field2` or descriptive name (e.g. `by_clerk_user_and_status`)
- **Always** query using `.withIndex()`, never `.filter()` alone

### Query pattern

```typescript
// Correct: use index
const docs = await ctx.db
  .query('courseDocuments')
  .withIndex('by_course_and_page', (q) => q.eq('courseId', courseId).eq('pageIndex', pageIndex))
  .first();

// WRONG: never do this
const docs = await ctx.db
  .query('courseDocuments')
  .filter((q) => q.eq(q.field('courseId'), courseId)); // NO!
```

### JSON-in-strings pattern

Some fields store JSON as strings (`planOutline`, `planFull`, `metadata`). This is acknowledged tech debt. New features should prefer typed objects when possible, but follow the existing pattern for consistency.

---

## 9. HTTP Routes (Streaming)

### Structure

```
convex/http.ts     -- httpRouter() definition, route registration
convex/streaming.ts -- httpAction handlers
```

### Adding a new HTTP endpoint

```typescript
// In http.ts:
import { httpRouter } from 'convex/server';
import { myHandler, myHandlerOptions } from './myHandlers';

const http = httpRouter();

http.route({
  path: '/my-endpoint',
  method: 'POST',
  handler: myHandler,
});
http.route({
  path: '/my-endpoint',
  method: 'OPTIONS',
  handler: myHandlerOptions, // CORS preflight
});

export default http;
```

```typescript
// In myHandlers.ts:
import { httpAction } from './_generated/server';

export const myHandler = httpAction(async (ctx, request) => {
  // Auth check
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
    });
  }

  // Read data via queries
  const data = await ctx.runQuery(api.myModule.myQuery, {});

  // Return response
  return new Response(JSON.stringify(data), {
    headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
  });
});

export const myHandlerOptions = httpAction(async (_ctx, request) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
});
```

### CORS

CORS headers are built from `ALLOWED_ORIGIN` env var + `http://localhost:5173`.

---

## 10. Frontend Routing (React Router v7)

### Structure

Routes defined in `src/routes.ts` using `@react-router/dev/routes`.

```typescript
import { route, layout, index } from '@react-router/dev/routes';

export default [
  // Public routes with language prefix
  ...LANGS.flatMap((lang) => [
    route(lang, 'routes/lang-layout.tsx', { id: `lang-${lang}` }, [
      index('routes/home.tsx', { id: `${lang}-home` }),
      route('pricing', 'routes/pricing.tsx', { id: `${lang}-pricing` }),
      // ...
    ]),
  ]),

  // Auth-gated app routes
  layout('routes/auth-layout.tsx', [
    route('chat', 'routes/app/chat.tsx'),
    route('plan/*', 'routes/app/plan.tsx'),
    route('admin/*', 'routes/app/admin.tsx'),
    // ...
  ]),
] satisfies RouteConfig;
```

### Frontend-Backend Integration

```typescript
// Queries (reactive subscriptions):
import { useQuery } from 'convex/react';
const profile = useQuery(api.profiles.getCurrentProfile);

// Mutations:
import { useMutation } from 'convex/react';
const updateProfile = useMutation(api.profiles.createOrUpdateProfile);
await updateProfile({ step: 'chat', chatHistory: newHistory });

// Actions (one-shot):
import { useAction } from 'convex/react';
const generateReport = useAction(api.ai.generateAssessmentReport);
const result = await generateReport({ profileXml, chatHistory });
```

---

## 11. Admin Functions Pattern

### Admin mutations with audit logging

```typescript
import { assertAdmin } from '../lib/roles';
import { auditLog } from '../lib/adminGuards';

export const add = mutation({
  args: { fileName: v.string() },
  returns: v.id('pipelineVideos'),
  handler: async (ctx, args) => {
    const { subject: actor } = await assertAdmin(ctx);  // throws if not admin

    const id = await ctx.db.insert('pipelineVideos', { ... });
    await auditLog(ctx, actor, 'video.add', id, { fileName: args.fileName });
    return id;
  },
});
```

### Internal variants for cross-function calls

Public queries require auth. When an internal action needs to read the same data, create an internal variant:

```typescript
// Public (requires admin auth)
export const getById = query({
  handler: async (ctx, { videoId }) => {
    await assertAdmin(ctx);
    return await ctx.db.get(videoId);
  },
});

// Internal (no auth, for use by other backend functions)
export const _getByIdInternal = internalQuery({
  handler: async (ctx, { videoId }) => {
    return await ctx.db.get(videoId);
  },
});
```

---

## 12. Background Job Pattern (Scheduler)

```typescript
// From a mutation or action, schedule background work:
await ctx.scheduler.runAfter(0, internal.courseAi.generateHandbookInternal, {
  documentId,
  outlinePage: JSON.stringify(outlinePage),
  fullPlanPage: JSON.stringify(fullPlanPage),
  profileXml: profile.profileXml || '',
  clerkUserId,
  language,
});
```

Pattern for status tracking:

1. Create record with status `'pending'`
2. Background job sets status to `'generating'`
3. On success: `'completed'` with result data
4. On error: `'failed'` with error message
5. Frontend subscribes to status via `useQuery`

---

## 13. DB-backed Config (`convex/lib/config.ts`)

### Structure

```typescript
export enum ConfigKey {
  AUTO_GENERATE_EXERCISES = 'AUTO_GENERATE_EXERCISES',
  DEBUG_DB_LOGGING = 'DEBUG_DB_LOGGING',
}

export const DEFAULT_CONFIG: Record<ConfigKey, { type: ConfigType; value: string }> = {
  [ConfigKey.AUTO_GENERATE_EXERCISES]: { type: ConfigType.SYSTEM, value: 'false' },
  [ConfigKey.DEBUG_DB_LOGGING]: { type: ConfigType.SYSTEM, value: 'false' },
};
```

### Reading config

```typescript
// From action context:
import { getConfigValue } from './lib/configClient';
const value = await getConfigValue(ctx, ConfigKey.AUTO_GENERATE_EXERCISES);

// From query/mutation context:
import { getConfigValueDb } from './lib/dbHelpers';
const value = await getConfigValueDb(ctx, ConfigKey.AUTO_GENERATE_EXERCISES);
```

---

## 14. Code Style & Naming Conventions

### TypeScript

- Strict types, especially for IDs: `Id<'userProfiles'>` not `string`
- `v.union(v.literal(...))` for discriminated unions
- JSON strings stored as `v.string()` with parse/stringify at boundaries
- Zod schemas for prompt parameter validation

### File organization

```
convex/
  schema.ts              -- All table definitions
  ai.ts                  -- Intake LLM actions (public)
  courseAi.ts             -- Course generation actions
  courseAiHelpers.ts      -- Internal queries for courseAi
  courseDocuments.ts      -- CRUD mutations for courseDocuments
  profiles.ts            -- Profile queries/mutations
  streaming.ts           -- HTTP streaming actions
  http.ts                -- HTTP route registration
  lib/
    llmClient.ts         -- LLM call wrappers
    pipelineConfig.ts    -- Model/temperature/retry config
    prompts.ts           -- Prompt rendering
    prompts/             -- Domain-specific prompt fallbacks
    langfuse.ts          -- Observability
    rateLimiter.ts       -- Rate limiting
    roles.ts             -- Auth/role checks
    adminGuards.ts       -- Admin guards
    config.ts            -- Config enum/defaults
    dbHelpers.ts         -- Common DB queries
    actionHelpers.ts     -- Action boilerplate reducers
    logger.ts            -- Structured logging
  admin/
    videos.ts            -- Admin CRUD
    segments.ts
    corpus.ts
    config.ts
```

### Naming

- **Tables**: camelCase plural (`userProfiles`, `courseDocuments`, `pipelineVideos`)
- **Functions**: camelCase (`generateHandbook`, `updateStatus`, `getById`)
- **Internal functions**: same, or prefixed with `_` for internal-only variants (`_getByIdInternal`)
- **Indexes**: `by_field_name` (`by_clerk_user`, `by_course_and_page`)
- **Pipeline stages**: lowercase with dots for nesting (`exploration.sketch`)
- **Prompt templates**: camelCase enum values (`HandbookSystem`, `ExerciseGenerationUser`)

### Error handling

- Public actions: throw descriptive errors (`'Not authenticated'`, `'Profile not found'`)
- LLM calls: use fallback values, log errors, never crash silently
- Background jobs: catch errors, update status to `'failed'` with error message

### File headers

- `"use node";` only in files with Node.js built-ins that are action-only
- Never mix queries/mutations with `"use node"` actions in the same file

---

## 15. Key Integration Points for New Features

When adding a new AI-powered pipeline (like book generation), follow this checklist:

1. **Schema**: Add tables in `convex/schema.ts` with status field + indexes
2. **Pipeline stage**: Add to `PipelineStage` union in `pipelineConfig.ts`
3. **Prompts**: Add templates in `prompts/types.ts`, fallbacks in domain file, schemas in `prompts.ts`
4. **Public action**: Auth + rate limit + schedule internal action
5. **Internal action**: LLM call with `chatJsonForStage` + status updates via internal mutations
6. **Internal mutations**: Status updates (`pending` -> `generating` -> `completed`/`failed`)
7. **Internal queries**: Data loading for the action (profile, config, etc.)
8. **Observability**: Wrap in `startActiveObservation`, use `logContext`
9. **Frontend**: `useQuery` for status subscription, `useAction` to trigger
