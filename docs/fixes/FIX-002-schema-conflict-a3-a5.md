# FIX-002: Schema conflict w promptach A3 i A5

## Problem

A3 (Story Writer) i A5 (Art Director) wysylają do LLM dwa sprzeczne JSON schemas — jeden w system prompcie (z `bookFallbacks.ts`), drugi w user message (inline w `bookAgents.ts`). LLM oscyluje między nimi.

**A3**: System prompt prosi o `scenes` z `text_pl`, `word_count`. User message prosi o `pages` z `text`, `readAloudVersion`. `normalizePages` w `bookAgentUtils.ts` obsługuje 4 różne kształty (`pages`, `scenes`, `beats`, `story_text`) bo model zgaduje.

**A5**: System prompt definiuje `negative_prompt`, `visual_anchor_visible`, `characters_present`. User message definiuje `sceneDescription`, `keyElements`, `width`, `height`. Wspólne pola to tylko `prompt` i `mood`.

## Root cause

Prompty w `bookFallbacks.ts` były pisane jako spec docs, a potem user messages w `bookAgents.ts` ewoluowały niezależnie. Nikt nie zsynchronizował obu.

## Plan naprawy

### A3 — Story Writer

1. **Usunąć JSON schema z fallback prompt A3** (`bookFallbacks.ts` linie ~756-767) — zostawić narrative instructions, usunąć `## Output Format` sekcję
2. **User message w `bookAgents.ts` (A3, linia ~392-412) jest źródłem prawdy** — tam jest schema który matchuje `StoryDraft` w `bookTypes.ts`
3. **Dodać do system prompt jednolinijkowy pointer**: "Output format is defined in the user message below."
4. **Usunąć** `normalizePages` fallbacki na `scenes`/`beats`/`story_text` — po fix zostanie tylko `pages`
5. **Przetestować**: wygenerować 3 bajki, sprawdzić czy model konsekwentnie zwraca `pages`

### A5 — Art Director

1. **Usunąć JSON schema z fallback prompt A5** — zostawić instructions dot. kompozycji, nastroju, spójności postaci
2. **User message w `bookAgents.ts` (A5, linia ~678-702) jest źródłem prawdy**
3. **Usunąć** normalization fallbacki w A5 handler (`ill.id || ill.illustration_id || fallbackId(i)`) — po fix model zwraca `illustrationId` konsekwentnie
4. **Przetestować**: wygenerować 3 bajki, sprawdzić spójność output

### Pliki do zmian

- `convex/lib/prompts/bookFallbacks.ts` — A3 i A5 sekcje Output Format
- `convex/bookAgents.ts` — user messages A3 i A5 (bez zmian, to źródło prawdy)
- `convex/lib/bookAgentUtils.ts` — uprościć `normalizePages` po potwierdzeniu stabilności
- `convex/admin/bookPrompts.ts` — re-seed po zmianach w fallbacks

### Ryzyko

Średnie. Zmiana prompta wymaga re-seedu w produkcji. Wersjonowanie w `bookPromptVersions` daje rollback.
