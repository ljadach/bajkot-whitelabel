# Spec: Topic Landing Pages — statyczne strony per problem

> **Status: ZREALIZOWANE, częściowo NIEAKTUALNE (2026-07-28).**
> Routing, dane (`topics.ts`, dziś 39 tematów), SSG i SEO działają wg tego dokumentu.
> **Body strony zostało przepisane** — sekcje Hero/Pain/Science i paleta `calm`/`magic`
> opisane niżej to layout legacy, dziś trzymany tylko jako rollback path. Aktualny
> układ, paleta `lp.*` i warstwy treści: `docs/spec-lp-v4-rollout.md`.
> Nieaktualne też „Open questions": ceny (patrz `src/lib/pricing.ts`) i wielojęzyczność
> (serwis jest PL-only).
>
> Źródło: 15 prototypów HTML od Andrzeja (`docs/prototypes/`)

## Cel

Każdy problem dziecięcy (zasypianie, złość, rozwód, etc.) ma dedykowany landing page pod SEO.
URL: `bajkoterapia.org/problem/samodzielne-zasypianie`, `bajkoterapia.org/problem/napady-zlosci` itd.

Strony są statyczne (SSG) — zero JS runtime, szybkie, indeksowalane przez Google.

## Stan obecny

15 plików HTML w Dropbox, każdy ~616 linii. **~95% identycznego kodu**, różni się tylko content tematyczny. Andrzej generował je ręcznie (copy-paste + zmiana tekstu).

## Architektura docelowa

```
src/
├── data/
│   └── topics.ts              ← definicje 15+ tematów (typed)
├── components/
│   └── topic-landing/
│       ├── TopicHero.tsx
│       ├── TopicPain.tsx
│       ├── TopicScience.tsx
│       ├── TopicWizard.tsx     ← reuse istniejącego book order form
│       ├── TopicFooter.tsx
│       └── TopicLayout.tsx     ← compose all sections
└── routes/
    └── problem.$slug.tsx       ← React Router dynamic route
```

## Krok 1: Dane — `src/data/topics.ts`

Jeden plik z tablicą obiektów. Każdy temat to:

```typescript
interface TopicCard {
  icon: string; // FontAwesome class, np. "fa-solid fa-bed"
  title: string; // np. "Pokój jako królestwo"
  description: string;
}

interface Topic {
  // Routing
  slug: string; // "samodzielne-zasypianie" → /problem/samodzielne-zasypianie

  // SEO
  title: string; // <title> tag: "Bajkoterapia – Nauka Samodzielnego Zasypiania"
  metaDescription: string;

  // Hero section
  badge: string; // np. "Metoda oparta na badaniach"
  headline: string; // H1: "Jak nauczyć dziecko zasypiać samodzielnie, gdy..."
  headlineAccent: string; // część w kolorze: "nie chce spać w swoim pokoju?"
  intro: string; // paragraph pod H1
  heroImage: string; // Unsplash URL
  heroImageAlt: string;

  // Pain section
  painHeadline: string; // H2: "Znasz to uczucie, gdy..."
  painEmpathy: string; // paragraph z bold highlights
  painRootCause: string; // paragraph o przyczynach
  painCta: string; // "Zamiast kolejnych nocy... daj dziecku historię..."

  // Science section (3 karty)
  scienceHeadline: string; // "Dlaczego bajka pomaga dziecku..."
  scienceSubheading: string; // "Bajkoterapia buduje poczucie..."
  scienceCards: [TopicCard, TopicCard, TopicCard];

  // Loading modal
  loadingMessage: string; // "Tworzę magiczną bajkę o odważnym śnie..."
}
```

**Przykład jednego tematu:**

```typescript
{
  slug: "samodzielne-zasypianie",
  title: "Bajkoterapia – Nauka Samodzielnego Zasypiania | Dziecko Nie Śpi Samo",
  metaDescription: "Spersonalizowana bajka terapeutyczna, która pomaga dziecku zasypiać samodzielnie. Oparta na badaniach, gotowa w 15 minut.",
  badge: "Metoda oparta na badaniach",
  headline: "Jak nauczyć dziecko zasypiać samodzielnie, gdy",
  headlineAccent: "nie chce spać w swoim pokoju?",
  intro: "Godziny przy łóżku, przenosiny w środku nocy, bezsenność dla całej rodziny. Bajka, w której Twoje dziecko jest bohaterem, buduje pewność siebie i oswaja własny pokój. Krok po kroku, bez łez.",
  heroImage: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?...",
  heroImageAlt: "Dziecko śpiące spokojnie w swoim pokoju",
  painHeadline: "Znasz to uczucie, gdy znowu kładziesz dziecko w swoim łóżku o 2 w nocy?",
  painEmpathy: "Rozumiemy wyczerpanie. Dziecko nie chce spać samo i co noc przychodzi do Waszego pokoju. Jak nauczyć dziecko spać w swoim łóżku? Próbowałeś metod stopniowych, nagród, lampek – nic nie działa.",
  painRootCause: "Lęk przed samotnością jest głęboko zakorzeniony. Dziecko potrzebuje nie tylko technik, ale też emocjonalnego przekonania, że jego pokój jest bezpieczny, a ono samo – wystarczająco odważne.",
  painCta: "Zamiast kolejnych nocy w triplebedu, daj dziecku historię, po której własny pokój stanie się najpiękniejszym miejscem na ziemi.",
  scienceHeadline: "Dlaczego bajka pomaga dziecku zasypiać samodzielnie?",
  scienceSubheading: "Bajkoterapia buduje poczucie bezpieczeństwa i kompetencji poprzez identyfikację z odważnym bohaterem.",
  scienceCards: [
    { icon: "fa-solid fa-bed", title: "Pokój jako królestwo", description: "Bajka osadza akcję w pokoju dziecka, zamieniając go w magiczne miejsce pełne przygód. Dziecko zaczyna chcieć tam wracać." },
    { icon: "fa-solid fa-shield-halved", title: "Buduje odwagę", description: "Bohater odkrywa w sobie odwagę do spania samemu. Dziecko internalizuje tę odwagę jako swoją własną – bo to jego historia." },
    { icon: "fa-solid fa-hat-wizard", title: "Strażnik Snów", description: "W bajce pojawia się niewidzialny Strażnik, który czuwa nad dzieckiem całą noc. To samo poczucie bezpieczeństwa przenosi się do rzeczywistości." },
  ],
  loadingMessage: "Tworzę magiczną bajkę o odważnym śnie...",
}
```

## Krok 2: Route — `routes/problem.$slug.tsx`

```typescript
// React Router v7 dynamic route
// SSG: prerender all slugs at build time

import { topics } from "~/data/topics";

export function loader({ params }) {
  const topic = topics.find(t => t.slug === params.slug);
  if (!topic) throw new Response("Not Found", { status: 404 });
  return { topic };
}

export function meta({ data }) {
  return [
    { title: data.topic.title },
    { name: "description", content: data.topic.metaDescription },
  ];
}

export default function TopicPage() {
  const { topic } = useLoaderData();
  return <TopicLayout topic={topic} />;
}
```

## Krok 3: Komponenty

### TopicLayout.tsx

Compose wszystkich sekcji. Przyjmuje `topic: Topic` jako prop.

```tsx
export function TopicLayout({ topic }: { topic: Topic }) {
  return (
    <>
      <TopicHero topic={topic} />
      <TopicPain topic={topic} />
      <TopicScience topic={topic} />
      <TopicWizard /> {/* identyczny dla wszystkich — reuse book order */}
      <TopicFooter /> {/* identyczny */}
    </>
  );
}
```

### TopicHero.tsx

Renderuje: badge, H1 (headline + headlineAccent), intro, CTA button, hero image.

### TopicPain.tsx

Renderuje: painHeadline, painEmpathy (z `<strong>` highlights), painRootCause, painCta (w stylizowanym callout).

### TopicScience.tsx

Renderuje: scienceHeadline, scienceSubheading, 3 × TopicCard (icon + title + description), disclaimer note.

### TopicWizard.tsx

**100% reuse** istniejącego formularza book order — 4 stepy: Bohater → Wygląd → Misja → Finalizacja.
Wizard jest identyczny na wszystkich landing pages. Jedyna różnica: preselect problemu w Step 3 na podstawie `topic.slug`.

## Krok 4: Statyczne prerendering (SSG)

W `react-router.config.ts` dodać:

```typescript
import { topics } from './src/data/topics';

export default {
  prerender: ['/', ...topics.map((t) => `/problem/${t.slug}`)],
};
```

Przy `npm run build` React Router wygeneruje statyczne HTML per temat → deploy na Vercel = instant load, pełne SEO.

## Sekcje wspólne (template, zero zmiennych)

| Sekcja                                     | Linii HTML | Zmienne?        |
| ------------------------------------------ | ---------- | --------------- |
| Head (CSS, fonts, Tailwind config)         | ~57        | NIE             |
| Nav                                        | ~11        | NIE             |
| Wizard Step 1 (Bohater: imię, wiek, płeć)  | ~50        | NIE             |
| Wizard Step 2 (Wygląd: włosy, oczy, strój) | ~75        | NIE             |
| Wizard Step 3 (Misja: dropdown problemów)  | ~40        | Tylko preselect |
| Wizard Step 4 (Email, consent, CTA 39 zł)  | ~33        | NIE             |
| Footer                                     | ~13        | NIE             |
| Paywall modal                              | ~35        | NIE             |
| JS (wizard navigation + submit)            | ~100       | NIE             |

## Sekcje zmienne (content per temat)

| Sekcja                                  | Zmiennych | Typ                    |
| --------------------------------------- | --------- | ---------------------- |
| `<title>` + meta                        | 2         | string                 |
| Hero (badge, H1, intro, image)          | 6         | string                 |
| Pain (headline, 2 paragraphs, CTA)      | 4         | string (z inline HTML) |
| Science (headline, subheading, 3 cards) | 11        | string + icon          |
| Loading modal                           | 1         | string                 |
| **TOTAL per temat**                     | **24**    |                        |

## 15 tematów do zaimplementowania

| #   | Slug                        | Nazwa                                 |
| --- | --------------------------- | ------------------------------------- |
| 1   | `adaptacja-przedszkolna`    | Adaptacja przedszkolna                |
| 2   | `bajkoterapia-ogolna`       | Bajkoterapia personalizowana (ogólna) |
| 3   | `bicie-innych`              | Bije inne dzieci                      |
| 4   | `bunt-odmowa-wspolpracy`    | Bunt i odmowa współpracy              |
| 5   | `czeste-pobudki-nocne`      | Częste pobudki nocne                  |
| 6   | `mycie-zebow`               | Mycie zębów / higiena jamy ustnej     |
| 7   | `nadwrazliwosc-sensoryczna` | Nadwrażliwość sensoryczna             |
| 8   | `napady-zlosci`             | Napady złości i histeria              |
| 9   | `niesmialosci`              | Nieśmiałość / wycofanie społeczne     |
| 10  | `odpieluchowanie`           | Odpieluchowanie / nauka nocnika       |
| 11  | `rozwod-rodzicow`           | Rozwód i rozłąka rodziców             |
| 12  | `rywalizacja-rodzenstwo`    | Rywalizacja między rodzeństwem        |
| 13  | `samodzielne-zasypianie`    | Samodzielne zasypianie                |
| 14  | `trudnosci-z-zasypianiem`   | Trudności z zasypianiem               |
| 15  | `wybiorczos-pokarmowa`      | Wybiórczość pokarmowa / niejadek      |

## Design system (z prototypów)

```
Font:        Nunito (400, 600, 700, 800, 900)
Icons:       FontAwesome 6.4.0
Colors:
  calm-50:   #f0f9ff (hero bg)
  calm-100:  #e0f2fe (borders, badges)
  calm-500:  #0ea5e9 (accent blue)
  calm-800:  #075985 (text)
  calm-900:  #0c4a6e (headings, dark bg)
  magic-400: #fbbf24 (gold highlights)
  magic-500: #f59e0b (CTA buttons)
  magic-600: #d97706 (CTA hover)
Body bg:     #FAFAFA
Text:        #334155
Hero bg:     linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)
Roundness:   rounded-2xl / rounded-3xl (duże radiusy)
CTA:         rounded-full, shadow-xl, hover:-translate-y-1
```

## Effort estimate

| Krok | Co                                                  | ~LOC             |
| ---- | --------------------------------------------------- | ---------------- |
| 1    | `topics.ts` — wyciągnąć content z 15 HTML           | ~400             |
| 2    | Route `problem.$slug.tsx`                           | ~30              |
| 3    | 5 komponentów (Hero, Pain, Science, Wizard, Footer) | ~250             |
| 4    | Prerender config                                    | ~10              |
| 5    | QA: porównać render z oryginalnymi HTML             | ~0 (visual diff) |

**Redukcja:** 15 × 616 = 9240 linii HTML → ~690 linii TypeScript + dane.

## Open questions

1. **Wizard reuse** — czy `TopicWizard` powinien osadzać istniejący `/book/order` form czy być standalone? (Standalone = prostsze SEO, ale duplikacja logiki.)
2. **Preselect problemu** — na landing page "Samodzielne zasypianie" → Step 3 dropdown powinien mieć preselected "Trudności z zasypianiem"? Prototypy tego nie robią (dropdown identyczny).
3. **Nowe tematy** — dodanie nowego tematu = 1 obiekt w `topics.ts` (~25 pól). Czy LLM generuje content? Andrzej pisze ręcznie?
4. **Tłumaczenia** — prototypy są PL-only, ale bajkoterapia.org ma EN/PL/DE. Czy topic pages też mają być wielojęzyczne?
5. **Pricing** — prototypy mówią 39 zł (przekreślone 99 zł). Aktualne?
6. **Obrazki hero** — Unsplash URLs. Zastąpić własnymi? Unsplash w produkcji = ryzyko rate limit + zależność.
