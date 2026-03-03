---
name: langfuse-prompts
description: Manage prompt parity between code fallbacks and Langfuse. Use when the user wants to pull prompts from Langfuse to code, push code fallbacks to Langfuse, audit prompt parity, or sync prompts. Triggers on "langfuse prompts", "sync prompts", "audit prompts", "pull prompts", "push prompts", "prompt parity".
---

# Langfuse Prompt Manager

Sync and audit LLM prompt templates between the code fallback layer (`convex/lib/prompts.ts`) and the Langfuse prompt management API.

## Architecture

```
Langfuse (source of truth at runtime)
  │  fetchPrompt() via @langfuse/client
  ▼
renderPrompt() ─► tries Langfuse first
  │                if fail/missing ──► applyPlaceholders(fallback)
  ▼
PROMPT_CONFIGS[template].fallback   ◄── this is what we sync
```

### Key files

| File | Role |
|------|------|
| `convex/lib/prompts.ts` | `PromptTemplate` enum, `PROMPT_CONFIGS` (name + fallback), `templateSchemas` (Zod), `renderPrompt()` |
| `convex/lib/langfusePrompts.ts` | `fetchPrompt()` — runtime Langfuse client |
| `convex/ai.ts`, `convex/streaming.ts` | Callers that pass variables to `renderPrompt()` |

### Prompt mapping

Each `PromptTemplate` enum value maps to a Langfuse prompt name via `PROMPT_CONFIGS[template].name`. Example: `PromptTemplate.IntakeXmlUser` → `"intake-streaming-user"`.

Two enum values can map to the same Langfuse name (e.g. `IntakeXmlSystem` and `IntakeXmlStreamingSystem` both → `"intake-streaming-system"`).

### Variable system

- Langfuse uses `{{VARIABLE_NAME}}` placeholders
- Code validates variables via `templateSchemas` (Zod objects with `.strict()`)
- Variables with `.default('')` are optional — callers may omit them
- The `applyPlaceholders()` function replaces `{{VAR}}` in fallback text

## Langfuse API

**Base URL:** `https://cloud.langfuse.com`
**Auth:** Basic Auth with `LANGFUSE_PUBLIC_KEY:LANGFUSE_SECRET_KEY`

Get credentials from Convex env:
```bash
npx convex env get LANGFUSE_PUBLIC_KEY
npx convex env get LANGFUSE_SECRET_KEY
```

### Endpoints

**GET prompt:**
```bash
curl -s -u "$PK:$SK" "https://cloud.langfuse.com/api/public/v2/prompts/$NAME"
```

Response: `{ "prompt": "text...", "type": "text", "labels": [...], "version": N }`

**CREATE prompt:**
```bash
curl -s -u "$PK:$SK" -X POST "https://cloud.langfuse.com/api/public/v2/prompts" \
  -H "Content-Type: application/json" \
  -d '{"name":"$NAME","prompt":"$CONTENT","type":"text","labels":["production","latest"]}'
```

Returns HTTP 201 on success.

## Workflows

### 1. PULL — Download Langfuse prompts → update code fallbacks

Steps:
1. Get Langfuse credentials from Convex env vars
2. Read `convex/lib/prompts.ts` to get all entries in `PROMPT_CONFIGS`
3. For each unique Langfuse name, GET the prompt from API
4. Compare fetched text with current `fallback` string in code
5. If different, update the `fallback` in `PROMPT_CONFIGS`
6. Check for variable name changes: extract `{{VAR}}` from Langfuse text, compare with `templateSchemas`
7. If Langfuse introduces new variables: add to schema with `.default('')`
8. If Langfuse renames a variable: update schema AND all callers in `ai.ts`, `streaming.ts`
9. Run `npm run lint` to verify

**Variable rename checklist:**
- Update `templateSchemas` entry
- Search callers: `Grep for the old variable name in convex/`
- Update each caller's params object
- Verify with `npm run lint`

### 2. PUSH — Upload code fallbacks → Langfuse

Steps:
1. Get Langfuse credentials
2. Read `PROMPT_CONFIGS` to get all names and fallback text
3. For each prompt, try GET first to check if it exists
4. If 404: POST to create with `labels: ["production", "latest"]`
5. If exists: compare text. If different, POST creates a new version automatically
6. Verify: re-fetch all and confirm match

### 3. AUDIT — Verify 1:1 parity

Three-layer audit:

**Layer 1: Text parity**
- Fetch each Langfuse prompt
- Extract code fallback
- Diff ignoring trailing whitespace
- Report: PASS/FAIL per prompt

**Layer 2: Variable consistency**
- Extract `{{VAR}}` placeholders from Langfuse text
- Extract schema keys from `templateSchemas`
- Every Langfuse placeholder must have a schema entry
- Schema entries not in Langfuse are OK if they have `.default()`

**Layer 3: Caller correctness**
- For each schema variable without `.default()`, verify callers pass it
- Search `ai.ts`, `streaming.ts`, and other files that call `renderPrompt()`
- Every required variable must be provided by at least one caller

**Audit output format:**
```
[PromptName] Layer 1: PASS | Layer 2: PASS | Layer 3: PASS
```

## Practical patterns

### Fetching all prompts efficiently

```bash
# Get creds
PK=$(npx convex env get LANGFUSE_PUBLIC_KEY 2>/dev/null | tail -1)
SK=$(npx convex env get LANGFUSE_SECRET_KEY 2>/dev/null | tail -1)

# Fetch one prompt
curl -s -u "$PK:$SK" "https://cloud.langfuse.com/api/public/v2/prompts/intake-streaming-system" | jq -r '.prompt'
```

### Extracting fallbacks from code

Write a Node.js script that `require()`s the compiled output or uses regex on the source to extract fallback strings from `PROMPT_CONFIGS`.

### Diffing

Use `diff <(echo "$langfuse_text") <(echo "$code_text")` — ignore trailing whitespace with `diff -b`.

## Known gotchas

1. **Dual mapping**: `IntakeXmlSystem` and `IntakeXmlStreamingSystem` share one Langfuse prompt. Keep both fallbacks identical.
2. **Extra schema vars**: Some schema vars (e.g. `VIDEO_INSTRUCTIONS` in `PlaybookXmlSystem`) exist only in code for caller convenience, not in Langfuse. These have `.default('')` and are fine.
3. **Langfuse versioning**: POST always creates a new version. Use `labels: ["production", "latest"]` to make it the active version.
4. **Chat vs text type**: Most prompts are `type: "text"`. Check `PROMPT_CONFIGS` for the correct type before pushing.
