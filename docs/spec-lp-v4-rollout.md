# Spec: rollout LP v4 na wszystkie topic landing pages

**Status:** plan do dyskusji (2026-07-28). Nic z tego nie idzie na prod bez osobnej decyzji.

## Cel

Podmienić treść i strukturę wszystkich stron `/problem/:slug` (obecnie ~35 tematów w
`src/data/topics.ts`, SSG prerender) na układ wypracowany w prototypie
`public/proto1/v4.html`, zachowując:

- **routing bez zmian** — te same URL-e `/problem/:slug`, ten sam loader/meta w
  `src/routes/topic.tsx`, ta sama lista prerenderowanych stron;
- **wizard inline** — `LandingOrderFlow` zostaje sekcją Engagement (`#kreator`);
  CTA „Stwórz bajkę" scrolluje do niego, zamiast linkować na zewnątrz jak w proto.

## Struktura docelowa strony (z v4)

1. Nav (logo + CTA „Stwórz bajkę")
2. Hero: H1 problemowe, lead „Dedykowana książka…", CTA + „Najpierw czytasz,
   potem decydujesz, czy kupujesz.", karuzela zdjęć, bullety cenowe
3. Opis produktu: przykładowa bajka (viewer + pobranie) + galeria druku (lightbox)
4. Film promo „Zobacz, jakie to proste w praktyce"
5. Pain „Wiesz, jak to jest." (4 scenki + relief)
6. Nauka „Dlaczego bajka działa…" (3 karty + cytat naukowy z linkiem)
7. Opinie Rodziców + link Trustpilot
8. „Bajkoterapia jest bezpieczna" + FAQ
9. Cennik (promocja PDF 59→49 + Omnibus, druk+PDF 99, PDF+audiobook 69)
10. Engagement: demo z imieniem (fragment + mock okładki) → wizard inline
11. Footer

## Tabela: co jest content-dependent, co wspólne, w której fazie podmiana

| #   | Element                                  | Zależny od problemu?             | Źródło danych dziś                                             | Faza                                                       | Uwagi                                                                                                     |
| --- | ---------------------------------------- | -------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Nav, logo, CTA                           | nie                              | `TopicNav`                                                     | **F1**                                                     | tylko copy CTA („Stwórz bajkę")                                                                           |
| 2a  | H1 + accent                              | **tak**                          | `topic.headline/headlineAccent`                                | **F1** (istniejąca treść) → **F2** (przepis pod format v4) | format „Twoje dziecko nie chce X? Dziś wieczorem zamiast bitwy — misja."                                  |
| 2b  | Lead                                     | **tak** (1 zdanie)               | `topic.intro`                                                  | **F2**                                                     | stały prefiks „Dedykowana książka dla Twojego dziecka." + zdanie per problem                              |
| 2c  | Karuzela zdjęć hero                      | nie (na razie)                   | assety `proto1/img/druk-*`                                     | **F1**                                                     | jedna fizyczna książka; per-problem dopiero gdy będą wydruki (F4)                                         |
| 2d  | Bullety cenowe                           | nie                              | hardcode → docelowo config                                     | **F1**                                                     | jedna prawda cen dla całego serwisu (spójnie z checkout)                                                  |
| 3a  | Przykładowa bajka (PDF + okładka)        | **docelowo tak**                 | wspólna „Zosia i Rycerz Biały Uśmiech"                         | **F1** wspólna → **F3** per problem                        | F3 = batch generacja 1 bajki na temat (admin Book Batch), viewer per slug                                 |
| 3b  | Galeria zdjęć druku                      | nie                              | `proto1/img`                                                   | **F1**                                                     | wspólne zdjęcia; per problem w F4 (sesje foto)                                                            |
| 4   | Film promo                               | nie (na razie)                   | `promo-ola.mp4`                                                | **F1**                                                     | jeden film; warianty per problem = F4, opcjonalne                                                         |
| 5   | Pain: 4 scenki + relief                  | **tak**                          | brak (jest `painEmpathy/painRootCause/painCta` w innej formie) | **F2**                                                     | nowe pola `painScenes[4]`, `painRelief`; treść do przepisania z istniejących pól                          |
| 6a  | Karty naukowe ×3                         | **tak** (2 z 3)                  | `topic.scienceCards`                                           | **F1**                                                     | karta 3 „Bohater z imieniem" wspólna; 1–2 zostają per problem                                             |
| 6b  | Cytat naukowy + link                     | nie                              | hardcode (Sufa & Janas 2018)                                   | **F1**                                                     | jeden cytat wszędzie                                                                                      |
| 7   | Opinie + Trustpilot                      | nie                              | hardcode                                                       | **F1**                                                     | docelowo prawdziwe opinie per problem (F4, po zebraniu)                                                   |
| 8a  | „Bajkoterapia jest bezpieczna"           | nie                              | hardcode                                                       | **F1**                                                     | wspólne                                                                                                   |
| 8b  | FAQ                                      | nie (opcjonalnie +1 per problem) | hardcode                                                       | **F1**                                                     | ewentualne pytanie per problem w F2                                                                       |
| 9   | Cennik + promocja                        | nie                              | hardcode → config                                              | **F1**                                                     | ceny/promocja sterowane jednym miejscem (docelowo `config` w Convex)                                      |
| 10a | Fragment demo (odmiana imienia)          | **tak**                          | brak                                                           | **F1** szablon wspólny → **F2** per problem                | tytuł mock-okładki per problem (np. „{Imię} i Misja Czystych Zębów"); odmiana przez `childNameInflect.ts` |
| 10b | Wizard                                   | **tak** (problemId)              | `LandingOrderFlow` + `topic.problemId`                         | **F1**                                                     | bez zmian funkcjonalnych — tylko pozycja i wygląd otoczenia                                               |
| 11  | Footer                                   | nie                              | `TopicFooter`                                                  | **F1**                                                     | drobne copy                                                                                               |
| —   | Meta/SEO (title, description, canonical) | **tak**                          | `topic.title/metaDescription`                                  | **bez zmian**                                              | zostaje jak jest                                                                                          |
| —   | `loadingMessage`, `catalog`, `category`  | **tak**                          | `topics.ts`                                                    | **bez zmian**                                              | używane poza LP                                                                                           |

**Zasada faz:** F1 = nowy layout + wszystkie sekcje wspólne, treść per problem bierzemy
z istniejących pól. F2 = nowe pola treściowe w `topics.ts` i przepisanie ~35 tematów.
F3 = assety generowane per problem (przykładowa bajka). F4 = przyszłość (wydruki,
filmy, opinie per problem, audiobook jako realny produkt).

## Plan faz

### Faza 0 — fundament stylów (bez zmian widocznych)

- Rozszerzyć `tailwind.config.js` o tokeny v4: `cream`, `navy`, `amber`, `teal`
  (obok istniejących `calm`/`magic` — stare flow ich używa, nie ruszamy).
- Przenieść assety `public/proto1/img/druk-*.jpg`, `zosia-cover.jpg`,
  `promo-ola.mp4`, `przyklad-bajka.pdf` do `public/lp/` (WebP dla zdjęć + srcset).

### Faza 1 — nowy layout, pilot na `mycie-zebow`

- Nowe komponenty w `src/components/topic-landing/`:
  `TopicHeroV4` (karuzela), `TopicProduct` (przykład + galeria + lightbox),
  `TopicVideo`, `TopicPainV4` (scenki), `TopicScienceV4` (+cytat), `TopicReviews`,
  `TopicSafety` (+FAQ), `TopicPricing`, `TopicNameDemo` (fragment, `childNameInflect`).
- `TopicLayout` renderuje nowy układ dla slugów z flagą `lpV4: true` w `topics.ts`
  (pilot: `mycie-zebow`), pozostałe bez zmian. Routing nietknięty.
- Viewer przykładowej bajki: istniejący `BookPdfFlipbook` (już w bundlu) zamiast
  pdf.js z CDN — CDN odpada na produkcji.
- Telemetria: `trackEvent` na każdym CTA (`location` per sekcja), zdarzenia dla
  karuzeli/lightboxa/video-play/demo-imię — będzie mierzalny funnel.
- Demo-fragment: WYMÓG PRODUKTOWY z przeglądów — pokazany początek musi trafiać
  do pipeline'u (prompt A1/A2), inaczej miss-selling. Do zrobienia w tej fazie
  po stronie promptów.

### Faza 2 — treść per problem (wszystkie tematy)

- Rozszerzyć interfejs `Topic`: `painScenes: [string×4]`, `painRelief`,
  `demoFragment`/`demoCoverTitle`, opcjonalnie `faqExtra`.
- Wygenerować treści dla ~35 tematów (LLM na bazie istniejących pól pain\*/intro,
  przegląd ręczny), przepisać H1/lead pod format v4.
- Przełączyć `lpV4: true` dla wszystkich, usunąć stare komponenty
  (`TopicHero/TopicPain/TopicScience` w wersji v1) po przełączeniu.

### Faza 3 — przykładowa bajka per problem

- Batch (admin Book Batch / CLI) → 1 zaakceptowana bajka na temat, PDF zbity
  gs `/ebook`, okładka JPG; pola `sampleBook: { pdf, cover, title, pages }`
  w `topics.ts`. Fallback: wspólna Zosia.

### Faza 4 — później / osobne decyzje

- Zdjęcia wydruków i filmy per problem; prawdziwe opinie per problem;
  Trustpilot claim; audiobook jako produkt (cena, pipeline TTS); promocje
  sterowane z admin config (rotacyjne powody).

## Analiza techniczna: przeniesienie v4 → komponenty serwisu

**Routing i SSR/SSG.** Bez zmian: `routes/topic.tsx` (loader po slugu, meta,
canonical) zostaje 1:1. Nowe sekcje to czyste komponenty na danych z `topics.ts`,
więc prerender działa jak dotąd. Jedyne fragmenty client-only: karuzela, lightbox,
video, demo z imieniem — ale wszystkie renderują sensowny HTML na serwerze
(pierwsze zdjęcie, statyczna siatka, poster, pusty formularz), więc bez
`ClientOnly` poza wizardem (który już go ma).

**Style.** Proto używa czystego CSS z custom properties (cream/navy/amber/teal),
serwis — Tailwind 4 z paletą `calm`/`magic`. Nie mapujemy „na oko" na starą
paletę (zmieniłaby charakter strony) tylko dodajemy tokeny v4 do configu
i piszemy komponenty Tailwindem. Nunito już jest globalnie. Ikony: v4 używa emoji —
zostawiamy emoji (mniej FontAwesome, spójne z proto).

**JS proto → React.**

- karuzela hero: `useState(index)` + touch handlery (przeniesienie 1:1 z proto);
- lightbox: komponent z portalem, klawiatura (Esc/strzałki) przez `useEffect`;
- demo imienia: `childNameInflect.ts` zamiast mojej heurystyki `-a = żeńskie`
  (w lib jest tabela ~80 imion + heurystyki + `null`-fallback na frazę bez odmiany);
- viewer PDF: `BookPdfFlipbook` (lazy chunk już istnieje) — podstrona nie jest
  potrzebna; otwieramy w modalu/nowej karcie z istniejącym komponentem.

**Ceny.** Bullety hero i cennik czytają z jednego modułu (`src/data/pricing.ts`
w F1; docelowo Convex `config`, żeby promocję dało się włączać bez deploya).
Uwaga na spójność z `OrderCheckout`/Stripe price — dziś cena żyje w Stripe Price;
LP musi pokazywać to samo (test integracyjny: cena na LP == cena w checkout).

**Niespójność do rozstrzygnięcia przed F1:** czas generacji — film mówi
„10 minut", bullety/FAQ „20 minut", stary `TopicHero` „15 minut". Jedna liczba
wszędzie (proponuję ~20 min, bo bezpieczniejsza).

**Ryzyka.**

- 35 tematów × nowe pola = największy koszt to treść (F2), nie kod.
- Demo-fragment bez podpięcia do pipeline'u = miss-selling — blokada na
  publiczną kampanię, nie na wdrożenie layoutu.
- Promocja 59→49: wymaga zgodności z Omnibus (mamy notę) i z realnym cennikiem
  Stripe zanim pójdzie na prod.
- PII: bez zmian vs dziś (LP nie zbiera nic nowego); TODO #2 dalej otwarte.
