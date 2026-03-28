# FIX-004: Wersjonowanie promptów — weryfikacja

## Status: AUDYTOR SIĘ MYLIŁ — wersjonowanie ISTNIEJE

## Co jest

System promptów ma pełne wersjonowanie:

- **Tabela `bookPromptVersions`** (`schema.ts:231`): `promptKey`, `content`, `version`, `editedBy`, `editedAt`, `changeNote`
- **Indeksy**: `by_prompt_key`, `by_prompt_key_version`
- **API admin** (`admin/bookPrompts.ts`):
  - `listPromptVersions(promptKey)` — historia wersji danego prompta
  - `getPromptVersion(versionId)` — konkretna wersja
  - `restorePromptVersion(versionId)` — rollback do wybranej wersji
  - `savePrompt()` — automatycznie tworzy wersję w `bookPromptVersions` przed zapisem
- **UI w admin panelu** — zakładka "Prompts" w Book Lab pozwala na edycję, import/export, przegląd wersji

## Co BRAKUJE (minor)

1. **`getPrompt()` w `bookAgents.ts` nie ma code-level fallback** — jeśli prompt nie jest w DB, rzuca wyjątek zamiast fallować na `bookFallbacks.ts`. To oznacza że `bookFallbacks.ts` jest TYLKO seed, nie runtime fallback.

2. **Nazwa pliku** `bookFallbacks.ts` jest myląca — to są seed values, nie fallbacki. Ale to kosmetyka.

## Rekomendacja

- Opcjonalnie: dodać runtime fallback w `getPrompt()` na `bookFallbacks` jeśli DB jest pusta
- Opcjonalnie: przemianować `bookFallbacks.ts` → `bookPromptSeeds.ts`
- **NIE trzeba budować wersjonowania — już jest**
