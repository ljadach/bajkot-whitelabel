# Spec: 2026-04-16 Prompt Refactor — Orchestrator Migration

**Context:** Łukasz i Andrzej przesłali paczkę nowych promptów (wszystkie agenci A0–A10) + zmianę formularza (wiek jako liczba, nie bracket) + zupełnie nowy układ książki (24/27/31 stron zamiast 10). Ten dokument opisuje co zostało zmienione w orkiestratorze (branch `feat-new-orkestration`) i co jeszcze trzeba zrobić.

## TL;DR

| Warstwa                                         | Stan                                            |
| ----------------------------------------------- | ----------------------------------------------- |
| Typy + helpery (age bracket, page sequence)     | ✅ gotowe + testy                               |
| Normalizery A3/A5 (nowe schematy snake_case)    | ✅ gotowe + testy                               |
| A3, A5, A7 handlery w `bookAgents.ts`           | ✅ przepisane                                   |
| A9 composer (24/27/31 stron portrait)           | ✅ przepisane (kod), wizualnie niezweryfikowane |
| A10 programmatic QA                             | ✅ dedication/parentCard jako warningi          |
| Schema: `ageNumber` + `parentDedication`        | ✅ dodane (opcjonalne)                          |
| Formularz UI (ageNumber input)                  | ❌ do zrobienia                                 |
| UI: dedication input podczas renderu ilustracji | ❌ do zrobienia                                 |
| A8 drift_warnings + nowy schemat VisualQa       | ❌ nie ruszone                                  |
| E2E test na DEV (3 wieki)                       | ⚠️ patrz sekcja "Weryfikacja"                   |

## 1. Wiek jako liczba

**Było:** formularz zbierał `ageBracket: "3-5" | "6-8" | "9+"`.
**Jest:** formularz (docelowo) zbiera `ageNumber: number` (3–16). Backend mapuje → bracket przez `toAgeBracket(n)` w `convex/lib/ageBracket.ts`.

**DB:** `bookOrders.ageNumber: v.optional(v.number())` dodane. `ageBracket` zostawione jako required dla kompatybilności. Wyszukiwarka brackeka — `resolveAgeBracket(order)` — czyta `ageNumber` najpierw.

**TODO (UI):** `src/components/book/BookOrderForm.tsx` (+ `TopicWizard.tsx`, `e2e/pages/bookOrder.page.ts`) — zmienić input wieku na liczbę; submit mutation musi zapisać oba pola (`ageNumber` + derived `ageBracket` jako shim dla reszty kodu). Póki co istniejące formularze działają — po prostu nie wypełniają `ageNumber`.

## 2. Schematy A1–A10 vs. obecny kod

### A1 — Child Profiler (v4)

Prompt oczekuje `visual_identity` (hair_color/hair_style/eye_color/...) plus `mood_palette`. W naszym TS type `CharacterProfile` **nie ma** dedykowanego pola `visualIdentity` — ale pipeline czyta `descriptionEn`/`visualAnchor`/`guideCharacter`, więc A1 działa dalej, tylko dodatkowe pola są ignorowane. Nie blokujące.

**TODO (niskiprio):** rozszerzyć `CharacterProfile` o `visualIdentity` i użyć go w A7 front-loading character tags.

### A2 — Story Architect (v4)

Prompt produkuje nowy kształt blueprinta z `arc_type`, `beats[].beat_id:string`, `illustration_plan[]` z nowymi stringowymi ID. Nasz `StoryBlueprint` type już miał te pola jako opcjonalne (trustee-parity). Dodałem `illustrationPlan?: BlueprintIllustrationEntry[]` żeby był typed.

Status: **działa bez zmian w kodzie** — LLM zwraca strukturę, my ją przepuszczamy dalej.

### A3 — Story Writer (v8) ⚠️ ZMIANA BREAKING

**Było:** `{title, dedication, pages: [{beatNumber, text, readAloudVersion}], parentCard, wordCount}`.
**Jest:** `{beats: [{beat_id:string, text_pl:string, word_count:number}]}`. **Bez** title, dedication, parentCard, coverBlurb.

**Co zmieniłem:**

- `convex/bookAgents.ts writeStory`: wyrzucony hardcoded stary JSON schema z user message (prompt systemowy sam definiuje kontrakt).
- `convex/lib/bookAgentUtilsV2.ts normalizeStoryDraftV2`: rozumie oba schematy (new + legacy), zwraca `StoryDraft` z pustym `dedication=""` gdy prompt go nie daje.
- `StoryPage` w `bookTypes.ts` dostał opcjonalne `beatId` i `wordCount`.

**Skutek:** `draft.dedication = ""` po nowym A3. Dedication przychodzi z `order.parentDedication` (UI input) albo fallbackiem `"Dla ${childName}"` w composer.

### A4 — Psych Reviewer (v5)

Prompt produkuje `{status, checks: {safety_scan, therapeutic_structure, ...}, corrections: [{beat, original_pl, corrected_pl, reason}], confidence}`. Nasz `PsychReview` type już ma `checks?` jako optional + `corrections[].originalPl/correctedPl` (trustee parity). **Działa bez zmian**.

`applyCorrections` znajduje pasujące teksty przez `originalPl` — nadal działa (A3 beats teraz mają `.text` wypełnione z `text_pl`).

### A5 — Art Director (v7) ⚠️ ZMIANA BREAKING

**Było:** 7 ilustracji (`cover` + `scene_1..6`), `illustrationId:string`, `beatRef:number`, `prompt`, `keyElements[]`, `width`/`height`.
**Jest:** 12/13/15 ilustracji zależnie od wieku, `id:string` (np. `scene_4a.2`), `beat_ref:string|null`, `composition`, `mood`, `illustration_prompt`, `negative_prompt`, `characters_present`, `visual_anchor_visible`, `aspect_ratio`, `category`.

**Co zmieniłem:**

- `IllustrationSpec` w `bookTypes.ts`: dodałem wszystkie nowe pola jako required, stare jako aliasy (optional).
- `directArt`: wyrzucony hardcoded stary 7-illustration schema; nowy `normalizeIllustrationPlan` zachowuje wszystkie nowe pola.
- A7 dostaje `composition`, `mood`, `negative_prompt` — front-loaded do prompta do Gemini.

**⚠️ Safety-critical:** `negative_prompt` musi teraz przechodzić z A5 do A7. Poprzednio nie było tego pola — ryzykowny content. Teraz jest.

### A6 — Character Designer, A6b — Style Vote

Nie tykane. Schematy produkcji referencji stylu nie zmieniły się w sposób wymagający zmian w kodzie.

### A7 — Illustrator (v4) ⚠️ ZMIANA

**Prompt spec:** per-image template variables → `{{COMPOSITION}}`, `{{MOOD}}`, `{{ILLUSTRATION_PROMPT}}`, `{{NEGATIVE_PROMPT}}`, `{{ASPECT_RATIO}}`, `{{ILLUSTRATION_ID}}`, `{{ILLUSTRATION_CATEGORY}}`, `{{VISUAL_ANCHOR}}`.

**Co zmieniłem:** `illustrate()` w `bookAgents.ts` teraz składa prompt do Gemini w kolejności: styl → composition → mood → illustration_prompt → "No text" → negative_prompt → safety suffix. Mood illustrations (`category==='mood'`) pomijają character preamble (postać się tam nie pojawia — `characters_present: []`).

Pixel size z aspect_ratio przez `derivePixelSize("2:3")` → portrait; `"3:2"` → landscape. Długa krawędź 900px.

**⚠️ Zwróć uwagę:** `sceneRef: v.number()` w `bookIllustrations` nie obsługuje stringów jak "4a"/"4b". Rozwiązanie: `illustrate()` **nie przekazuje już** sceneRef przy zapisie ilustracji. A9 composer nie używa sceneRef — sekwencja stron jest deterministyczna z `buildPageSequence(bracket)`.

**TODO (kosmetyczne):** `sceneRef` można oznaczyć jako deprecated w schemacie lub zmienić na `v.optional(v.string())` w przyszłej migracji.

### A8 — Visual QA (v4) ❌ NIEZMIENIONE

Nowy schemat ma `drift_warnings[]`, `regeneration_instructions[]`, per-image `character_consistency` + `guide_consistency` (null dla mood). Obecny `VisualQa` type jest stary. Kod A8 w `bookAgents.ts` przekazuje `VisualQa` typ, ale używa tylko `qa.status`. Więc **działa technicznie** — nowe pola przechodzą przez `JSON.stringify/parse` nienaruszone, ale są ignorowane.

**TODO:** rozszerzyć `VisualQa` type + użyć `regeneration_instructions` do celowanej regeneracji zamiast całego A7 re-run.

### A9 — Composer ⚠️ DUŻA PRZEPISANA

Spec mówi: 24 strony dla 3-5, 27 dla 6-8, 31 dla 9+. Square 210×210mm, portrait (nie landscape 2-up jak było).

**Co zrobiłem:** całkowity rewrite `convex/bookComposer.ts`. Napędzany przez `buildPageSequence(bracket)` z `pageSequence.ts`. Dla każdej `PageSpec` renderuje:

- `cover` — full-bleed cover.png + tytuł na dole (półprzezroczysty biały gradient)
- `title` — tytuł + subtitle + "Bajka dla [name]" + dedication (z `order.parentDedication` albo fallback)
- `mood_opening` / `mood_closing` / `illustration` — full-bleed
- `text` — tekst beatu; dla beatów z 2 ilustracjami split przez `splitBeatText` (paragraf → zdanie → słowa)
- `parent_card` — tytuł + intro + pytania + aktywność (z `draft.parentCard` albo A2 blueprint `parent_questions` + `actionable_takeaway.how_to_pl`)
- `colophon` — "Koniec" + disclaimer + branding

**⚠️ Wizualnie niezweryfikowane.** Kod się kompiluje, unit testy page sequence przechodzą, ale PDF jeszcze nie został wygenerowany end-to-end. Wymaga CLI pipeline test w DEV.

### A10 — Final QA

Nowy spec ma `checks.personalization/completeness/layout/text_image_coherence/content_safety` + `recommendation: DELIVER|DELIVER_WITH_FLAG|BLOCK`. Obecnie A10 u nas jest **programmatic** (nie LLM) — więc new spec jest kwestią dokumentacji, nie kodu.

**Co zmieniłem:** dedication_present i parent_card_present są teraz warningami (nie blokują DELIVER). Powód: dedication przychodzi z UI, może być puste; parent card treść z A2 blueprinta, `draft.parentCard` może być niewypełnione.

## 3. Nowe helpery (dobrze przetestowane)

```
convex/lib/ageBracket.ts      — toAgeBracket, resolveAgeBracket, expectedIllustrationIds, expectedBeatIds, shapeFor
convex/lib/pageSequence.ts    — buildPageSequence, splitBeatText, PageSpec
convex/lib/bookAgentUtilsV2.ts — normalizeStoryDraftV2, normalizeIllustrationPlan, normalizeIllustrationSpec, derivePixelSize
```

48 nowych unit testów (`tests/unit/ageBracket.test.ts`, `pageSequence.test.ts`, `bookAgentUtilsV2.test.ts`). Stare 4 failure w `normalizePages` naprawione przez delegację do V2.

## 4. Co jeszcze trzeba zrobić

### Priorytet wysoki

1. **UI dedication flow** — podczas statusu `style_vote` (albo zaraz po wyborze stylu, gdy A7 leci) pokazać formularz "wpisz dedykację". Mutation: `submitParentDedication(orderId, text)` → patch `order.parentDedication`. Dopóki tego nie ma, kompozer używa fallback `"Dla ${childName}"`.

2. **Formularz UI ageNumber** — jeden input number (min=3, max=16), walidacja, wysyłanie do Convex razem z derived `ageBracket` (user może jeszcze nie chcieć zmieniać DB schema dla legacy kodu).

3. **E2E smoke test (DEV, 3 wieki)** — CLI:
   ```bash
   npm run cli -- order -n Zosia4 -w    # sprawdza 3-5 (24 strony)
   npm run cli -- order -n Piotrek7 -w  # sprawdza 6-8 (27 stron)
   npm run cli -- order -n Lena10 -w    # sprawdza 9+ (31 stron, najtrudniejsze bo dodaje 4b)
   ```
   Weryfikacja: każde zamówienie dochodzi do statusu `completed`, PDF się generuje, ilość stron w PDF matchuje spec, ilustracje są na właściwych stronach.

### Priorytet średni

4. **A8 schemat visual QA** — rozszerzyć `VisualQa` type o `drift_warnings[]`, `regeneration_instructions[]`. Celowana regeneracja per-id zamiast całego A7 re-run.

5. **`CharacterProfile.visualIdentity`** — typed object z hair/eyes/skin/age_look. Użyć w A7 front-loading character tags (agent A1 już to produkuje w `visual_identity`).

6. **Format ilustracji Cover = 2:3, Scene/Mood = 3:2** — zweryfikować że Gemini image gen API honoruje dimensions portrait/landscape. Obecny `generateImage(prompt, {width, height})` przekazuje tylko liczby — może Gemini ignoruje.

### Priorytet niski

7. **`sceneRef` migracja** — albo wywalić z schema, albo zmienić na string. Obecnie nie jest już wypełniane przez nowy A7, więc stare ilustracje mają liczbę, nowe nie mają nic.

8. **Cleanup `bookAgentUtils.ts normalizePages`** — teraz jest thin wrapper nad V2, można go usunąć po upewnieniu się że żaden kod go nie importuje (pomijam teraz by nie rozbijać API).

## 5. Weryfikacja

### Co działa ✅

- **Lint:** `npm run lint` — OK (tsc convex + tsc frontend + eslint + convex dev once + react-router build — wszystko zielone)
- **Unit testy:** `npm test` — **85/85 zielone** (w tym 48 nowych).
- **Sprawdzony page count dla 3 wieków:**
  - `buildPageSequence("3-5").length === 24`
  - `buildPageSequence("6-8").length === 27`
  - `buildPageSequence("9+").length === 31`
- **Beat IDs** — 6/7/8 odpowiednio, z 4a dla 6+ i 4b dla 9+.
- **Illustration IDs** — 12/13/15, z `mood_opening` tylko dla 3-5, `scene_4a.*` dla 6+, `scene_4b.*` dla 9+.
- **normalizeStoryDraftV2** — akceptuje nowy `{beats:[{beat_id, text_pl, word_count}]}` + 3 legacy formaty.
- **normalizeIllustrationPlan** — zachowuje `negative_prompt`, `composition`, `characters_present`, `beat_ref:string|null`.
- **splitBeatText** — paragraph-preferring split dla podwójnych beatów.

### Czego nie zweryfikowałem 🧪

- **Nie odpalony realny CLI pipeline end-to-end w DEV.** Rekomendacja: jak tylko ktoś ma dostęp do DEV Gemini key, odpalić trzy zamówienia dla wieków 4/7/10 i sprawdzić że:
  1. A2 blueprint ma 6/7/8 beatów
  2. A5 illustration plan ma 12/13/15 entries ze wszystkimi nowymi polami
  3. A7 generuje wszystkie obrazki (logi: `npm run cli -- logs -u cli-user --full`)
  4. A9 produkuje PDF z dokładną liczbą stron
  5. A10 nie blokuje na dedication/parent_card (bo nie są wypełnione)

- **Nie weryfikowany layout PDF wizualnie** — fonty się rysują, obrazki się wstawiają, ale typografia i spacing per-age (3-5 duży tekst 20pt, 9+ mały 13pt) wymagają review człowieka.

## 6. Co trzeba zrobić w LOKALNYM testowaniu

```bash
# 1. Uruchom Convex dev:
npx convex dev

# 2. Smoke test po jednym zamówieniu na wiek (w osobnym terminalu):
npm run cli -- order -n Zosia -w
# → czekaj aż dojdzie do style_vote
# → admin panel / CLI: wybierz style A
# → poczekaj na A9, pobierz PDF
# → policz strony, zweryfikuj że cover + 12 ilustracji (dla 3-5)

# 3. Dla wieku 9+ zobacz czy A3 zwraca 8 beatów (w tym 4a + 4b):
npm run cli -- detail <orderId> --artifacts
# → storyDraft.pages.length === 8
# → zawierają beat_id "4a" i "4b"

# 4. Sprawdź logi LLM żeby zobaczyć wycinki promptów:
npm run cli -- logs --full | head -200
```

## 7. Rollback plan

Wszystkie zmiany są na branchu `feat-new-orkestration`, 5 commitów lokalnych wcześniejszych na `main` (login fix + CLI retry + LLM safety + doc updates). Jeśli refactor trzeba cofnąć:

```bash
git checkout main
git branch -D feat-new-orkestration     # usuń nieudany refactor
# 5 wcześniejszych commitów na main nadal lokalnie — można dalej pracować
```

Refactor nie dotyka **żadnych** istniejących zamówień (nowe pola w schemacie są opcjonalne; stare typy są zachowane jako aliasy). Orderów w toku nie trzeba migrować.

---

**Status na 2026-04-16 17:55:** `feat-new-orkestration` gotowy do review + e2e smoke test.
