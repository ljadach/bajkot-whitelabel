# FIX-006: Brak negative promptów w generowaniu ilustracji

## Problem

A5 (Art Director) fallback prompt definiuje comprehensive negative prompts:

> "scary, dark, horror, realistic photo, ugly, deformed, extra fingers, extra limbs, blurry, watermark, text, signature, adult content"

Ale A7 (Illustrator) w `bookAgents.ts` nigdy ich nie przekazuje do `generateImage()`. Jedyny "negatyw" to `"No text in image."` dopisany do prompta.

`generateImage()` w `geminiImageGen.ts` nie ma parametru `negativePrompt` — Gemini native image gen API nie wspiera go w ten sposób. Negatywy muszą być wbudowane w prompt.

## Plan naprawy

1. **W A7 handler** (`bookAgents.ts`, `illustrate` function), do `fullPrompt` dopisz negatywy jako suffix:

```ts
const safetyNegatives =
  'Do not include: scary imagery, dark horror themes, realistic photography, deformed anatomy, extra fingers or limbs, blurry content, watermarks, text overlays, signatures, adult or violent content.';
const fullPrompt = `${styleLine}\n\n${consistencyPreamble}\n\n${illPrompt}\n\n${safetyNegatives}`;
```

2. **W A6 handler** (`designCharacter`), dodaj te same negatywy do `promptA` i `promptB`

3. **Wyeksportuj** negatywy jako stała w `convex/lib/bookData.ts` lub `bookAgentUtils.ts` żeby nie duplikować

## Pliki do zmian

- `convex/bookAgents.ts` — A7 `illustrate` i A6 `designCharacter`
- `convex/lib/bookAgentUtils.ts` — nowa stała `IMAGE_SAFETY_SUFFIX`

## Ryzyko

Niskie. Dodatkowy tekst w prompcie ~30 tokenów. Może nieznacznie zmienić styl ilustracji (model bardziej unika ciemnych scen). Warto przetestować na 2-3 bajkach.
