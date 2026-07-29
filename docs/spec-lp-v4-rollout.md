# Spec: rollout LP v4 na wszystkie topic landing pages

**Status:** F0–F2 wykonane na branchu `feat/lp-v4-rollout` (PR #62), F3 częściowo (dane
gotowe, sekcja schowana). **Nic z tego nie jest na prodzie** — merge i deploy czekają na
przegląd treści. Sekcja „Stan wykonania" niżej opisuje, co realnie powstało i gdzie
implementacja rozjechała się z tym planem.

**Decyzje c3z (28.07):** zdjęcia druku, film i opinie zostają wspólne na stałe (bez wariantów per problem); przykładowa bajka zostaje jedna (Zosia) na stałe; sekcja demo „wpisz imię" + preview bajki w rollout **schowana (nie usunięta)** — wraca na końcu, po opracowaniu symulowanych początków bajek per problem (generuje je osobny agent na bazie promptów pipeline'u → `src/data/storyOpenings.ts`).

## Stan wykonania (2026-07-28)

Wykonane: **F0** (tokeny + assety), **F1** (layout, pilot), **F2** (treść dla wszystkich
tematów), **F3 częściowo** (`storyOpenings.ts` gotowe dla 39/39 tematów, sekcja demo
dalej schowana do czasu przeglądu treści). Weryfikacja: sweep Playwright na 39/39
slugach renderuje v4, kolejność sekcji zgodna z proto, `npm run lint` zielony.

**Co powstało — mapa plików:**

| Warstwa                | Plik                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Przełącznik layoutu    | `TopicLayout.tsx` — wpis w `TOPIC_V4_CONTENT` ⇒ v4, brak wpisu ⇒ legacy (rollback path)                                     |
| Treść per problem (39) | `src/data/topicV4Content.ts` — `{headline, headlineAccent, intro, painHeadline, painScenes[4], painRelief}` + typ `TopicV4` |
| Treść wspólna          | `src/data/lpContent.ts` — galeria, przykładowa bajka, film, cytat, opinie, FAQ, safety, `SECTION_COPY`, `SHOW_NAME_DEMO`    |
| Ceny i liczby          | `src/lib/pricing.ts` — jedno źródło (ceny, `GENERATION_MINUTES`, `DELIVERY_DAYS_TEXT`)                                      |
| Otwarcia bajek (39)    | `src/data/storyOpenings.ts` — `{title, paragraphs: [{m, f}]}`, ładowane tylko w lazy chunku demo                            |
| Sekcje v4              | `src/components/topic-landing/v4/Topic{NavV4,HeroV4,Product,Video,PainV4,ScienceV4,Reviews,Safety,Faq,Pricing,NameDemo}`    |
| Prymitywy v4           | `v4/{Section,CtaButton,ModalOverlay,PhotoCarousel,Lightbox,cycle}`                                                          |
| Współdzielone z legacy | `topic-landing/WizardPlaceholder.tsx`, `src/hooks/useWizardInView.ts`                                                       |

**Rozjazdy vs plan — świadome decyzje w trakcie:**

- **Brak flagi `lpV4` w `topics.ts`.** Plan zakładał pole boolean na temacie. Zamiast tego
  o layoucie decyduje sama obecność wpisu w `TOPIC_V4_CONTENT` — jeden mechanizm zamiast
  dwóch (flaga + treść mogły się rozjechać), a `Topic` zostaje nietknięty.
- **Tokeny w namespace `lp.*`, nie gołe `cream/navy/amber/teal`.** Gołe nazwy nadpisały
  istniejący token `ink` z palety enterprise i przebarwiły CookieBanner w całej apce.
  Reguła na przyszłość w ADR-002.
- **Ceny w `src/lib/pricing.ts`, nie w nowym `src/data/pricing.ts`.** Moduł już istniał
  i był używany przez 7 plików — nowy byłby drugim źródłem prawdy.
- **FontAwesome zostaje w kartach naukowych** (`topic.scienceCards[].icon` to klasy FA);
  plan mówił o emoji. Emoji są tylko tam, gdzie proto ich używa (nav, przyciski).
- **`childNameInflect` jeszcze nie podpięty** — `TopicNameDemo` ma lokalną heurystykę
  (`-a` = żeńskie + lista wyjątków) z TODO. Do zrobienia zanim sekcja wróci.
- **Sekcja demo lazy-loadowana**, nie tylko schowana za flagą — inaczej 68 KB otwarć
  siedziałoby w bundlu każdej strony mimo niewidocznej sekcji.
- **Prymitywy `Section`/`SectionHeading`** (nie było ich w planie) — szkielet sekcji
  powtarzał się w 9 komponentach i zaczął dryfować.

**Rozstrzygnięte:** czas generacji — jedna liczba `GENERATION_MINUTES = 20` w całym
nowym kodzie (film, bullety, FAQ, cennik). Stare `faq.json`/`cennik.ts` dalej mówią
swoje — poza zakresem tego rolloutu.

**Otwarte przed prodem:**

1. Przegląd treści przez zespół: `topicV4Content.ts` (39 tematów) i `storyOpenings.ts`
   (39 otwarć, tematy wrażliwe: rozwód, nowe rodzeństwo).
2. Promocja 59→49 musi zgadzać się z realnym cennikiem Stripe (dziś cena żyje w Stripe
   Price) i z notą Omnibus.
3. Claim profilu Trustpilot — link jest, profilu jeszcze nie.
4. Cena audiobooka 69 zł jest robocza; audiobook nie istnieje jako produkt (F4).
5. `inferGender` w `childNameInflect.ts` przed odsłonięciem demo.
6. **Blokada kampanijna:** publiczny intake nie ma gate'u ani rate-limitu (TODO.md #1,
   `startLandingOrder` w `convex/bookPipeline.ts`). Layout może iść na prod; płatna
   promocja tych LP — dopiero po pay-first albo per-IP rate limicie.

## Cel

Podmienić treść i strukturę wszystkich stron `/problem/:slug` (39 tematów w
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

| #   | Element                                  | Zależny od problemu?             | Źródło danych dziś                                             | Faza                                                       | Uwagi                                                                                                    |
| --- | ---------------------------------------- | -------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Nav, logo, CTA                           | nie                              | `TopicNav`                                                     | **F1**                                                     | tylko copy CTA („Stwórz bajkę")                                                                          |
| 2a  | H1 + accent                              | **tak**                          | `topic.headline/headlineAccent`                                | **F1** (istniejąca treść) → **F2** (przepis pod format v4) | format „Twoje dziecko nie chce X? Dziś wieczorem zamiast bitwy — misja."                                 |
| 2b  | Lead                                     | **tak** (1 zdanie)               | `topic.intro`                                                  | **F2**                                                     | stały prefiks „Dedykowana książka dla Twojego dziecka." + zdanie per problem                             |
| 2c  | Karuzela zdjęć hero                      | nie (na razie)                   | assety `proto1/img/druk-*`                                     | **F1**                                                     | DECYZJA: wspólne na stałe                                                                                |
| 2d  | Bullety cenowe                           | nie                              | hardcode → docelowo config                                     | **F1**                                                     | jedna prawda cen dla całego serwisu (spójnie z checkout)                                                 |
| 3a  | Przykładowa bajka (PDF + okładka)        | **docelowo tak**                 | wspólna „Zosia i Rycerz Biały Uśmiech"                         | **F1**                                                     | DECYZJA: zostaje jedna wspólna na stałe                                                                  |
| 3b  | Galeria zdjęć druku                      | nie                              | `proto1/img`                                                   | **F1**                                                     | DECYZJA: wspólne na stałe                                                                                |
| 4   | Film promo                               | nie (na razie)                   | `promo-ola.mp4`                                                | **F1**                                                     | DECYZJA: jeden film na stałe                                                                             |
| 5   | Pain: 4 scenki + relief                  | **tak**                          | brak (jest `painEmpathy/painRootCause/painCta` w innej formie) | **F2**                                                     | nowe pola `painScenes[4]`, `painRelief`; treść do przepisania z istniejących pól                         |
| 6a  | Karty naukowe ×3                         | **tak** (2 z 3)                  | `topic.scienceCards`                                           | **F1**                                                     | karta 3 „Bohater z imieniem" wspólna; 1–2 zostają per problem                                            |
| 6b  | Cytat naukowy + link                     | nie                              | hardcode (Sufa & Janas 2018)                                   | **F1**                                                     | jeden cytat wszędzie                                                                                     |
| 7   | Opinie + Trustpilot                      | nie                              | hardcode                                                       | **F1**                                                     | DECYZJA: wspólne na stałe                                                                                |
| 8a  | „Bajkoterapia jest bezpieczna"           | nie                              | hardcode                                                       | **F1**                                                     | wspólne                                                                                                  |
| 8b  | FAQ                                      | nie (opcjonalnie +1 per problem) | hardcode                                                       | **F1**                                                     | ewentualne pytanie per problem w F2                                                                      |
| 9   | Cennik + promocja                        | nie                              | hardcode → config                                              | **F1**                                                     | ceny/promocja sterowane jednym miejscem (docelowo `config` w Convex)                                     |
| 10a | Fragment demo (odmiana imienia)          | **tak**                          | brak                                                           | **schowane w F1** → wraca po `storyOpenings`               | sekcja ukryta (nie usunięta); wróci z realnym otwarciem per problem, odmiana przez `childNameInflect.ts` |
| 10b | Wizard                                   | **tak** (problemId)              | `LandingOrderFlow` + `topic.problemId`                         | **F1**                                                     | bez zmian funkcjonalnych — tylko pozycja i wygląd otoczenia                                              |
| 11  | Footer                                   | nie                              | `TopicFooter`                                                  | **F1**                                                     | drobne copy                                                                                              |
| —   | Meta/SEO (title, description, canonical) | **tak**                          | `topic.title/metaDescription`                                  | **bez zmian**                                              | zostaje jak jest                                                                                         |
| —   | `loadingMessage`, `catalog`, `category`  | **tak**                          | `topics.ts`                                                    | **bez zmian**                                              | używane poza LP                                                                                          |

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
- Sekcja demo „wpisz imię" + preview bajki: komponent powstaje, ale renderuje
  się za flagą `showNameDemo=false` — SCHOWANY do czasu gotowych
  `storyOpenings` (F3). Wymóg produktowy bez zmian: zanim sekcja wróci,
  otwarcia muszą być spójne z tym, co generuje pipeline (prompt A1/A2).

### Faza 2 — treść per problem (wszystkie tematy)

- Rozszerzyć interfejs `Topic`: `painScenes: [string×4]`, `painRelief`,
  `demoFragment`/`demoCoverTitle`, opcjonalnie `faqExtra`.
- Wygenerować treści dla ~35 tematów (LLM na bazie istniejących pól pain\*/intro,
  przegląd ręczny), przepisać H1/lead pod format v4.
- Przełączyć `lpV4: true` dla wszystkich, usunąć stare komponenty
  (`TopicHero/TopicPain/TopicScience` w wersji v1) po przełączeniu.

### Faza 3 — story openings (symulowane początki bajek per problem)

- Osobny agent czyta prompty pipeline'u (`convex/lib/prompts.ts`: profiling,
  story planning, story writing), zasady bezpieczeństwa treści i realne otwarcie
  „Zosi i Rycerza Biały Uśmiech", po czym dla każdego tematu z `topics.ts`
  pisze początek bajki (2–3 akapity pierwszych stron) tak, jakby wygenerował go
  pipeline — plus wzór tytułu okładki.
- Zapis: `src/data/storyOpenings.ts` — mapa per `slug`:
  `{ title: "{name} i …", paragraphs: [{ m, f }] }` (warianty rodzajowe,
  `{name}` jako placeholder; odmiana i wybór wariantu przez `childNameInflect`).
- Po przeglądzie treści przez zespół sekcja demo „wpisz imię" wraca na LP
  (odkrycie schowanej sekcji) — a docelowo te same otwarcia trafiają do
  promptu A2 jako wymuszone pierwsze zdania (anty-miss-selling).

### ~~Faza 3 (stara) — przykładowa bajka per problem~~ SKREŚLONA (decyzja c3z)

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

**Ceny.** Bullety hero i cennik czytają z jednego modułu — wykonane w istniejącym
`src/lib/pricing.ts` (docelowo Convex `config`, żeby promocję dało się włączać bez
deploya). Uwaga na spójność z `OrderCheckout`/Stripe price — dziś cena żyje w Stripe
Price; LP musi pokazywać to samo (test integracyjny: cena na LP == cena w checkout).

**Niespójność czasu generacji — ROZSTRZYGNIĘTA:** `GENERATION_MINUTES = 20`
w `src/lib/pricing.ts`, interpolowane wszędzie w nowym kodzie.

**Ryzyka.**

- 35 tematów × nowe pola = największy koszt to treść (F2), nie kod.
- Demo-fragment bez podpięcia do pipeline'u = miss-selling — blokada na
  publiczną kampanię, nie na wdrożenie layoutu.
- Promocja 59→49: wymaga zgodności z Omnibus (mamy notę) i z realnym cennikiem
  Stripe zanim pójdzie na prod.
- PII: bez zmian vs dziś (LP nie zbiera nic nowego); TODO #2 dalej otwarte.
