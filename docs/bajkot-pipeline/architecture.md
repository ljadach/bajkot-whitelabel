# Architecture: Book Pipeline in bajkot

> Integration design for porting trustee-book-pipeline into bajkot (Convex + React Router + Clerk + Stripe).
> This is the canonical reference for all implementation agents.

---

## 1. Convex Schema Design

### Option chosen: 3 tables

Fewer tables = simpler queries, fewer joins. Artifacts are JSON strings on `bookOrders` (same pattern as `planOutline`/`planFull` on `userProfiles`). Images get their own table because they reference Convex file storage IDs.

### Table: `bookOrders`

```typescript
bookOrders: defineTable({
  // ── Owner ────────────────────────────────────
  clerkUserId: v.string(),

  // ── Order form data ──────────────────────────
  childName: v.string(),
  ageBracket: v.union(v.literal('3-5'), v.literal('6-8'), v.literal('9+')),
  gender: v.union(v.literal('boy'), v.literal('girl')),
  problemId: v.string(),              // key from PROBLEMS map
  problemDetail: v.optional(v.string()), // free text, max 500
  favoriteToy: v.optional(v.string()),   // max 100
  glasses: v.boolean(),
  hairColor: v.string(),              // key from HAIR_COLOR_MAP
  hairStyle: v.string(),              // key from HAIR_STYLE_MAP
  eyeColor: v.string(),               // key from EYE_COLOR_MAP
  skinTone: v.string(),               // key from SKIN_TONE_MAP
  outfit: v.string(),                 // key from OUTFIT_MAP
  email: v.optional(v.string()),

  // ── Pipeline status ──────────────────────────
  status: v.union(
    v.literal('intake'),               // A0 done, pipeline starting
    v.literal('profiling'),            // A1 running
    v.literal('story_planning'),       // A2 running
    v.literal('story_writing'),        // A3 running
    v.literal('psych_review'),         // A4 running
    v.literal('art_direction'),        // A5 running
    v.literal('character_design'),     // A6 running
    v.literal('style_vote'),           // A6b — waiting for human
    v.literal('illustrating'),         // A7 running
    v.literal('visual_qa'),            // A8 running
    v.literal('composing_pdf'),        // A9 running
    v.literal('final_qa'),             // A10 running
    v.literal('delivering'),           // A11 running
    v.literal('completed'),            // done
    v.literal('failed'),               // error
  ),
  currentAgent: v.optional(v.string()), // e.g. "A3" for display
  error: v.optional(v.string()),
  retryCount: v.optional(v.number()),   // for A3/A4 loop tracking

  // ── Artifacts (JSON strings) ─────────────────
  // Each agent writes its output here as JSON.stringify'd data.
  // Downstream agents read + JSON.parse.
  orderData: v.optional(v.string()),           // A0: normalized Order JSON
  characterProfile: v.optional(v.string()),    // A1: CharacterProfile JSON
  storyBlueprint: v.optional(v.string()),      // A2: StoryBlueprint JSON
  storyDraft: v.optional(v.string()),          // A3: StoryDraft JSON
  psychReview: v.optional(v.string()),         // A4: PsychReview JSON
  illustrationPlan: v.optional(v.string()),    // A5: IllustrationPlan JSON
  visualQa: v.optional(v.string()),            // A8: VisualQA JSON
  finalQa: v.optional(v.string()),             // A10: FinalQA JSON

  // ── Style vote ───────────────────────────────
  styleVoteImageA: v.optional(v.id('_storage')),  // Convex storage ID
  styleVoteImageB: v.optional(v.id('_storage')),
  chosenStyle: v.optional(v.union(v.literal('A'), v.literal('B'))),

  // ── Final output ─────────────────────────────
  pdfStorageId: v.optional(v.id('_storage')),     // Final PDF in Convex storage
  downloadUrl: v.optional(v.string()),             // Signed URL (generated on demand)

  // ── Payment ──────────────────────────────────
  paymentStatus: v.optional(v.union(
    v.literal('pending'),
    v.literal('completed'),
    v.literal('failed'),
  )),
  stripeSessionId: v.optional(v.string()),

  // ── Timestamps ───────────────────────────────
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
})
  .index('by_clerk_user', ['clerkUserId'])
  .index('by_status', ['status'])
  .index('by_clerk_user_and_status', ['clerkUserId', 'status']),
```

### Table: `bookIllustrations`

Separate table because there are 7+ images per order, each with its own storage ID and metadata.

```typescript
bookIllustrations: defineTable({
  orderId: v.id('bookOrders'),
  illustrationId: v.string(),         // "cover", "scene_1" .. "scene_6"
  storageId: v.id('_storage'),         // Convex file storage
  prompt: v.string(),                  // The generation prompt used
  width: v.number(),
  height: v.number(),
  sceneRef: v.optional(v.number()),    // beat number reference
  createdAt: v.number(),
})
  .index('by_order', ['orderId'])
  .index('by_order_and_id', ['orderId', 'illustrationId']),
```

### Table: `bookPrompts`

Prompt storage for the book pipeline (mirrors the existing Langfuse fallback pattern).

```typescript
bookPrompts: defineTable({
  filename: v.string(),                // e.g. "A1_child_profiler"
  agentName: v.string(),               // e.g. "Child Profiler"
  content: v.string(),                 // Full prompt markdown
  isModified: v.boolean(),
  updatedAt: v.number(),
})
  .index('by_filename', ['filename']),
```

> **Decision:** `bookPrompts` is optional for MVP. Prompts can live as TypeScript string constants in `convex/lib/prompts/bookFallbacks.ts` following the existing PromptTemplate pattern. The table enables runtime editing later.

---

## 2. Agent-to-Action Mapping

All pipeline agents are `internalAction` (called by scheduler, not by frontend). The only public entry points are:

- `bookPipeline.startOrder` — public action (auth + rate limit + schedule A0)
- `bookPipeline.submitStyleVote` — public mutation (human-in-the-loop)
- `bookPipeline.getOrderProgress` — public query (real-time subscription)

### Agent Table

| Agent | Function Name | Type | LLM? | PipelineStage | Image Gen? | Input Artifacts | Output |
|-------|--------------|------|------|---------------|------------|-----------------|--------|
| A0 | `bookAgents.intake` | `internalAction` | No | — | No | Form data | `orderData` |
| A1 | `bookAgents.profileChild` | `internalAction` | Yes | `book.profiling` | No | orderData | `characterProfile` |
| A2 | `bookAgents.planStory` | `internalAction` | Yes | `book.storyPlanning` | No | orderData, characterProfile | `storyBlueprint` |
| A3 | `bookAgents.writeStory` | `internalAction` | Yes | `book.storyWriting` | No | storyBlueprint, characterProfile, corrections? | `storyDraft` |
| A4 | `bookAgents.reviewPsych` | `internalAction` | Yes | `book.psychReview` | No | storyDraft, storyBlueprint, orderData, characterProfile | `psychReview` |
| A5 | `bookAgents.directArt` | `internalAction` | Yes | `book.artDirection` | No | storyDraft, characterProfile, storyBlueprint | `illustrationPlan` |
| A6 | `bookAgents.designCharacter` | `internalAction` | No | — | Yes | characterProfile | styleVoteImageA, styleVoteImageB |
| A6b | `bookAgents.waitForStyleVote` | — (not an action) | No | — | No | — | — |
| A7 | `bookAgents.illustrate` | `internalAction` | No | — | Yes | illustrationPlan, chosenStyle, characterProfile | bookIllustrations rows |
| A8 | `bookAgents.reviewVisual` | `internalAction` | Yes | `book.visualQa` | No | illustrationPlan, characterProfile | `visualQa` |
| A9 | `bookAgents.composePdf` | `internalAction` | No | — | No | storyDraft, illustrations, characterProfile | `pdfStorageId` |
| A10 | `bookAgents.reviewFinal` | `internalAction` | Yes | `book.finalQa` | No | storyDraft, characterProfile, illustrationPlan, visualQa | `finalQa` |
| A11 | `bookAgents.deliver` | `internalAction` | No | — | No | order, pdfStorageId, finalQa | completedAt, status |

### Function Signatures

```typescript
// convex/bookAgents.ts (all internalAction, "use node")

export const intake = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => { /* ... */ },
});

export const profileChild = internalAction({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => { /* ... */ },
});

// ... same pattern for all agents. Every agent:
// 1. Reads current order via internalQuery
// 2. Does its work (LLM call or image gen or code)
// 3. Writes result to bookOrders via internalMutation
// 4. Schedules next agent via ctx.scheduler.runAfter(0, ...)
```

### Helper Functions (separate file to avoid "use node" mixing)

```typescript
// convex/bookPipelineHelpers.ts (NO "use node" — queries + mutations)

export const getOrder = internalQuery({
  args: { orderId: v.id('bookOrders') },
  returns: v.any(),  // full order doc
  handler: async (ctx, { orderId }) => {
    return await ctx.db.get(orderId);
  },
});

export const updateOrderStatus = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    status: v.string(),
    currentAgent: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: args.status,
      currentAgent: args.currentAgent,
      updatedAt: Date.now(),
      error: args.error,
    });
    return null;
  },
});

export const updateOrderArtifact = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    field: v.string(),       // e.g. "characterProfile"
    value: v.string(),       // JSON.stringify'd artifact
  },
  returns: v.null(),
  handler: async (ctx, { orderId, field, value }) => {
    await ctx.db.patch(orderId, {
      [field]: value,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const saveIllustration = internalMutation({
  args: {
    orderId: v.id('bookOrders'),
    illustrationId: v.string(),
    storageId: v.id('_storage'),
    prompt: v.string(),
    width: v.number(),
    height: v.number(),
    sceneRef: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('bookIllustrations', {
      orderId: args.orderId,
      illustrationId: args.illustrationId,
      storageId: args.storageId,
      prompt: args.prompt,
      width: args.width,
      height: args.height,
      sceneRef: args.sceneRef,
      createdAt: Date.now(),
    });
    return null;
  },
});
```

---

## 3. Pipeline Orchestration

### Chaining Pattern

Each agent schedules the next agent at the end of its handler. This is the same pattern bajkot uses for `courseAi.generateHandbookInternal`:

```typescript
// Inside A1 handler, after writing characterProfile:
await ctx.scheduler.runAfter(0, internal.bookAgents.planStory, { orderId });
// A1 also starts the image track in parallel:
await ctx.scheduler.runAfter(0, internal.bookAgents.designCharacter, { orderId });
```

### Full Pipeline Flow

```
Frontend                    Convex
────────                    ──────
startOrder(formData)  ──►   A0 (intake) ──► A1 (profileChild)
                                                │
                                     ┌──────────┴──────────┐
                                     │                     │
                              Story Track              Image Track
                              A2 (planStory)           A6 (designCharacter)
                                │                        │
                              A3 (writeStory)          writes styleVoteImageA/B
                                │                        │
                              A4 (reviewPsych)         status → 'style_vote'
                                │                        │
                          ┌─────┴─────┐              Frontend shows vote UI
                          │           │                  │
                        PASS        FAIL             submitStyleVote(choice)
                          │       retry A3               │
                          │    (max 2 retries)      status → pipeline resumes
                          │           │                  │
                        A5 (directArt)        ◄──────────┘
                                │                  (orchestrator checks
                              JOIN                  both tracks done)
                                │
                          A7 (illustrate)
                                │
                          A8 (reviewVisual)
                                │
                          A9 (composePdf)
                                │
                          A10 (reviewFinal)
                                │
                          A11 (deliver)
                                │
                          status → 'completed'
```

### Parallel Fork + Join

After A1 completes, it schedules both tracks:

```typescript
// In A1 handler:
await ctx.scheduler.runAfter(0, internal.bookAgents.planStory, { orderId });
await ctx.scheduler.runAfter(0, internal.bookAgents.designCharacter, { orderId });
```

The **join** happens via a dedicated orchestrator mutation called after each track finishes:

```typescript
// convex/bookPipelineHelpers.ts
export const checkParallelTracksComplete = internalMutation({
  args: { orderId: v.id('bookOrders') },
  returns: v.null(),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return null;

    const storyTrackDone = !!order.illustrationPlan;  // A5 output exists
    const imageTrackDone = !!order.chosenStyle;         // Vote submitted

    if (storyTrackDone && imageTrackDone) {
      // Both tracks complete — start A7
      // Schedule from mutation via scheduler
      await ctx.scheduler.runAfter(0, internal.bookAgents.illustrate, { orderId });
    }
    return null;
  },
});
```

A5 (end of story track) and `submitStyleVote` (end of image track) both call `checkParallelTracksComplete`.

### A3/A4 Retry Loop

```typescript
// In A4 (reviewPsych) handler:
const review = /* LLM call */;
await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
  orderId, field: 'psychReview', value: JSON.stringify(review),
});

if (review.status === 'PASS' || review.status === 'PASS_WITH_CORRECTIONS') {
  if (review.status === 'PASS_WITH_CORRECTIONS') {
    // Apply corrections to storyDraft
    const corrected = applyCorrections(storyDraft, review.corrections);
    await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
      orderId, field: 'storyDraft', value: JSON.stringify(corrected),
    });
  }
  // Proceed to A5
  await ctx.scheduler.runAfter(0, internal.bookAgents.directArt, { orderId });
} else if (review.status === 'FAIL') {
  const order = await ctx.runQuery(internal.bookPipelineHelpers.getOrder, { orderId });
  const retryCount = (order.retryCount || 0) + 1;

  if (retryCount >= 3) {
    // Max retries — proceed anyway (demo behavior)
    await ctx.scheduler.runAfter(0, internal.bookAgents.directArt, { orderId });
  } else {
    // Retry A3 with corrections
    await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
      orderId, status: 'story_writing', currentAgent: 'A3',
    });
    await ctx.db.patch(orderId, { retryCount });
    await ctx.scheduler.runAfter(0, internal.bookAgents.writeStory, {
      orderId,
      corrections: JSON.stringify(review.corrections),
    });
  }
}
```

### Error Handling

Every agent wraps its handler in try/catch:

```typescript
handler: async (ctx, { orderId }) => {
  try {
    await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
      orderId, status: 'profiling', currentAgent: 'A1',
    });

    // ... do work ...

    // Schedule next agent
    await ctx.scheduler.runAfter(0, internal.bookAgents.planStory, { orderId });
  } catch (error) {
    await ctx.runMutation(internal.bookPipelineHelpers.updateOrderStatus, {
      orderId,
      status: 'failed',
      currentAgent: 'A1',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

---

## 4. File Storage

### Convex File Storage API

Convex provides built-in file storage. Upload via `ctx.storage.store(blob)`, get URL via `ctx.storage.getUrl(storageId)`.

### Image Storage (A6, A7)

```typescript
// In A6 (designCharacter):
const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
const storageId = await ctx.storage.store(imageBlob);

await ctx.runMutation(internal.bookPipelineHelpers.updateStyleVoteImages, {
  orderId,
  styleVoteImageA: storageIdA,
  styleVoteImageB: storageIdB,
});
```

```typescript
// In A7 (illustrate), for each illustration:
const storageId = await ctx.storage.store(imageBlob);
await ctx.runMutation(internal.bookPipelineHelpers.saveIllustration, {
  orderId,
  illustrationId: `scene_${beatNumber}`,
  storageId,
  prompt: illustrationPrompt,
  width: 900,
  height: 600,
  sceneRef: beatNumber,
});
```

### PDF Storage (A9)

```typescript
// In A9 (composePdf):
const pdfBuffer = await generatePdf(/* ... */);
const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
const pdfStorageId = await ctx.storage.store(pdfBlob);

await ctx.runMutation(internal.bookPipelineHelpers.updateOrderArtifact, {
  orderId, field: 'pdfStorageId', value: pdfStorageId,  // store ID directly
});
```

### Serving Files

Frontend gets download URLs via a query:

```typescript
// convex/bookPipeline.ts
export const getDownloadUrl = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order?.pdfStorageId) return null;
    return await ctx.storage.getUrl(order.pdfStorageId);
  },
});
```

---

## 5. Style Vote Flow

### Sequence

1. **A6** generates 2 character reference images (Style A + Style B)
2. **A6** stores both in Convex file storage
3. **A6** updates `bookOrders.styleVoteImageA`, `styleVoteImageB` via mutation
4. **A6** sets `status: 'style_vote'` — pipeline pauses here
5. **Frontend** subscribes to order via `useQuery` — sees `status === 'style_vote'`
6. **Frontend** renders vote UI with both images (URLs from `ctx.storage.getUrl`)
7. **User** clicks Style A or B
8. **Frontend** calls `bookPipeline.submitStyleVote` mutation
9. **Mutation** writes `chosenStyle: 'A'|'B'` + calls `checkParallelTracksComplete`
10. **Join check** sees both tracks done → schedules A7

### Vote Mutation

```typescript
// convex/bookPipeline.ts
export const submitStyleVote = mutation({
  args: {
    orderId: v.id('bookOrders'),
    choice: v.union(v.literal('A'), v.literal('B')),
  },
  returns: v.null(),
  handler: async (ctx, { orderId, choice }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const order = await ctx.db.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.clerkUserId !== identity.subject) throw new Error('Not authorized');
    if (order.status !== 'style_vote') throw new Error('Not in voting state');

    await ctx.db.patch(orderId, {
      chosenStyle: choice,
      updatedAt: Date.now(),
    });

    // Check if story track is also done
    await ctx.scheduler.runAfter(0, internal.bookPipelineHelpers.checkParallelTracksComplete, {
      orderId,
    });

    return null;
  },
});
```

### Timeout (optional, MVP skip)

For production: schedule a cron that checks orders stuck in `style_vote` for >15 minutes and defaults to Style A. For MVP, no timeout — parent must vote.

---

## 6. Frontend Routes & Components

### Routes (add to `src/routes.ts`)

```typescript
// Inside auth-layout:
route('book/order', 'routes/app/book-order.tsx'),
route('book/:orderId/progress', 'routes/app/book-progress.tsx'),
route('book/:orderId/vote', 'routes/app/book-vote.tsx'),
route('book/:orderId/result', 'routes/app/book-result.tsx'),
```

### Components

#### `/book/order` — Order Form

- Form with all fields from `FormData` (dropdowns for hair, eyes, skin, outfit, problem)
- Uses closed lists from `src/lib/bookData.ts` (ported from `data/problems.ts`)
- On submit: calls `bookPipeline.startOrder` action
- Redirects to `/book/:orderId/progress`

#### `/book/:orderId/progress` — Real-time Progress

- `useQuery(api.bookPipeline.getOrderProgress, { orderId })`
- Reactive — updates automatically as backend patches status
- Shows pipeline stages as checklist with current stage highlighted
- When `status === 'style_vote'`: redirect to `/book/:orderId/vote`
- When `status === 'completed'`: redirect to `/book/:orderId/result`

#### `/book/:orderId/vote` — Style Selection

- Shows two character reference images side by side
- Gets image URLs via `useQuery(api.bookPipeline.getStyleVoteImages, { orderId })`
- Click calls `submitStyleVote` mutation
- After vote: redirect to progress page

#### `/book/:orderId/result` — Final Book

- Shows book preview (cover image, title, scene thumbnails)
- Download PDF button (URL from `getDownloadUrl` query)
- Payment integration (Stripe checkout before download, or after — product decision)

---

## 7. Prompt Integration

### Follow bajkot's PromptTemplate + fallback pattern

Add new enum values to `convex/lib/prompts/types.ts`:

```typescript
// Add to PromptTemplate enum:
BookProfileChildSystem = 'bookProfileChildSystem',
BookProfileChildUser = 'bookProfileChildUser',
BookPlanStorySystem = 'bookPlanStorySystem',
BookPlanStoryUser = 'bookPlanStoryUser',
BookWriteStorySystem = 'bookWriteStorySystem',
BookWriteStoryUser = 'bookWriteStoryUser',
BookReviewPsychSystem = 'bookReviewPsychSystem',
BookReviewPsychUser = 'bookReviewPsychUser',
BookDirectArtSystem = 'bookDirectArtSystem',
BookDirectArtUser = 'bookDirectArtUser',
BookReviewVisualSystem = 'bookReviewVisualSystem',
BookReviewVisualUser = 'bookReviewVisualUser',
BookReviewFinalSystem = 'bookReviewFinalSystem',
BookReviewFinalUser = 'bookReviewFinalUser',
```

### Fallbacks file: `convex/lib/prompts/bookFallbacks.ts`

Port the content from the 14 `.md` files (A0-A11) into TypeScript string constants. Use `{{VARIABLE}}` placeholders matching the original prompts.

### Zod schemas in `convex/lib/prompts.ts`

Add validation schemas for each book prompt's variables:

```typescript
[PromptTemplate.BookProfileChildSystem]: z.object({
  ART_STYLE_SPEC: z.string(),
}).strict(),

[PromptTemplate.BookProfileChildUser]: z.object({
  ORDER_JSON: z.string(),
}).strict(),

// ... etc for each prompt
```

### Usage in agents

```typescript
const systemPrompt = await renderPrompt(PromptTemplate.BookProfileChildSystem, {
  ART_STYLE_SPEC: JSON.stringify(STYLE_A),
});
const userPrompt = await renderPrompt(PromptTemplate.BookProfileChildUser, {
  ORDER_JSON: order.orderData,
});

const result = await chatJsonForStage<CharacterProfile>(
  'book.profiling',
  { system: systemPrompt, user: userPrompt },
  fallbackCharacterProfile,
  logContext,
);
```

---

## 8. Pipeline Stages Config

Add to `PipelineStage` union in `convex/lib/pipelineConfig.ts`:

```typescript
export type PipelineStage =
  | 'intake'
  // ... existing stages ...
  | 'book.profiling'        // A1 — Child Profiler
  | 'book.storyPlanning'    // A2 — Story Architect
  | 'book.storyWriting'     // A3 — Story Writer
  | 'book.psychReview'      // A4 — Psych Reviewer
  | 'book.artDirection'     // A5 — Art Director
  | 'book.visualQa'         // A8 — Visual QA
  | 'book.finalQa'          // A10 — Final QA
  ;
```

Add configs to `DEFAULT_LLM_CONFIG`:

```typescript
// ── Book Pipeline ─────────────────────────────────
'book.profiling':     { model: 'google/gemini-2.5-flash', temperature: 0.7, retries: 3, baseDelayMs: 250, expect: 'object' },
'book.storyPlanning': { model: 'google/gemini-2.5-flash', temperature: 0.6, retries: 3, baseDelayMs: 250, expect: 'object' },
'book.storyWriting':  { model: 'google/gemini-2.5-flash', temperature: 0.8, retries: 3, baseDelayMs: 500, expect: 'object' },
'book.psychReview':   { model: 'google/gemini-2.5-flash', temperature: 0.3, retries: 3, baseDelayMs: 250, expect: 'object' },
'book.artDirection':  { model: 'google/gemini-2.5-flash', temperature: 0.6, retries: 4, baseDelayMs: 250, expect: 'object' },
'book.visualQa':      { model: 'google/gemini-2.5-flash', temperature: 0.3, retries: 3, baseDelayMs: 250, expect: 'object' },
'book.finalQa':       { model: 'google/gemini-2.5-flash', temperature: 0.2, retries: 3, baseDelayMs: 250, expect: 'object' },
```

Note: A6 (character designer), A7 (illustrator), A9 (PDF composer), A11 (delivery) do NOT use the LLM pipeline — they use image generation APIs or pure code.

---

## 9. Critical Decisions

### 9.1 PDF Generation

**Decision:** Use PDFKit with `"use node"` in a Convex action.

**Rationale:** PDFKit works in Node.js serverless environments. The `canvas` (node-canvas) dependency for image optimization is risky — skip image optimization for MVP and use PNG directly. If PDFKit fails in Convex runtime, fall back to `@react-pdf/renderer` (pure JS).

**Implementation:**
- `convex/bookComposer.ts` with `"use node"` at top
- Install `pdfkit` as dependency
- Do NOT install `canvas` — use PNG images without re-encoding
- Store generated PDF buffer in Convex file storage

**Timeout concern:** PDF generation should take <30 seconds. Well within Convex 10-minute action limit.

### 9.2 Image Generation Service

**Decision:** Gemini Imagen via direct REST API calls (same as demo).

**Model:** `gemini-2.5-flash-image` (native image generation via `responseModalities: ["IMAGE"]`).

**Implementation:**
- `convex/lib/geminiImageGen.ts` — port from `demo/src/lib/geminiImageGen.ts`
- Uses `fetch()` directly to `generativelanguage.googleapis.com` (no SDK needed)
- Rate limiting: 2-second minimum interval between calls (sequential generation in A7)
- Retry: 3 attempts with exponential backoff, 30s wait on 429
- Fallback: colored placeholder rectangles (pure canvas-free implementation using SVG-to-PNG or a simple buffer)

**Env var:** `GOOGLE_GENERATIVE_AI_API_KEY` (already configured in bajkot for video processing).

### 9.3 Convex Action Timeout Handling

**Decision:** Each agent is a separate Convex action. No single action runs >10 minutes.

**Analysis of time per agent:**
| Agent | Expected Time | Notes |
|-------|--------------|-------|
| A0 | <1s | Pure code |
| A1 | 5-15s | Single LLM call |
| A2 | 5-15s | Single LLM call |
| A3 | 10-30s | Long generation (story text) |
| A4 | 5-15s | Single LLM call |
| A5 | 10-30s | Single LLM call, 4 retries |
| A6 | 30-60s | 2 image generations |
| A7 | 2-5 min | 7 sequential image generations (2s rate limit between) |
| A8 | 5-15s | Single LLM call |
| A9 | 10-30s | PDF generation |
| A10 | 5-15s | Single LLM call |
| A11 | <1s | Status update |

**A7 is the longest at ~5 minutes.** This is within the 10-minute limit. If it exceeds, split A7 into sub-actions (one per illustration) chained via scheduler.

### 9.4 Image Generation Fallback (No canvas)

**Decision:** No `canvas` (node-canvas) dependency. If Gemini API is unavailable, generate simple colored PNG placeholders using pure JavaScript (e.g. a minimal PNG encoder or pre-baked static placeholder files stored in Convex storage).

For MVP: if image generation fails, store a `null` storageId and skip the image in the PDF. The PDF still generates with text-only pages.

### 9.5 LLM Client: OpenRouter vs Direct Gemini

**Decision:** Use the existing bajkot LLM client (`chatJsonForStage` via OpenRouter) for all text LLM calls. Use direct Gemini REST API only for image generation (A6, A7) since OpenRouter doesn't support image generation modality.

### 9.6 Data Persistence: JSON Strings vs Typed Fields

**Decision:** Store artifacts as JSON strings on `bookOrders` (matching bajkot's existing `planOutline`/`planFull` pattern). This avoids deeply nested validators in the schema and keeps the schema simple.

**Trade-off:** Loses type safety at the DB level. Mitigated by TypeScript interfaces at the application level and JSON.parse/stringify at boundaries.

---

## 10. File Organization

```
convex/
  bookPipeline.ts          -- Public API: startOrder, submitStyleVote, getOrderProgress, getDownloadUrl
  bookAgents.ts            -- "use node"; All internalAction handlers (A0-A11)
  bookPipelineHelpers.ts   -- internalQuery + internalMutation helpers (no "use node")
  bookComposer.ts          -- "use node"; A9 PDF generation (separated for clarity)
  lib/
    bookData.ts            -- Problems map, appearance maps, style definitions
    bookTypes.ts           -- TypeScript interfaces (Order, CharacterProfile, etc.)
    geminiImageGen.ts      -- Gemini image generation client (port from demo)
    prompts/
      bookFallbacks.ts     -- Prompt fallback strings for all book agents
```

Frontend:
```
src/
  routes/app/
    book-order.tsx         -- Order form
    book-progress.tsx      -- Pipeline progress
    book-vote.tsx          -- Style vote
    book-result.tsx        -- Final result + download
  lib/
    bookData.ts            -- Shared data maps (problems, appearances) for form dropdowns
```

---

## 11. Real-time Progress (Frontend Subscription)

### Query for progress

```typescript
// convex/bookPipeline.ts
export const getOrderProgress = query({
  args: { orderId: v.id('bookOrders') },
  returns: v.object({
    status: v.string(),
    currentAgent: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    hasStyleVoteImages: v.boolean(),
    chosenStyle: v.optional(v.string()),
    hasPdf: v.boolean(),
  }),
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error('Order not found');
    return {
      status: order.status,
      currentAgent: order.currentAgent,
      error: order.error,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      completedAt: order.completedAt,
      hasStyleVoteImages: !!(order.styleVoteImageA && order.styleVoteImageB),
      chosenStyle: order.chosenStyle,
      hasPdf: !!order.pdfStorageId,
    };
  },
});
```

### Frontend usage

```typescript
const progress = useQuery(api.bookPipeline.getOrderProgress, { orderId });
// Automatically re-renders when status changes in DB
```

No SSE needed. Convex reactive queries are real-time by default.

---

## 12. Environment Variables (New)

| Variable | Where | Purpose |
|----------|-------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Convex env | Gemini image generation (already exists for video pipeline) |

No new env vars needed for MVP. Image generation reuses the existing Gemini key. LLM calls go through OpenRouter (already configured).

---

## 13. Migration / Deployment Checklist

1. Add tables to `convex/schema.ts` (schema-builder agent)
2. Add PipelineStages to `pipelineConfig.ts` (pipeline-builder agent)
3. Add PromptTemplates to `types.ts` + fallbacks (prompt-porter agent)
4. Implement `bookPipeline.ts`, `bookAgents.ts`, `bookPipelineHelpers.ts`, `bookComposer.ts` (pipeline-builder agent)
5. Port `geminiImageGen.ts` (pipeline-builder agent)
6. Port `bookData.ts` + `bookTypes.ts` (schema-builder or pipeline-builder)
7. Add routes to `src/routes.ts` (frontend-builder agent)
8. Build 4 route components (frontend-builder agent)
9. Run `npm run lint` to verify everything compiles (verifier agent)
10. Test pipeline end-to-end on staging deployment

---

## Appendix A: Status Transition Diagram

```
intake → profiling → story_planning → story_writing → psych_review
                                         ↑                  │
                                         └── FAIL (retry) ──┘
                                                             │
                   character_design ──────┐              PASS/PASS_WITH_CORRECTIONS
                          │               │                  │
                    style_vote            │            art_direction
                          │               │                  │
                          └──── JOIN ─────┘──────────────────┘
                                  │
                            illustrating → visual_qa → composing_pdf → final_qa → delivering → completed
                                                                                                    │
                                                                                 (any stage) → failed
```

## Appendix B: Data Flow Diagram

```
FormData ─► A0 ─► orderData ─► A1 ─► characterProfile ─┬─► A2 ─► storyBlueprint ─► A3 ─► storyDraft
                                                        │                                      │
                                                        │                                      ▼
                                                        │                                     A4 ──► psychReview
                                                        │                                      │
                                                        ├─► A6 ─► styleVoteImages             A5 ──► illustrationPlan
                                                        │         │                            │
                                                        │        A6b ─► chosenStyle            │
                                                        │                │                     │
                                                        │                └──── JOIN ────────────┘
                                                        │                        │
                                                        │                       A7 ─► bookIllustrations
                                                        │                        │
                                                        └─────────────────► A8 ─► visualQa
                                                                             │
                                                                            A9 ─► pdfStorageId
                                                                             │
                                                                           A10 ─► finalQa
                                                                             │
                                                                           A11 ─► completed
```
