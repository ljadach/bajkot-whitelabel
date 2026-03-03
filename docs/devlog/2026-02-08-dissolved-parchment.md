# 2026-02-08 — Dissolved Parchment: instrumenty poznania w tkance strony

## Co zbudowaliśmy

Branch: `feature/lem-modern-parchment-concept`

Trzecie podejście do Pergaminu Cybernetycznego. Poprzednie dwa (kosmiczny terminal, wizualny panel) odrzucone — za dekoracyjne, za oddzielone od treści. Tym razem: **panel nie istnieje jako byt. Rozpuszcza się w stronie.**

### Architektura "dissolved parchment"

Zamiast jednego komponentu `LemParchmentPanel` renderowanego nad treścią, rozbiliśmy go na atomowe budulce wplecione w flow czytania:

| Element | Gdzie żyje | Funkcja |
|---------|-----------|---------|
| `ModeToggle` | Header, obok Back | Kartograf / Konstruktor — zmienia instrukcję whisper |
| Whisper | Pod tytułem modułu | Tryb-zależna instrukcja w kursywie |
| `FeynmanOracle` | Floating, prawy margines | Rotujące pytania Feynmana — `?` glyph |
| `ChapterProbes` | Koniec każdego rozdziału | Sondy dopasowane do łuku nauki (Ch1: kompresuj, Ch2: aplikuj, Ch3: syntezuj) |
| `ReflectionGate` | Między rozdziałami | Aktywne przypomnienie — textarea z bramką |

### 5 instrumentów poznania (nowe)

Checkboxy w `ToolkitPanel` w headerze — user sam włącza co chce. Domyślnie wyłączone.

| Instrument | Wzór naukowy | Pozycja w flow |
|------------|-------------|----------------|
| **Glosator** | Elaborative interrogation — annotuj własnymi słowami | Po prose, per chapter |
| **Klucz Szkieletowy** | Generation effect + desirable difficulty — 50→25→10 słów | Po probes, per chapter |
| **Kontrapozitor** | Elaborative interrogation (negatywna) — znajdź słabość | Między rozdziałami |
| **Most Temporalny** | Transfer learning — połącz z życiem | Po wszystkich rozdziałach |
| **Radar Pojęć** | Metacognition — jasne/mgliste/ciemne | Po prose, per chapter |

### Warstwa wizualna

Zespół 3 agentów równolegle:
- **Mobile** — touch 44px, stacked layouts, brak overflow 320px
- **Desktop** — 3-col SkeletonKey, 2-col ConceptRadar, custom scrollbary, focus glow
- **Animacje** — 8 `@keyframes tools-*`, settle/fade/line-draw/bubble-pop, 200-350ms ease-out, `prefers-reduced-motion` respected

## Pliki

| Plik | Zmiana |
|------|--------|
| `LemParchmentPanel.tsx` | Refaktor na building blocks: ModeToggle, FeynmanOracle, ChapterProbes + legacy export |
| `LearningTools.tsx` | **Nowy.** ToolkitPanel, Glossator, SkeletonKey, Contrapositor, TimeBridge, ConceptRadar |
| `ScrollReaderView.tsx` | Integracja dissolved elements + 5 narzędzi w flow |
| `index.css` | +1800 linii: komponenty, responsive, animacje |
| `locales/{en,pl,de}/course.json` | Pełne i18n dla wszystkich narzędzi i trybów |

## Refleksja: co to otwiera

To nie jest feature. To jest **rusztowanie pod dynamiczną grę edukacyjną**.

### Obserwacja 1: te elementy da się generować przez LLM

Każdy instrument ma prostą strukturę danych:

```
ChapterProbes → string[] (2-3 sondy per chapter)
ReflectionGate → string (pytanie)
Contrapositor → string (prompt)
SkeletonKey → {levels: [{max: number, label: string}]}
ConceptRadar → string[] (sugerowane pojęcia do samodzielnej oceny)
```

LLM, mając wiedzę o userze (profil XML z intake) i treść rozdziału, może wygenerować te elementy **specyficznie** dla tego użytkownika. Pytanie w ReflectionGate nie musi być statyczne — może dotyczyć branży usera. Sondy mogą odwoływać się do narzędzi, które user deklarował że używa.

### Obserwacja 2: taksonomia Blooma jest wbudowana w łuk

Obecny rozkład sond po rozdziałach to już Bloom:

- Ch1 (Remember/Understand): "Ściśnij do szkieletu", "Wytłumacz dziecku"
- Ch2 (Apply/Analyze): "Zaprojektuj zastosowanie", "Znajdź tryb awarii"
- Ch3 (Evaluate/Create): "Co zbudowałby Trurl?"

Gdyby LLM generował sondy dynamicznie, mógłby dostosować poziom Blooma do Concept Radar usera — jeśli user oznaczył pojęcia jako "ciemne", sondy schodzą na Remember. Jeśli "jasne" — skaczą na Create.

### Obserwacja 3: grywalizacja jest tutaj naturalna

Mamy już `userPoints` i `exerciseSubmissions` w bazie. Brakuje:

- Punkty za Klucz Szkieletowy (bonus za zmieszczenie się w limicie)
- Punkty za Kontrapozitor (LLM ocenia jakość kontrargumentu)
- Streak za Radar Pojęć (przesuwanie z "ciemne" → "jasne" w kolejnych modułach)
- TimeBridge tracking (czy "jutro zrobię X" faktycznie się zrealizowało?)

To nie jest gamifikacja z gwiazdkami — to **operacjonalizacja metapoznania**. User widzi swój postęp nie w procentach ukończenia, ale w przesunięciu jakości swoich odpowiedzi.

### Obserwacja 4: feedback loop

Każdy instrument zbiera dane, które wracają do LLM:

```
User pisze w Glosatorze → LLM wie CO user zapamiętał
User ocenia Radar → LLM wie CO user uważa za niejasne
User pisze Kontrapozitor → LLM wie JAK user myśli krytycznie
User pisze Most Temporalny → LLM wie GDZIE user chce to zastosować
SkeletonKey → LLM widzi CZY user potrafi kompresować
```

To jest **observable learner** — nie ankieta "czy ci się podobało", tylko rzeczywiste dane o procesie myślenia. Następny moduł generuje się na podstawie tego, co user faktycznie zrobił w poprzednim.

### Obserwacja 5: to jest gra, nie kurs

Tradycyjny kurs: przeczytaj → quiz → certyfikat. To co mamy:

1. **Kartograf/Konstruktor** — user wybiera tryb myślenia (agency)
2. **FeynmanOracle** — losowe perturbacje (element zaskoczenia)
3. **ReflectionGate** — bramka wymagająca myśli przed kontynuacją (pacing)
4. **Sondy** — ćwiczenia dostosowane do fazy nauki (progression)
5. **Instrumenty** — opcjonalne narzędzia aktywnej nauki (mastery tools)

To jest pętla: percepcja → refleksja → artefakt → feedback → adaptacja. Dokładnie to, co opisuje Kolb w experiential learning cycle. Ale z LLM jako dynamicznym game masterem.

## Co dalej

1. **Backend**: endpoint do generowania sond/pytań per chapter na bazie profileXml + chapter content
2. **Persistence**: zapis odpowiedzi z instrumentów do Convex (nowa tabela `learnerArtifacts`)
3. **Adaptive loop**: ConceptRadar feed → zmiana poziomu sond w następnych rozdziałach
4. **Scoring**: LLM-as-judge na SkeletonKey i Contrapositor (jak exerciseSubmissions)
5. **Dashboard**: wizualizacja przesunięcia Radar Pojęć across modules (learning trajectory)

## Decyzja architektoniczna

Narzędzia są **opt-in** (checkboxy domyślnie wyłączone). To celowe. Nudny kurs włącza wszystko domyślnie i przytłacza. Dobra gra daje ci narzędzia gdy jesteś gotowy. Gdy user odkryje Klucz Szkieletowy sam, użyje go z intencją — nie z przymusu.
