# FIX-005: A6 ignoruje BookCharacterDesigner prompt

## Problem

`bookFallbacks.ts` definiuje `BookCharacterDesigner` prompt z:

- System scoringowy (5 kryteriów: anatomy, expressiveness, consistency, style_match, child_friendliness)
- Generacja dwóch stylów z porównaniem
- Rekomendacja wyboru stylu
- Structured JSON output ze scoring

Ale `designCharacter()` w `bookAgents.ts` (A6) **nigdy nie woła `getPrompt(BookCharacterDesigner, ...)`**. Zamiast tego buduje prompty inline:

```ts
const promptA = `Children's book character design. Character: ${childDesc}, standing in a neutral pose...`;
```

Cały prompt w DB jest martwą dokumentacją.

## Root cause

A6 został przepisany na prostszą implementację (generate + store, bez scoringu), ale prompt fallback nie został zaktualizowany.

## Plan naprawy

### Opcja A: Zaktualizuj prompt do tego co A6 faktycznie robi (rekomendowana)

1. Zamień `BookCharacterDesigner` fallback na opis tego co A6 naprawdę robi:
   - Generuje 2 reference images (Style A, Style B) z fixed prompt template
   - Przechowuje w storage
   - Stawia status `style_vote` lub skip (batch mode)
2. Zachowaj jako spec doc (tak jak A0, A7, A9, A11)

### Opcja B: Zaimplementuj scoring z prompta

1. Po wygenerowaniu obrazków, wyślij je do LLM z `BookCharacterDesigner` prompt
2. LLM ocenia jakość, zwraca scoring
3. Jeśli scoring < threshold, regeneruj
4. **Koszt**: dodatkowy LLM call z vision per order (~$0.02-0.05)
5. **Wartość**: wyższa jakość character design, lepszy input do A7

### Rekomendacja

Opcja A na teraz (quick fix). Opcja B jako przyszłe ulepszenie po walidacji że jakość character design jest problemem.

## Pliki do zmian

- `convex/lib/prompts/bookFallbacks.ts` — `BookCharacterDesigner` sekcja
