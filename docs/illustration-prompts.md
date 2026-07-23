# 30 promptów do Gemini — ilustracje na bajkoterapii.org (v2 — fotorealistyczny polaroid)

> **Źródło:** brief od Andrzeja, 2026-05.
> **Generator:** `.claude/skills/mag-visual-generate/` + `scripts/generate-illustrations.sh`.
> **Output dir:** `public/illustrations/` (ścieżka w UI: `/illustrations/<key>.png`).
> **Reference image:** `docs/protos_v2/ref-photo.png` — wysyłany jako załącznik z każdym promptem (wpisane w `prompts.json` → `_meta.reference`).

## Co się zmieniło względem v1

V1 celował w styl akwarelowy/ilustracyjny (Beatrix Potter / Jon Klassen). Po obejrzeniu referencji od Andrzeja — fotorealistyczne ujęcie sceny rodzinnej w polaroidowej ramce z kreskówkowymi nakładkami (miś, serduszko, sparkles). Gemini 2.5 Flash Image dostaje:

1. Style bible z `bajkot.txt`
2. Sam prompt sceny
3. Referencyjny obrazek jako anchor wizualny (multi-modal input)

Dzięki temu spójność stylu między batch-ami jest dużo wyższa niż w v1.

## Komenda

```bash
scripts/generate-illustrations.sh --list
scripts/generate-illustrations.sh --force hero
scripts/generate-illustrations.sh --group themes
scripts/generate-illustrations.sh --force                  # wszystkie 30
```

Wymagania: `GEMINI_API_KEY` w `.env.local`, `jq`, `uv` (skrypt skill-owy używa `uv run --script`).

## Mapping promptów do miejsc w serwisie

| key (output filename)           | gdzie używane                                     |
| ------------------------------- | ------------------------------------------------- |
| `hero.png`                      | HomePage hero (img w karcie hero)                 |
| `step-01-temat.png`             | HomePage „Jak to działa" — krok 1                 |
| `step-02-dziecko.png`           | HomePage „Jak to działa" — krok 2                 |
| `step-03-ksiazka.png`           | HomePage „Jak to działa" — krok 3                 |
| `why-01-self.png`               | HomePage zasada terapeutyczna #1                  |
| `why-02-distance.png`           | HomePage zasada terapeutyczna #2                  |
| `why-03-guide.png`              | HomePage zasada terapeutyczna #3                  |
| `why-04-structure.png`          | HomePage zasada terapeutyczna #4                  |
| `story-founders.png`            | HomePage origin story / Nasza historia            |
| `cta-bedtime.png`               | HomePage final CTA                                |
| `theme-lek-ciemnosci.png`       | topics.ts → `lek-przed-ciemnoscia` heroImage      |
| `theme-przedszkole.png`         | topics.ts → `adaptacja-przedszkolna` heroImage    |
| `theme-zlosc.png`               | topics.ts → `napady-zlosci` heroImage             |
| `theme-zazdrosc-rodzenstwo.png` | topics.ts → `nowe-rodzenstwo` heroImage           |
| `theme-strata-bliskiej.png`     | (do dodania jako nowy temat lub blog cover)       |
| `theme-rozwod.png`              | topics.ts → `rozwod-rodzicow` heroImage           |
| `theme-dzielenie-zabawkami.png` | topics.ts → `dzielenie-sie` heroImage             |
| `theme-jedzenie.png`            | topics.ts → `wybiorczos-pokarmowa` heroImage      |
| `theme-spanie-samodzielne.png`  | topics.ts → `samodzielne-zasypianie` heroImage    |
| `theme-szkola.png`              | (do dodania jako blog/temat starszych dzieci)     |
| `theme-egzaminy.png`            | (do dodania jako blog/temat starszych dzieci)     |
| `theme-strata-zwierzaka.png`    | (do dodania jako blog/temat)                      |
| `theme-rozstanie.png`           | topics.ts → `lek-separacyjny` heroImage           |
| `theme-niepowodzenie.png`       | topics.ts → `odpornosc-na-porazke` heroImage      |
| `theme-burza.png`               | topics.ts → `nadwrazliwosc-sensoryczna` heroImage |
| `theme-bohaterowie.png`         | topics.ts → `niska-samoocena` heroImage           |
| `theme-lekarz.png`              | topics.ts → `lek-przed-lekarzem` heroImage        |
| `theme-niesmialosc.png`         | topics.ts → `niesmialosci` heroImage              |
| `theme-moczenie-nocne.png`      | topics.ts → `moczenie-nocne` heroImage            |
| `theme-wizyta-szpital.png`      | topics.ts → `wizyta-w-szpitalu` heroImage         |
| `theme-rodzenstwo-klotnia.png`  | topics.ts → `rywalizacja-rodzenstwo` heroImage    |
| `theme-przeprowadzka.png`       | topics.ts → `przeprowadzka` heroImage             |

---

## STYLE BIBLE (jeśli generujesz ręcznie w Gemini Pro)

Wklej najpierw to, potem załącz `ref-photo.png`, dopiero potem wklejaj prompty:

```
You are going to help me generate 30 brand visuals for "Bajkoterapia" — a Polish service that creates personalized therapeutic storybooks for children aged 2-12. Every image you generate in this conversation MUST follow these style rules. Memorize them. Apply them to every prompt I send.

OVERALL VISUAL CONCEPT — VERY IMPORTANT, READ CAREFULLY:
Each image is a "polaroid memory" composition with three layers:

  LAYER 1 — The photograph itself (photorealistic):
  - Cinematic, warm, lifestyle photography of real children and parents in real cozy domestic settings
  - Shot on a 50mm lens, shallow depth of field, soft natural light (golden hour or warm lamp light)
  - Documentary / candid feel — never staged stock-photo, never overly posed
  - NOT illustration, NOT cartoon, NOT 3D render, NOT painted — actual photographic realism

  LAYER 2 — The polaroid frame:
  - The photograph sits inside a classic white polaroid border (thicker bottom edge)
  - Slight rotation: -3 to +3 degrees, randomized per image (for natural feel)
  - Soft realistic drop shadow underneath the polaroid
  - Background behind the polaroid: soft, blurred, off-white / cream / warm pastel

  LAYER 3 — Cartoon decorative overlays (around the polaroid, NOT inside the photo):
  - Cute hand-drawn cartoon stickers floating around the corners of the polaroid
  - Standard set: a small plush teddy bear (bottom-left), a soft pink heart (right side), a few small golden sparkles or stars (top-right)
  - Sometimes vary: small moon, tiny butterfly, a small blue book, tiny crown — pick what fits the scene
  - These overlays partially overlap the polaroid edge for depth

CHILDREN, PARENTS, INTERIORS, BOOK, LIGHTING — see styles/bajkot.txt in the repo for the full rule set. Same content lives there.

ASPECT RATIO: Square 1:1.

DO NOT: readable text, harsh contrast, neon colors, uncanny faces, AI-art look.

Confirm by replying only "Ready" — then I'll send prompt #1.
```

---

## PROMPTY (treść w `scripts/illustrations/prompts.json`)

Obecny stan promptów żyje w `scripts/illustrations/prompts.json` — to one są źródłem prawdy dla skryptu i dla manualnego użycia. Nie duplikujemy ich tu, żeby nie rozjechać dwóch źródeł. Jeśli chcesz przeczytać:

```bash
jq -r '.service, .themes' scripts/illustrations/prompts.json | less
```

## Co robić jak coś nie wyjdzie

- **Twarz dziecka creepy / dziwne oczy** → regeneruj z dopiskiem _"the child's face looks unnatural — give clear soft natural features, real-looking eyes, like a real photographed child"_
- **Książka ma „krasnoludeck"** → _"no readable text on the book — replace title text with abstract decorative ornament or magical illustrated cover only"_
- **Polaroidowa ramka za grube nakładki** → _"reduce the size of cartoon stickers, make polaroid frame more subtle and clean"_
- **Wygląda zbyt sztucznie / stock photo** → _"more natural, candid, documentary feel — slightly imperfect, real family moment"_

## Spójność stylu

Trzy mechanizmy razem:

1. **Style bible w `bajkot.txt`** — prepend do każdego prompta
2. **Reference image** — wysyłany jako PIL.Image w `contents=[prompt, ref_img]`
3. **Sama treść promptu** — explicit polaroid frame + cartoon stickers w każdym

Dzięki temu dla v2 batch wszystkie 30 obrazków wyglądają jak z jednej sesji.
