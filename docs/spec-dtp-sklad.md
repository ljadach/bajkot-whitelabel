# Plan poprawek DTP składu książki

Wejście: feedback Andrzeja Wodnickiego z 31.07.2026 (Trello „poprawnienie dtp"),
dotyczy książki A5 do druku. Zakres poszerzony o PDF klienta tam, gdzie zmiana
i tak jest wspólna — wynika to z architektury, nie z ambicji (patrz „Ograniczenie
pipeline'u").

Stan: **plan, nic nie wdrożone**. Zmierzone na żywym składzie, nie na wyczuciu.

## Ograniczenie pipeline'u, które determinuje wszystko

Plik drukarski **nie jest renderowany od nowa**. `convex/admin/printPdf.ts` wysyła
do typst-render `sourcePdfUrl` = gotowy PDF klienta (A4) z R2, a `print/print_ready.py`
tylko go rasteryzuje, podmienia ilustracje na hi-res, skaluje A4 → A5+spad i
konwertuje na CMYK. Typografia (marginesy, interlinia, justowanie) powstaje
**raz**, w renderze A4.

Konsekwencje:

1. Każda zmiana w `templates/` zmienia **jednocześnie** PDF klienta i druk.
2. „Inne marginesy tylko dla druku" wymagałyby albo drugiego renderu z innym
   briefem, albo przesuwania rastra w `print_ready.py`. Oba warianty są droższe
   niż po prostu zrobienie dobrego składu raz — a lepszy skład PDF-a nikomu nie
   szkodzi.
3. Skala A4 → A5 to ×0,705. Każdy margines podany w szablonie widać w druku
   **o 30% mniejszy**. To jest źródło problemu z marginesami.

## 1. Justowanie / „rozstrzelenie" — przyczyna znaleziona

`templates/main.typ` linia 16:

```typst
#set text(font: "Noto Sans", hyphenate: false)
```

Dzielenie wyrazów jest **wyłączone**, a `text-page` ustawia `par(justify: true)`.
Justowanie bez dzielenia wyrazów = łamacz musi rozepchnąć spacje, żeby dobić do
prawej krawędzi. To dokładnie to, co Andrzej nazywa rozstrzeleniem. Do tego
brakuje `lang: "pl"`, więc nawet po włączeniu dzielenia Typst użyłby wzorców
angielskich.

**Poprawka (jedna linia):**

```typst
#set text(font: "Noto Sans", lang: "pl", hyphenate: auto)
```

Zweryfikowane lokalnie na prawdziwym tekście bajki (order `k8sptd8bg26f`):
Typst 0.14.2 dzieli polskie wyrazy poprawnie (`ma-ma`, `sie-dział`, `plu-szowy`,
`skom-plikowaną`). Odstępy międzywyrazowe wracają do normalnych, liczba linii na
stronie spada o ~1 na 28 (tekst pakuje się gęściej).

Repro (bez dostępu do serwisu, sam Typst):

```bash
cp -r ~/P/typst-render/templates /tmp/dtp-lab   # + data.json z 3-4 stronami text
cd /tmp/dtp-lab && typst compile --font-path ~/P/typst-render/fonts main.typ out.pdf
```

**Ryzyko:** żadne dla treści, dzielenie zmienia łamanie → zmienia się liczba
linii, więc trzeba przepuścić proof. Dotyczy PDF-a i druku (jeden render).

## 2. Interlinia — dziś 108%, cel 120–140%

Zmierzone na wyrenderowanej stronie (`pdftotext -bbox`, kalibracja metryk fontu
osobnym probe'em):

| wielkość                     | wartość                                          |
| ---------------------------- | ------------------------------------------------ |
| font efektywny (bracket 3-5) | 21,2 pt (bazowe 25,2 pt minus auto-shrink −4 pt) |
| odległość linii bazowych     | 22,9 pt                                          |
| interlinia                   | **108%** wielkości fontu                         |

Typst liczy `advance = leading + cap-height`, a nie `leading + em`
(domyślne `top-edge: cap-height`, `bottom-edge: baseline`). Dla Noto Sans
cap-height = 0,714 em, stąd wzór:

```
leading = (docelowy_procent − 0,714) × rozmiar_fontu
```

- 125% → `leading: 0.54em`
- 130% → `leading: 0.59em`
- 140% → `leading: 0.69em`

Rekomendacja: `leading` w **em, nie w punktach** — dziś `sizes.typ` trzyma
`line-gap` w pt i skaluje razem z fontem (`×1.4` dla A4), więc procent wychodzi
przypadkiem. Docelowo `effective-line-gap` zwraca `0.59em` i problem znika dla
wszystkich trzech przedziałów wiekowych.

**Uwaga na istniejącą flagę:** `looseLineGap` w `sizes.typ` ustawia `1.4em`, co
daje interlinię ~211%. Ta flaga jest myląca i po zmianie powinna zniknąć albo
dostać sensowną wartość.

**Koszt uboczny:** luźniejsza interlinia = mniej tekstu na stronie → patrz pkt 5.

## 3. Wiszące spójniki (twarde spacje)

Dziś: nic tego nie pilnuje. Widać to nawet na wersji po poprawce dzielenia
(„Wszystko było tu jego i" na końcu wiersza).

Miejsce implementacji: **bajkot, nie szablon**. Funkcja w
`convex/lib/buildRenderBrief.ts`, przepuszczająca tekst stron, kartę dla rodzica
i dedykację:

```ts
/** Jednoliterowe wyrazy nie zostają na końcu wiersza (reguła polskiego składu). */
function hardenOrphans(text: string): string {
  return text.replace(/(^|[\s(„"'])([aiouwzAIOUWZ])\s+/g, '$1$2\u00A0');
}
```

Dlaczego tu, a nie `show regex(...)` w Typst: łatwo pokryć testem, działa dla
wszystkich odbiorców tekstu (również legacy pdfkit) i nie miesza się z logiką
łamania. Minus: NBSP przy justowaniu bywa sztywny — dlatego wchodzi **po** pkt 1,
kiedy dzielenie wyrazów ma czym kompensować.

Nie ruszamy dwuliterowych przyimków (`do`, `na`, `za`) — to preferencja, nie
reguła, i psuje więcej niż naprawia przy wąskiej szpalcie.

## 4. Marginesy i oprawa klejona

Stan (`sizes.typ` + `layout.typ`):

| element                            | A4 (render)     | po skali ×0,705 (A5 w ręce) |
| ---------------------------------- | --------------- | --------------------------- |
| margines strony `effective-margin` | 32 pt = 11,3 mm | 8,0 mm                      |
| kolumna tekstu `pad(x: m*1.5)`     | 48 pt = 16,9 mm | 11,9 mm                     |
| karta „Dla Rodzica" `pad(x: m)`    | 32 pt = 11,3 mm | 8,0 mm                      |

Oprawa klejona A5 zjada 5–8 mm przy grzbiecie → przy wewnętrznej krawędzi
zostaje **4–7 mm tekstu od zgięcia**. Za mało, Andrzej ma rację.

Trzy rzeczy do zrobienia, w kolejności rosnącego kosztu:

**4a. Podnieść bazowy margines.** `effective-margin` dla `single`: 32 pt → 44 pt
(15,5 mm; w druku 10,9 mm, kolumna tekstu 16,4 mm). Jedna liczba, natychmiastowy
efekt, dotyczy też PDF-a.

**4b. Wyrównać kartę „Dla Rodzica".** Dziś ma `pad(x: m)` zamiast `pad(x: m*1.5)`
jak strony tekstowe — stąd 8 mm vs 11,9 mm. `print_ready.py` ma na to **hack w
rastrze** (`fix_parent_page`, komentarz: „zmierzone na A5: 6mm od ciecia vs
~10mm"). Po naprawie u źródła hack można wyłączyć — sam się neutralizuje
(`if scale >= 0.995: return`).

**4c. Grzbiet asymetryczny (właściwa poprawka).** Marginesy wewnętrzne muszą być
większe niż zewnętrzne, naprzemiennie recto/verso. Szablon dziś **nie wie, na
której stronie jest** — `render-page` dostaje spec, nie indeks. Zmiana: `main.typ`
w pętli zna `i`, więc przekazuje `recto: calc.even(i)` do `text-page` /
`parent-card-page`, a te wybierają `(inside: m + gutter, outside: m)`.
Gutter 5 mm = 20 pt na A4. Koszt: ~30 linii w dwóch plikach + proof.

Odrzucone: przesuwanie rastra w `print_ready.py`. Byłoby „tylko dla druku", ale
tnie zewnętrzną krawędź i przesuwa ilustracje pełnospadowe — ryzyko większe niż
zysk.

## 5. Efekt uboczny: budżet znaków na stronę

Auto-shrink w `text-page` (`fs.body` → `−4 pt`) **już dziś jest wyczerpany** —
zmierzony font to minimum z pięciu prób. Znaczy to, że 1000 znaków (`charBudgetFor('3-5')`
w `convex/lib/pageSequence.ts`) nie mieści się w obecnej geometrii i szablon
ratuje się zmniejszaniem czcionki i ściskaniem interlinii. Luźniejsza interlinia
i większe marginesy pogłębią problem, jeśli budżet zostanie.

Szacunek po zmianach (m = 44 pt, leading 0,59 em, font bazowy bez shrinku):

| bracket | budżet dziś | szacowany docelowy |
| ------- | ----------- | ------------------ |
| 3-5     | 1000        | ~750               |
| 6-8     | 1500        | ~1150              |
| 9+      | 1800        | ~1400              |

To są punkty startowe do kalibracji, nie wyrocznia. Metoda kalibracji: render
proof z docelowymi parametrami, odczyt efektywnego rozmiaru fontu z
`pdftotext -bbox` (wysokość bboxa / 1,362 = rozmiar fontu) i schodzenie z
budżetem aż auto-shrink przestanie się odpalać.

Skutek: książka urośnie o kilka stron. To zmienia grubość grzbietu w KDP, więc
pliki drukarskie trzeba wygenerować od nowa po zmianach.

## Kolejność prac

| #   | zadanie                             | gdzie                                 | efekt                        | ryzyko                         |
| --- | ----------------------------------- | ------------------------------------- | ---------------------------- | ------------------------------ |
| 1   | `lang: "pl"` + `hyphenate: auto`    | typst-render `main.typ`               | koniec rozstrzelenia         | niskie                         |
| 2   | `leading` w em, 0,59 em             | typst-render `sizes.typ`              | interlinia 130%              | niskie                         |
| 3   | margines 32 → 44 pt + karta rodzica | typst-render `sizes.typ`/`layout.typ` | oddech przy grzbiecie        | niskie                         |
| 4   | rekalibracja `charBudgetFor`        | bajkot `pageSequence.ts`              | koniec auto-shrinku          | średnie — zmienia liczbę stron |
| 5   | twarde spacje po spójnikach         | bajkot `buildRenderBrief.ts`          | brak wiszących liter         | niskie                         |
| 6   | grzbiet asymetryczny                | typst-render `main.typ`/`layout.typ`  | poprawnie pod oprawę klejoną | średnie                        |
| 7   | proof A5 + akcept Andrzeja          | admin → print-ready                   | —                            | —                              |

1–3 to jeden commit i jeden render. 4 wymaga przejścia po kilku zamówieniach
testowych. 6 najlepiej po akceptacji 1–5, żeby nie mieszać zmiennych.

## Czego ten plan nie obejmuje

- Sierotek i wdów (pojedyncza linia akapitu na początku/końcu strony) — Typst ma
  `par(costs: (widow: .., orphan: ..))`, ale przy stronach dzielonych po stronie
  bajkota (`splitBeatTextDynamic`) łamanie i tak nie jest ciągłe.
- Wersji A4 pliku drukarskiego — ma znany błąd geometrii (`docs/spec-print-ready-pipeline.md`),
  osobny wątek.
- Fontu. Noto Sans to font ekranowy; do książki dla dzieci naturalniejszy byłby
  krój szeryfowy albo dedykowany dziecięcy. To decyzja produktowa, nie DTP-owa.
