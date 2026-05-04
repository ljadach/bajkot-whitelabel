# 30 promptów do Gemini Pro — ilustracje na bajkoterapii.org

> **Źródło:** brief od Andrzeja, 2026-05.
> **Generator:** `.claude/skills/mag-visual-generate/` + `scripts/generate-illustrations.sh`.
> **Output dir:** `public/illustrations/` (serwowane przez Vite, ścieżka w UI: `/illustrations/<key>.png`).

## Jak tego używać (3 minuty czytania, potem już lecisz)

1. **Otwórz nową rozmowę** w Gemini Pro (gemini.google.com lub aplikacja). Ważne: nową, świeżą — żeby Gemini nie mieszał Ci z poprzednimi tematami.
2. **Wklej najpierw blok "STYLE BIBLE"** poniżej. Jeden raz, na początku. To jest nasza biblia stylu — Gemini ma to zapamiętać przez całą rozmowę i każdy kolejny obrazek będzie w tej samej estetyce.
3. **Po style bible wklejaj prompty 1, 2, 3...** w kolejności. Z każdego dostaniesz zwykle kilka wariantów — wybierz najlepszy.
4. **Zapisuj plik z dokładnie taką nazwą jak w nagłówku** (np. `hero.png`). To ważne, bo ja używam tych nazw w HTML — jeśli zmienisz, muszę szukać ręcznie.
5. **Wszystkie pliki ląduj w folderze:** `Prototyp/images/` (utworzę go automatycznie kiedy wrzucisz pierwszy plik).
6. Kiedy skończysz — wróć do mnie i napisz _"obrazki gotowe"_. Ja podpinam wszystko w HTML.

**Wskazówki:**

- Jeśli któryś obrazek wyjdzie słabo, napisz Geminiowi _"regenerate, more [warmer / cuter / less detail / more focus on X]"_ — ma kontekst rozmowy, poprawi.
- Format: wszystkie obrazki **kwadratowe (1:1)** — Gemini sam o to zadba (jest w style bible).
- Jeśli zechcesz polski tekst w obrazku, **odpuść** — modele AI nie umieją jeszcze polskich liter, wyjdzie _"krasnaludeck"_.
- Pij kawę. To 30-40 minut spokojnego klejenia, ale bez myślenia.

---

## STYLE BIBLE (wklej to RAZ, na początek rozmowy)

```
You are going to help me generate 30 children's book illustrations for a brand called "Bajkoterapia" (Polish: "fairy tale therapy") — a service that creates personalized therapeutic stories for children aged 2-12.

CRITICAL: Every single image you generate in this conversation MUST follow these style rules. Memorize them. Apply them to every prompt I send, even if I don't repeat them.

VISUAL STYLE:
- Warm, soft watercolor children's book illustration
- Hand-painted feel, gentle ink outlines, slight paper texture
- NOT 3D, NOT photorealistic, NOT cartoon-flat-vector — think Beatrix Potter meets modern Scandinavian picture books (Jon Klassen, Oliver Jeffers, Eva Eriksson vibes)
- Square 1:1 aspect ratio for every image unless I say otherwise

COLOR PALETTE (strict):
- Primary: soft sky blue (#bae6fd), deeper twilight blue (#0284c7), midnight navy (#0c4a6e)
- Accent magic: warm amber gold (#fbbf24), candle yellow (#fde68a)
- Soft accents: blush pink (#fbcfe8), cream (#fef3c7), warm peach
- Avoid: harsh saturated colors, neon, pure black, gray-only palettes

MOOD:
- Cozy, safe, warm, magical, calming
- Gentle bedtime / twilight / candlelight quality of light
- Always emotionally hopeful — even when depicting a difficult emotion (fear, sadness, anger), the composition suggests a path toward calm

CHARACTERS (children):
- Diverse: vary hair color (blonde, brown, dark, red), skin tone (fair, olive, brown), age (toddler 2yo to school-age 10yo), and gender presentation across the 30 images
- Cute but not saccharine — round faces, expressive eyes, gentle proportions
- Children appear safe, accompanied (parent, magical friend, or animal companion) — never lonely-distressed
- NO logos, NO text, NO writing on books or signs

RECURRING MOTIFS (use freely where they fit):
- Open glowing storybook with magical light spilling out
- Stars, crescent moon, fireflies, soft sparkles
- Cozy interiors: bedrooms, reading nooks, blanket forts
- Forest/meadow at twilight with friendly creatures
- Teddy bears, plush companions

TECHNICAL:
- 1:1 aspect ratio
- Composition leaves visual breathing room (avoid edge-to-edge clutter)
- Clear focal point — one main scene, not collage
- No text, no captions, no watermarks, no signatures

When I send a prompt, generate one image (or your default 4 variants) following these rules. Don't summarize the rules back to me — just generate the image.

Confirm you understand by replying with just "Ready" — and then I'll send prompt #1.
```

---

## Mapping promptów do miejsc w serwisie

| key (output filename)           | gdzie używane                                     |
| ------------------------------- | ------------------------------------------------- |
| `hero.png`                      | HomePage hero (zamiast emoji 📖 w hero card)      |
| `step-01-temat.png`             | HomePage "Jak to działa" — krok 1                 |
| `step-02-dziecko.png`           | HomePage "Jak to działa" — krok 2                 |
| `step-03-ksiazka.png`           | HomePage "Jak to działa" — krok 3                 |
| `why-01-self.png`               | HomePage zasada terapeutyczna #1                  |
| `why-02-distance.png`           | HomePage zasada terapeutyczna #2                  |
| `why-03-guide.png`              | HomePage zasada terapeutyczna #3                  |
| `why-04-structure.png`          | HomePage zasada terapeutyczna #4                  |
| `story-founders.png`            | HomePage origin story / Nasza historia            |
| `cta-bedtime.png`               | HomePage CTA section                              |
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
| `theme-rodzenstwo-klotnia.png`  | topics.ts → `rywalizacja-rodzenstwo` heroImage    |
| `theme-przeprowadzka.png`       | topics.ts → `przeprowadzka` heroImage             |

---

## PROMPTY (wklejaj jeden po drugim, w kolejności)

### 1. `hero.png` — główna ilustracja na hero strony głównej

```
A child in pajamas (around age 5-6) sitting cross-legged on a cozy bed at twilight, holding an open glowing storybook. Soft golden magical light and gentle stars rise out of the book pages, drifting upward. A small firefly hovers nearby. A teddy bear sits at the child's side. Through a window in the background: deep twilight sky with a crescent moon. Mood: peaceful, magical bedtime moment. The child has a calm, enchanted expression looking down at the book.
```

### 2. `step-01-temat.png` — "Wybierz temat" (krok 1 sekcji "Jak to działa")

```
A warm illustration of a child gazing thoughtfully at a glowing tree of small floating storybooks, each tiny book softly representing a different emotion or theme (one shows a star, one a heart, one a small moon, one a tiny bear — abstract symbols, no text). Twilight color palette. The child reaches up to touch one of the books. Concept: choosing the right story for what the child needs.
```

### 3. `step-02-dziecko.png` — "Opowiedz o dziecku" (krok 2)

```
A soft illustration of a parent (warm, gender-neutral) and a child sitting close together in a sunlit reading nook. The parent is gently writing or sketching in a notebook on their lap, while the child shows them a favorite plush toy. Tender, attentive mood. Concept: a parent describing their unique child to create a personalized story. Soft late-afternoon golden light.
```

### 4. `step-03-ksiazka.png` — "Odbierz książkę" (krok 3)

```
A close-up illustration of a beautifully wrapped storybook arriving in a child's hands — a gentle hand-off moment. The book has a glowing magical aura. The child's eyes light up with anticipation. In the background, a warm cozy home interior in soft watercolor. Concept: the joyful moment of receiving the finished personalized book.
```

### 5. `why-01-self.png` — "Efekt Odniesienia do Ja" (mózg / identyfikacja)

```
An illustration of a child sitting beside an open storybook, and from the pages emerges a small, magical version of the SAME child — like looking in a magical mirror. The two figures look at each other with wonder. Soft glow connects them. Concept: a child seeing themselves as the hero of their own story.
```

### 6. `why-02-distance.png` — "Bezpieczny dystans" (metafora)

```
An illustration of a child standing on a small safe wooden bridge over a soft, friendly storm cloud below. The cloud has a gentle face, not scary. The child looks down with curiosity, not fear. Magical glowing path leads forward into a sunlit forest. Concept: looking at difficult feelings safely from a magical distance.
```

### 7. `why-03-guide.png` — "Mądry Przewodnik" (magiczny pomocnik)

```
A wise, gentle magical creature — perhaps a small luminous owl wearing a tiny scarf, or a kind glowing forest spirit — sitting on a tree branch beside a child in a forest clearing at twilight. The creature is pointing a soft glowing paw toward a path forward. Warm, safe, mentor-like atmosphere. Concept: a magical guide helping the child find their way.
```

### 8. `why-04-structure.png` — "Struktura terapeutyczna" (5-etapowa podróż)

```
A bird's-eye view illustration of a winding magical path through five distinct soft watercolor scenes connected like stepping stones: a cozy home (start), a small wood with a question mark cloud (challenge), a wise creature (guide), a warm light (resolution), a celebratory rainbow with a tiny figure cheering (success). Soft connecting glowing line between them. Concept: the 5-stage therapeutic story structure as a visual journey map.
```

### 9. `story-founders.png` — "Nasza historia" (rodzice opowiadają bajkę dziecku)

```
A tender bedtime scene: two warm parents sitting on the edge of a child's bed, one of them telling a story with animated hands, the other smiling. The child is tucked under a soft blanket, eyes wide with wonder. A small lamp glows on the bedside table. Above them, faint magical sparkles and a tiny imagined firefly hover — visualizing the story they're telling. Concept: parents inventing a magical story for their child (the founder's origin story).
```

### 10. `cta-bedtime.png` — call-to-action na dole strony

```
A wide warm scene of a parent and child reading a glowing storybook together at bedtime, viewed slightly from behind so we see the book's magical light illuminating their faces in soft profile. Stars and small magical motifs gently rise from the book. Window in background shows a peaceful starry night. Mood: invitation, warmth, a moment to come home to.
```

---

## ILUSTRACJE TEMATYCZNE (20 obrazków)

### 11. `theme-lek-ciemnosci.png` — lęk przed ciemnością

```
A small child in pajamas standing in a softly dim bedroom, facing a friendly glowing firefly hovering at eye level. The "darkness" in the room is rendered as a soft midnight blue blanket sprinkled with stars — friendly, not menacing. The child reaches out a curious hand toward the firefly. Concept: discovering that the dark is full of gentle magic, not monsters.
```

### 12. `theme-przedszkole.png` — pierwszy dzień w przedszkolu

```
A child standing at the bright, friendly entrance of a kindergarten, holding a small backpack and a tiny stuffed animal. A warm parent kneels nearby, hand on the child's shoulder, smiling reassuringly. Other children playing softly in the background, no overwhelming detail. Sunlight pouring in. Mood: brave, hopeful, supported.
```

### 13. `theme-zlosc.png` — radzenie sobie ze złością

```
A child sitting on a soft cushion, eyes closed, breathing deeply. Around them, what was once a stormy red cloud of anger is gently transforming into a small soft pink cloud with tiny calm stars. A subtle warm glow surrounds the child. Concept: anger acknowledged and softened, not suppressed.
```

### 14. `theme-zazdrosc-rodzenstwo.png` — zazdrość o nowo narodzone rodzeństwo

```
An older child sitting on a windowsill watching a parent gently rock a tiny baby in the next room. The older child holds a worn beloved teddy bear close. Soft afternoon light. The expression is thoughtful, a bit melancholy, but a tiny warm sparkle hovers near the teddy bear suggesting hope. Concept: navigating the complex feelings of a new sibling arriving.
```

### 15. `theme-strata-bliskiej.png` — strata bliskiej osoby (delikatnie!)

```
A child sitting in a meadow at golden hour, looking up at a single warm star in a soft pastel sky. Beside the child, a glowing dandelion seeds float gently upward. A small bird perches nearby, peaceful. Mood: tender, hopeful, gently sad — never bleak. Concept: remembering someone loved with warmth.
```

### 16. `theme-rozwod.png` — rozwód rodziców

```
A child holding hands with two warm parental figures, one on each side, in a soft sunlit park. The parents stand apart from each other but both lean in toward the child with care. A small heart-shaped balloon floats above the child. Mood: secure, loved by both, even when things change. Avoid any visual of conflict.
```

### 17. `theme-dzielenie-zabawkami.png` — dzielenie się

```
Two small children sitting on a colorful rug, one gently offering a wooden toy to the other. Both children's faces show warm, slightly shy smiles. Around them, soft magical sparkles emerge from the shared toy. Mood: gentle moment of generosity. Cozy playroom interior.
```

### 18. `theme-jedzenie.png` — niejadek / problemy z jedzeniem

```
A child at a sunny breakfast table, looking with surprised curiosity at a friendly little vegetable character (a smiling carrot or pea with tiny arms) waving from a plate. A warm parent in the background smiles. Bright, light, playful — never forced or pressured. Concept: making food feel friendly and adventurous.
```

### 19. `theme-spanie-samodzielne.png` — spanie samodzielnie

```
A child snuggled in their own bed, surrounded by a soft circle of glowing protective stars and a watchful teddy bear standing guard. Through the slightly open door, a warm hallway light. Mood: cozy, safe, brave. Concept: feeling protected sleeping in your own bed.
```

### 20. `theme-szkola.png` — lęk przed szkołą

```
A child in a cute schoolbag walking up a soft path toward a warm, glowing schoolhouse in the distance. The child holds a small magical compass-like object that points the way. A friendly cartoon bird flies alongside. Mood: brave first steps, supported by a small magical helper.
```

### 21. `theme-egzaminy.png` — stres przed sprawdzianem

```
A child at a desk with an open notebook, taking a calm deep breath. Around them, the air is filled with gently floating soft origami stars instead of cluttered worries. A warm cup of tea sits beside them. Mood: calm focus, breathing through pressure.
```

### 22. `theme-strata-zwierzaka.png` — strata ulubionego zwierzaka

```
A child hugging a soft blanket while looking up at a starry sky. In the constellations above, the soft outline of a small dog or cat shape glows warmly. A tiny tear on the child's cheek but a small smile too. Tender, hopeful mood. Concept: keeping the love for a lost pet.
```

### 23. `theme-rozstanie.png` — lęk separacyjny

```
A small child on a doorstep waving to a parent leaving for work, with a wise grandparent or caregiver standing supportively beside them. Between the parent and child, an invisible glowing thread of light connects their hearts, visualized as a gentle golden line. Concept: love stays connected even when apart.
```

### 24. `theme-niepowodzenie.png` — radzenie sobie z porażką

```
A child standing up after falling off a small wooden balance beam in a sunny meadow. The child has a determined, slightly amused expression, dusting themselves off. A friendly forest animal (rabbit or fox) watches encouragingly. Mood: getting back up, not defeat.
```

### 25. `theme-burza.png` — lęk przed burzą / głośnymi dźwiękami

```
A child and a parent cuddled under a fort made of blankets and fairy lights, listening to soft rain through a window. The "storm" outside is rendered gently — soft blue clouds, friendly raindrops, no harsh lightning. Inside the fort, warm golden glow. Mood: turning a scary storm into a cozy adventure together.
```

### 26. `theme-bohaterowie.png` — kim chcę być / poczucie własnej wartości

```
A child in plain clothes looking at their own reflection in a magical mirror — but the reflection shows them as a brave hero with a soft glowing cape made of stars. Confident, warm smile. Mood: discovering inner strength. Soft cozy bedroom setting.
```

### 27. `theme-lekarz.png` — wizyta u lekarza

```
A friendly doctor (warm, smiling, gentle, in a soft white coat) showing a child a stethoscope, while the child holds their teddy bear up to be "examined" too. Bright cheerful pediatric office in soft colors. Mood: medical visit as a friendly, curious adventure.
```

### 28. `theme-niesmialosc.png` — nieśmiałość / nawiązywanie znajomości

```
A shy child standing slightly apart at the edge of a sunlit playground. A friendly child approaches with an open hand and a warm smile, offering to share a small magical item (a flower, a paper airplane). The shy child's expression begins to bloom into a tentative smile. Mood: a brave gentle first connection.
```

### 29. `theme-rodzenstwo-klotnia.png` — kłótnie z rodzeństwem

```
Two siblings sitting back-to-back on a soft rug, arms crossed but slowly turning to peek at each other with growing smiles. Above them, a soft heart-shaped sparkle. Mood: tension melting into reconciliation, wordless.
```

### 30. `theme-przeprowadzka.png` — przeprowadzka, nowe miejsce

```
A child sitting on a large cardboard moving box, looking out a brand-new bedroom window at an unfamiliar but warm and friendly neighborhood at sunset. The child's beloved teddy bear sits beside them. The walls are bare but soft afternoon light makes the empty room feel hopeful, not lonely. A small magical firefly hovers just outside the window, welcoming them. Mood: bittersweet beginning, full of possibility.
```

---

## Co robić jak coś nie wyjdzie

- **Cały batch wygląda inny stylistycznie?** → Otwórz nową rozmowę, wklej Style Bible jeszcze raz, zacznij od nowa. Spójność stylu jest najważniejsza.
- **Pojedynczy obrazek nie pasuje?** → Napisz Geminiowi _"this is too [dark / busy / cold] — regenerate softer / warmer / simpler"_. Albo sam dopowiedz po angielsku co konkretnie zmienić.
- **Modele tworzą "dziwne" twarze dzieci?** → Standardowy problem AI. Dodaj na końcu prompta: _"clear soft features, no creepy eyes, picture-book quality face"_.
- **Wszystko zbyt bajkowo-disneyowsko?** → Dodaj: _"in the style of contemporary European picture books, NOT Disney"_.

Po wszystkim wracaj do mnie z gotowymi plikami w `Prototyp/images/` — podpinam je w HTML w odpowiednie miejsca w 5 minut.
