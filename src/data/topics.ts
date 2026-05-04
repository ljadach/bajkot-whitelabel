/**
 * Topic landing page data extracted from HTML prototypes in docs/prototypes/.
 * Each topic corresponds to a SEO landing page for a specific parenting challenge.
 */

export interface ScienceCard {
  icon: string;
  title: string;
  description: string;
}

/**
 * Catalog category — drives the tab filter on the auth-flow catalog screen.
 * Mirrors the prototype's 7 categories from docs/protos_v2/Bajkoterapia-Nowy-Flow.html.
 */
export type CatalogCategory =
  | 'sen'
  | 'emocje'
  | 'higiena'
  | 'relacje'
  | 'leki'
  | 'trudne'
  | 'roznorodnosc';

export const CATALOG_CATEGORIES: { id: CatalogCategory; label: string; emoji: string }[] = [
  { id: 'sen', label: 'Sen i Wieczór', emoji: '🌙' },
  { id: 'emocje', label: 'Emocje i Zachowanie', emoji: '😤' },
  { id: 'higiena', label: 'Higiena i Nawyki', emoji: '🧼' },
  { id: 'relacje', label: 'Relacje i Rodzeństwo', emoji: '👫' },
  { id: 'leki', label: 'Lęki i Odwaga', emoji: '🦁' },
  { id: 'trudne', label: 'Trudne Sytuacje', emoji: '💔' },
  { id: 'roznorodnosc', label: 'Różnorodność', emoji: '🌈' },
];

/**
 * Short catalog card content (emoji + headline + 1-line description) used by
 * the auth-flow catalog screen. Independent from the long-form SEO topic.
 */
export interface CatalogCard {
  emoji: string;
  shortTitle: string;
  shortDesc: string;
}

export interface Topic {
  slug: string;
  problemId: string | null;
  title: string;
  metaDescription: string;
  badge: string;
  headline: string;
  headlineAccent: string;
  intro: string;
  heroImage: string;
  heroImageAlt: string;
  painHeadline: string;
  painEmpathy: string;
  painRootCause: string;
  painCta: string;
  scienceHeadline: string;
  scienceSubheading: string;
  scienceCards: [ScienceCard, ScienceCard, ScienceCard];
  loadingMessage: string;
  /** Catalog tab this topic belongs to. */
  category: CatalogCategory;
  /** Short content for the catalog grid card (auth flow). */
  catalog: CatalogCard;
}

export const TOPICS: Topic[] = [
  // ---------------------------------------------------------------------------
  // 1. Adaptacja Przedszkolna
  // ---------------------------------------------------------------------------
  {
    slug: 'adaptacja-przedszkolna',
    problemId: 'preschool_adaptation',
    title: 'Bajkoterapia – Dziecko Nie Chce Iść do Przedszkola | Adaptacja',
    metaDescription:
      'Łzy przy bramce, kurczowe trzymanie za rękę – bajkoterapia zamienia przedszkole w ekscytującą przygodę i oswaja lęk separacyjny.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku polubić przedszkole, gdy',
    headlineAccent: 'płacze przy każdym pożegnaniu?',
    intro:
      'Łzy przy bramce, kurczowe trzymanie za rękę, błagalne nie zostawiaj mnie – to boli oboje. Bajka, w której Twoje dziecko jest bohaterem, zamienia przedszkole w ekscytującą przygodę i oswaja lęk separacyjny.',
    heroImage: '/illustrations/theme-przedszkole.png',
    heroImageAlt: 'Uśmiechnięte dziecko z plecakiem gotowe do przedszkola',
    painHeadline: 'Znasz uczucie, gdy odprowadzasz dziecko i słyszysz płacz przez zamknięte drzwi?',
    painEmpathy:
      'Rozumiemy, jak trudne są pierwsze dni w przedszkolu. Maluch nie chce iść do przedszkola i wymyśla bóle brzucha każdego ranka. Pożegnania trwają 20 minut i kończą się dramatem.',
    painRootCause:
      'Adaptacja przedszkolna to jedna z pierwszych wielkich prób dla dziecka. Lęk separacyjny jest naturalny, ale można go skutecznie zmniejszyć, dając dziecku narzędzia – zanim jeszcze wejdzie za tę bramkę.',
    painCta:
      'Zamiast tłumaczeń i obietnic, daj dziecku historię o Bohaterze, który odkrywa, że przedszkole to najlepsza przygoda.',
    scienceHeadline: 'Dlaczego bajka o przedszkolu zmniejsza lęk separacyjny?',
    scienceSubheading:
      'Bajkoterapia oswaja nieznane środowisko przez bezpieczny świat wyobraźni, zanim dziecko go doświadczy.',
    scienceCards: [
      {
        icon: 'fa-solid fa-school',
        title: 'Oswaja nieznane',
        description:
          'Bajka wprowadza dziecko do przedszkola przez zabawę – spotyka nowe dzieci, panią, salę. Wszystko staje się znajome jeszcze przed wejściem.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Pewność siebie',
        description:
          'Bohater odkrywa, że mama zawsze wraca. Ta prosta prawda, przeżyta w bajce, buduje wewnętrzne poczucie bezpieczeństwa.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Przyjaciel z bajki',
        description:
          'W historii pojawia się nowy przyjaciel, który zaprasza bohatera do zabawy. Dziecko zaczyna czekać na to spotkanie.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o przedszkolnej przygodzie...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Nie chce iść do przedszkola?',
      shortDesc: 'Adaptacja przedszkolna. Historia pomoże oswoić nowe miejsce i nowych ludzi.',
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Bije Inne Dzieci
  // ---------------------------------------------------------------------------
  {
    slug: 'bicie-innych',
    problemId: 'physical_aggression',
    title: 'Bajkoterapia - Opanuj dziecięcą złość magią',
    metaDescription:
      'Pomóż dziecku opanować złość dzięki bajce, w której to ONO jest bohaterem. Naucz malucha radzenia sobie z trudnymi emocjami.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak poradzić sobie, gdy',
    headlineAccent: 'moje dziecko bije innych?',
    intro:
      'Pomóż dziecku opanować złość dzięki bajce, w której to ONO jest bohaterem. Odkryj spersonalizowaną bajkoterapię. Naucz malucha radzenia sobie z trudnymi emocjami bez krzyku i stresu – w bezpiecznym świecie wyobraźni.',
    heroImage:
      'https://images.unsplash.com/photo-1544365558-35aa4afcf11f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Uśmiechnięte dziecko czytające magiczną książkę, styl 3D Pixar',
    painHeadline: 'Znasz to uczucie bezradności, gdy emocje wymykają się spod kontroli?',
    painEmpathy:
      'Rozumiemy, jak bardzo to stresujące. Odbierasz telefon z placówki i słyszysz, że Twoje dziecko bije w przedszkolu. Na placu zabaw widzisz, jak w ułamku sekundy, sfrustrowane, szturcha i popycha rówieśników, a w domu w mgnieniu oka bije rodzeństwo o zabraną zabawkę. Czasem emocje są tak potężne, że maluch aż gryzie inne dzieci.',
    painRootCause:
      'Kiedy Twoje dziecko bije inne dzieci, nie robi tego ze złości na Ciebie ani dlatego, że jest "złe". Dzieci, zwłaszcza w wieku przedszkolnym, po prostu często nie posiadają słownictwa umożliwiającego bezpośrednią dyskusję o własnych emocjach. Złość znajduje natychmiastowe ujście w ciele.',
    painCta:
      'Zamiast kolejnych wykładów i kar, których dziecko nie potrafi jeszcze przetworzyć, daj mu narzędzie, które naprawdę zrozumie: Historię o samym sobie.',
    scienceHeadline: 'Dlaczego spersonalizowana bajka działa skuteczniej niż reprymenda?',
    scienceSubheading:
      'Personalizowana bajkoterapia to nie tylko piękna pamiątka. To narzędzie psychoedukacyjne opierające się na udowodnionym naukowo "Efekcie Odniesienia do Ja" (Self-Reference Effect).',
    scienceCards: [
      {
        icon: 'fa-solid fa-eye',
        title: 'Uczy przez obserwację',
        description:
          'Dostarcza dziecku gotowego, pozytywnego "skryptu" zachowania w stresującej sytuacji. Zamiast bić, bohater uczy się nazywać złość.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Bezpieczny dystans',
        description:
          'Dziecko identyfikuje się z postacią, ale pozostaje bezpieczne. Widzi sukces zastępczego Ja i czuje: "Skoro on potrafi, to ja też!".',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczny Przewodnik',
        description:
          'W historii pojawia się "Mądry Pomocnik" (np. ulubiona zabawka), podpowiadając rozwiązanie i wspierając malucha emocjonalnie.',
      },
    ],
    loadingMessage: 'Analizujemy wyzwanie wychowawcze.',
    category: 'emocje',
    catalog: {
      emoji: '😤',
      shortTitle: 'Bije, gryzie, kopie?',
      shortDesc:
        'Agresywne zachowania u małych dzieci. Historia pokaże inne sposoby wyrażania emocji.',
    },
  },

  // ---------------------------------------------------------------------------
  // 4. Bunt i Odmowa Współpracy
  // ---------------------------------------------------------------------------
  {
    slug: 'bunt-odmowa-wspolpracy',
    problemId: 'defiance',
    title: 'Bajkoterapia – Bunt Dwulatka i Trzylatka | Dziecko Nie Słucha',
    metaDescription:
      'Nie!, Sam! i rzucanie się na podłogę to normalne etapy – ale można przez nie przejść łagodniej dzięki bajkoterapii.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak przeżyć bunt i sprawić, by',
    headlineAccent: 'dziecko zaczęło słuchać i współpracować?',
    intro:
      'Nie!, Sam! i rzucanie się na podłogę to normalne etapy – ale można przez nie przejść łagodniej. Bajka, w której Twoje dziecko jest bohaterem, uczy autonomii i granic bez walki o władzę.',
    heroImage:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko uczące się samodzielności w wesołej atmosferze',
    painHeadline: 'Znasz to uczucie bezsilności, gdy każda prośba zamienia się w wojnę?',
    painEmpathy:
      'Rozumiemy, jak wyczerpujący jest bunt dwulatka. Każde ubierz się kończy się awanturą. Dziecko nie słucha i robi dokładnie odwrotnie. Wychodzicie spóźnieni po 20-minutowej walce o buty.',
    painRootCause:
      'Bunt to zdrowy znak niezależności – ale dziecko potrzebuje granic i pozytywnych wzorców. Zamiast walki, potrzebuje historii, która pokaże mu, że współpraca prowadzi do piękniejszych przygód.',
    painCta:
      'Zamiast kolejnych negocjacji i pouczeń, daj dziecku historię o Bohaterze, który odkrywa moc mówienia tak.',
    scienceHeadline:
      'Dlaczego bajka działa lepiej niż stawianie granic przy buntującym się dziecku?',
    scienceSubheading: 'Bajkoterapia uczy współpracy przez pozytywne modelowanie – nie przez kary.',
    scienceCards: [
      {
        icon: 'fa-solid fa-star',
        title: 'Autonomia bez chaosu',
        description:
          'Bajka pokazuje, jak bohater wyraża swoją niezależność w sposób, który nie rani innych. Dziecko widzi, że można być samodzielnym i lubianym.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Pozytywne wzmocnienie',
        description:
          'Zamiast kar i reprymend, historia nagradza współpracę przygodą i radością. Dziecko chce naśladować bohatera.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mądry Doradca',
        description:
          'W bajce pojawia się postać, która pomaga bohaterowi zrozumieć, że słuchanie innych to siła – nie słabość.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o odkryciu współpracy...',
    category: 'emocje',
    catalog: {
      emoji: '😤',
      shortTitle: 'Ciągle mówi NIE?',
      shortDesc:
        'Bunt i odmowa współpracy. Bajka pomoże dziecku zrozumieć zasady i znaleźć kompromis.',
    },
  },

  // ---------------------------------------------------------------------------
  // 5. Częste Pobudki Nocne
  // ---------------------------------------------------------------------------
  {
    slug: 'czeste-pobudki-nocne',
    problemId: 'night_wakings',
    title: 'Bajkoterapia – Nocne Pobudki | Spokojny Sen Dziecka',
    metaDescription:
      'Koniec z nocnymi wstawaniami. Pomóż dziecku poczuć się bezpiecznie w ciemności dzięki spersonalizowanej bajce terapeutycznej.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak wrócić do spokojnego snu, gdy',
    headlineAccent: 'dziecko budzi się w nocy?',
    intro:
      'Koniec z nocnymi wstawaniami. Pomóż dziecku poczuć się bezpiecznie w ciemności dzięki bajce, w której ONO jest bohaterem. Bajkoterapia uczy malucha, że noc jest przyjazna – bez krzyku, bez walki.',
    heroImage:
      'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Spokojnie śpiące dziecko w przytulnym łóżku',
    painHeadline: 'Znasz uczucie, gdy wstajesz po raz trzeci tej nocy, bo maluch znowu płacze?',
    painEmpathy:
      'Rozumiemy, jak bardzo wyczerpujące jest ciągłe wybudzanie się dziecka w nocy. Ledwo zaśniesz, a już słyszysz płacz. Dziecko budzi się z płaczem i nie potrafi samo znowu zasnąć.',
    painRootCause:
      'Dziecko nie robi tego złośliwie. Nocne lęki i poczucie opuszczenia są dla malucha jak najbardziej prawdziwe. Potrzebuje narzędzia, które zrozumie – nie kolejnego tłumaczenia w środku nocy.',
    painCta:
      'Zamiast kolejnych powrotów do łóżka, daj dziecku historię o Bohaterze, który sam radzi sobie z nocą.',
    scienceHeadline: 'Dlaczego bajka na dobranoc działa lepiej niż nocna lampka?',
    scienceSubheading:
      'Spersonalizowana bajkoterapia to nie tylko piękna pamiątka. To narzędzie psychoedukacyjne opierające się na udowodnionym naukowo Efekcie Odniesienia do Ja (Self-Reference Effect).',
    scienceCards: [
      {
        icon: 'fa-solid fa-moon',
        title: 'Oswaja ciemność',
        description:
          'Bajka prowadzi dziecko przez noc razem z ulubionym bohaterem, zamieniając lęk w przygodę. Ciemność staje się znajomą krainą.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje wewnętrzne zasoby',
        description:
          'Dziecko widzi, że bohater potrafi poczuć się bezpiecznie bez mamy czy taty. Skoro on potrafi, to ja też!',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczny Rytuał Snu',
        description:
          'Regularne czytanie tej samej bajki tworzy kojący rytuał, który sygnalizuje mózgowi: czas na spokojny sen.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o spokojnej nocy...',
    category: 'sen',
    catalog: {
      emoji: '🌙',
      shortTitle: 'Budzi się w nocy z płaczem?',
      shortDesc:
        'Nocne pobudki, koszmary i lęk przed ciemnością. Historia, która da dziecku poczucie bezpieczeństwa nocą.',
    },
  },

  // ---------------------------------------------------------------------------
  // 6. Mycie Zębów
  // ---------------------------------------------------------------------------
  {
    slug: 'mycie-zebow',
    problemId: 'tooth_brushing',
    title: 'Bajkoterapia – Dziecko Nie Chce Myć Zębów | Higiena Jamy Ustnej',
    metaDescription:
      'Ucieczki, płacz, zaciśnięte usta – bajkoterapia zamienia szczoteczkę w magiczne narzędzie i mycie zębów w ekscytującą misję.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak sprawić, by mycie zębów stało się',
    headlineAccent: 'przygodą, a nie codzienną bitwą?',
    intro:
      'Ucieczki, płacz, zaciśnięte usta – wiemy jak to wygląda. Bajka, w której Twoje dziecko jest bohaterem, zamienia szczoteczkę w magiczne narzędzie i mycie zębów w ekscytującą misję.',
    heroImage:
      'https://images.unsplash.com/photo-1559329007-40df8a9345d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko szczęśliwie myjące zęby jak bohater',
    painHeadline: 'Znasz ten wieczorny rytuał: Nie! Nie chcę myć zębów!?',
    painEmpathy:
      'Rozumiemy codzienną walkę. Dziecko nie chce myć zębów i żaden argument nie pomaga. Tłumaczysz o próchnicy, dentystach, cukrach – maluch ucieka. Jak zachęcić dziecko do mycia zębów bez siłowania co wieczór?',
    painRootCause:
      'Opór przy higienie często wynika z wrażliwości sensorycznej lub z tego, że dziecko nie rozumie po co to robić. Bajka może zmienić perspektywę: szczoteczka to broń w walce z Bakteryjnymi Potworami!',
    painCta:
      'Zamiast siłowania i grożenia dentystą, daj dziecku historię, w której szczoteczka jest magiczną bronią.',
    scienceHeadline: 'Dlaczego bajka o myciu zębów działa, gdy argumenty nie pomagają?',
    scienceSubheading:
      'Bajkoterapia zmienia kontekst emocjonalny czynności – z przymusu na zabawę i przygodę.',
    scienceCards: [
      {
        icon: 'fa-solid fa-tooth',
        title: 'Misja Czystych Zębów',
        description:
          'Bajka zamienia mycie zębów w heroiczną misję. Bohater ratuje swoje zęby przed Bakteryjnymi Potworami. Brzmi jak przygoda, nie obowiązek.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Pozytywne emocje',
        description:
          'Dziecko identyfikuje się z bohaterem i chce być takim samym bohaterem. Po bajce samo bierze szczoteczkę.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczna Szczoteczka',
        description:
          'W bajce szczoteczka ma imię i moc. Dziecko zaczyna traktować swoją szczoteczkę jak przyjaciela, który na nie czeka.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o Misji Czystych Zębów...',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Mycie zębów to codzienne pole bitwy?',
      shortDesc: 'Higiena jamy ustnej jako walka. Historia zamieni mycie zębów w zabawną przygodę.',
    },
  },

  // ---------------------------------------------------------------------------
  // 7. Nadwrażliwość Sensoryczna
  // ---------------------------------------------------------------------------
  {
    slug: 'nadwrazliwosc-sensoryczna',
    problemId: 'sensory_sensitivity',
    title: 'Bajkoterapia – Nadwrażliwość Sensoryczna u Dziecka',
    metaDescription:
      'Twoje dziecko zatyka uszy, boi się głośnych dźwięków lub tłumów? Bajkoterapia uczy malucha rozumieć swoje zmysły.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku z',
    headlineAccent: 'nadwrażliwością na dźwięki i bodźce?',
    intro:
      'Twoje dziecko zatyka uszy, boi się głośnych dźwięków lub tłumów? Pomóż mu poczuć się bezpiecznie dzięki bajce, w której ONO jest bohaterem. Bajkoterapia uczy malucha rozumieć swoje zmysły – bez paniki, bez ucieczki.',
    heroImage: '/illustrations/theme-burza.png',
    heroImageAlt: 'Spokojne, zamyślone dziecko w przytulnym otoczeniu',
    painHeadline:
      'Znasz uczucie bezradności, gdy dziecko wybucha z powodu dźwięków, których inni nie słyszą?',
    painEmpathy:
      'Rozumiemy, jak trudne to jest. Maluch zatyka uszy w supermarkecie, płacze od śmiechu innych dzieci, boi się głośnych dźwięków. Każde wyjście z domu to stres.',
    painRootCause:
      'Dziecko z nadwrażliwością sensoryczną nie przesadza. Jego układ nerwowy naprawdę odbiera bodźce intensywniej. Potrzebuje narzędzi, które pomogą mu rozumieć i zarządzać swoimi zmysłami.',
    painCta:
      'Zamiast unikania świata, daj dziecku historię o Bohaterze, który odkrywa swoje superzmysły.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku z nadwrażliwością sensoryczną?',
    scienceSubheading:
      'Spersonalizowana bajkoterapia pomaga dziecku zrozumieć i zaakceptować swój wyjątkowy sposób odbierania świata.',
    scienceCards: [
      {
        icon: 'fa-solid fa-ear-listen',
        title: 'Normalizuje doświadczenie',
        description:
          'Bajka pokazuje dziecku, że jego wrażliwość to nie wada – to supermoce, które można nauczyć się kontrolować i doceniać.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Strategie radzenia sobie',
        description:
          'Bohater uczy się konkretnych technik, np. magicznego oddechu czy bezpiecznego miejsca. Dziecko ćwiczy je razem z nim.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mądry Przewodnik',
        description:
          'W historii pojawia się pomocnik, który rozumie wrażliwość dziecka i pomaga mu nawigować w świecie pełnym bodźców.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o superzmysłach...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Zatyka uszy, boi się burzy lub tłumu?',
      shortDesc:
        'Nadwrażliwość sensoryczna. Bajka pomoże dziecku radzić sobie z głośnymi dźwiękami.',
    },
  },

  // ---------------------------------------------------------------------------
  // 8. Napady Złości
  // ---------------------------------------------------------------------------
  {
    slug: 'napady-zlosci',
    problemId: 'tantrums',
    title: 'Bajkoterapia – Napady Złości i Histeria u Dziecka',
    metaDescription:
      'Krzyk w sklepie, rzucanie się na podłogę, łzy bez końca. Bajkoterapia uczy malucha nazywać i regulować emocje – zanim eksplodują.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak opanować napady złości i histerię, gdy',
    headlineAccent: 'dziecko wybucha z błahego powodu?',
    intro:
      'Krzyk w sklepie, rzucanie się na podłogę, łzy bez końca. Bajka, w której Twoje dziecko jest bohaterem, uczy malucha nazywać i regulować emocje – zanim eksplodują. Spokojnie i z empatią.',
    heroImage: '/illustrations/theme-zlosc.png',
    heroImageAlt: 'Dziecko uczące się regulować emocje z pomocą rodzica',
    painHeadline:
      'Znasz to uczucie bezsilności, gdy napad złości wybucha w najgorszym możliwym miejscu?',
    painEmpathy:
      'Rozumiemy, jak stresujące są napady złości u dziecka. W kasie supermarketu, na placu zabaw, na urodzinach kolegi. Histeria u dziecka pojawia się nagle i trwa wiecznie.',
    painRootCause:
      'Napady złości to normalny etap, ale można skrócić ich czas trwania i intensywność. Dziecko potrzebuje języka emocji – a bajka to najlepsza lekcja, jaką może dostać.',
    painCta:
      'Zamiast kolejnych walk z histerią, daj dziecku historię o Bohaterze, który ujarzmia swojego Gniewosława.',
    scienceHeadline: 'Dlaczego bajka o złości redukuje napady szału lepiej niż time-out?',
    scienceSubheading: 'Bajkoterapia buduje korę przedczołową – centrum kontroli emocji u dziecka.',
    scienceCards: [
      {
        icon: 'fa-solid fa-fire-flame-curved',
        title: 'Nazywa emocje',
        description:
          'Bajka daje dziecku słownik emocji. Gdy maluch wie, że to co czuje to złość, może o tym powiedzieć zamiast bić lub krzyczeć.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Techniki regulacji',
        description:
          'Bohater uczy się konkretnych technik: głęboki oddech, liczenie do 5, magiczne słowo. Dziecko ćwiczy je przez identyfikację z postacią.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Przyjazny Potwór Złości',
        description:
          'W bajce złość ma twarz – sympatyczną, ale dającą się oswajać. Dziecko uczy się zaprzyjaźnić ze swoimi emocjami, nie walczyć z nimi.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o oswajaniu złości...',
    category: 'emocje',
    catalog: {
      emoji: '😤',
      shortTitle: 'Wybuchy złości, których nie da się opanować?',
      shortDesc:
        'Napady histerii i frustracji. Bajka nauczy dziecko rozpoznawać i oswajać trudne emocje.',
    },
  },

  // ---------------------------------------------------------------------------
  // 9. Nieśmiałość
  // ---------------------------------------------------------------------------
  {
    slug: 'niesmialosci',
    problemId: 'shyness',
    title: 'Bajkoterapia – Nieśmiałe Dziecko | Pewność Siebie Wśród Rówieśników',
    metaDescription:
      'Chowa się za Tobą, nie odzywa się do innych dzieci, boi się podejść do grupy. Bajkoterapia buduje pewność siebie krok po kroku.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc nieśmiałemu dziecku',
    headlineAccent: 'pewniej czuć się wśród rówieśników?',
    intro:
      'Chowa się za Tobą, nie odzywa się do innych dzieci, boi się podejść do grupy. Bajka, w której Twoje dziecko jest bohaterem, buduje pewność siebie krok po kroku i pokazuje, że bycie sobą przyciąga przyjaciół.',
    heroImage: '/illustrations/theme-niesmialosc.png',
    heroImageAlt: 'Dziecko pewnie bawiące się z rówieśnikami na placu zabaw',
    painHeadline: 'Znasz to uczucie, gdy Twoje dziecko stoi z boku i patrzy jak inne się bawią?',
    painEmpathy:
      'Rozumiemy, jak bolesne to jest dla rodzica. Dziecko boi się innych dzieci i nie chce podchodzić do grupy. Nieśmiałe dziecko w przedszkolu stoi pod ścianą, gdy inne się bawią. Martwisz się, że dziecko nie ma kolegów.',
    painRootCause:
      'Nieśmiałość to nie wada – to temperament, który można wspierać. Dziecko potrzebuje małych sukcesów społecznych, by budować śmiałość. Bajka może być pierwszym z nich.',
    painCta:
      'Zamiast pchania i zachęcania idź się bawić, daj dziecku historię, po której samo będzie chciało zaprzyjaźnić się z innymi.',
    scienceHeadline: 'Dlaczego bajka buduje pewność siebie nieśmiałego dziecka?',
    scienceSubheading:
      'Bajkoterapia daje dziecku emocjonalne doświadczenie sukcesu społecznego zanim go przeżyje naprawdę.',
    scienceCards: [
      {
        icon: 'fa-solid fa-users',
        title: 'Próba w bezpiecznej przestrzeni',
        description:
          'Bajka daje dziecku możliwość przeżycia poznawania nowych przyjaciół przez bohatera. Bez ryzyka, bez wstydu – tylko przygoda.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Silne strony dziecka',
        description:
          'Bajka podkreśla unikalną cechę dziecka, która przyciąga przyjaciół. Maluch zaczyna widzieć w sobie wartość.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Pierwszy Przyjaciel',
        description:
          'W bajce pojawia się ktoś, kto dostrzega wyjątkowość bohatera i zaprasza go do zabawy. Dziecko uczy się, że jest kogoś warte.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o odkryciu przyjaźni...',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Nie chce się bawić z innymi dziećmi?',
      shortDesc: 'Wycofanie społeczne. Historia pokaże, jak fajnie jest mieć przyjaciół.',
    },
  },

  // ---------------------------------------------------------------------------
  // 10. Odpieluchowanie
  // ---------------------------------------------------------------------------
  {
    slug: 'odpieluchowanie',
    problemId: 'potty_training',
    title: 'Bajkoterapia – Odpieluchowanie i Nauka Korzystania z Nocnika',
    metaDescription:
      'Bez presji, bez stresu. Bajkoterapia zamienia nocnik w fascynującą przygodę i buduje pewność siebie małego odkrywcy.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak sprawić, by dziecko chciało korzystać z nocnika, gdy',
    headlineAccent: 'odpieluchowanie utknęło w miejscu?',
    intro:
      'Bez presji, bez stresu. Bajka, w której Twoje dziecko jest bohaterem, zamienia nocnik w fascynującą przygodę i buduje pewność siebie małego odkrywcy. Naturalnie i we własnym tempie.',
    heroImage:
      'https://images.unsplash.com/photo-1526399232581-2ab5608b6336?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Małe dziecko uczące się nowych umiejętności z uśmiechem',
    painHeadline:
      'Znasz to uczucie, gdy inne dzieci już dawno są bez pieluszki, a Twoje się wzbrania?',
    painEmpathy:
      'Rozumiemy frustrację. Próbowałeś naklejek, nagród, tłumaczeń. Jak odpieluchować dziecko krok po kroku, gdy ono po prostu nie chce korzystać z nocnika? Każda próba kończy się płaczem.',
    painRootCause:
      'Gotowość do odpieluchowania jest indywidualna. Presja pogarsza sytuację. Dziecko potrzebuje pozytywnych skojarzeń z nocnikiem – i może je zbudować przez historię, w której samo jest bohaterem.',
    painCta:
      'Zamiast kolejnych naklejek i negocjacji, daj dziecku historię, w której korzystanie z nocnika to super przygoda.',
    scienceHeadline: 'Dlaczego bajka o nocniku przyspiesza odpieluchowanie?',
    scienceSubheading:
      'Bajkoterapia uczy przez naśladownictwo i buduje pozytywne skojarzenia z nową umiejętnością.',
    scienceCards: [
      {
        icon: 'fa-solid fa-toilet',
        title: 'Pozytywne kojarzenie',
        description:
          'Bohater bajki z radością korzysta z nocnika i jest z siebie dumny. Mózg buduje pozytywne skojarzenia przez identyfikację.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Bez presji',
        description:
          'Historia nie przymusza – pokazuje. Dziecko samo chce być jak bohater. To jego własna decyzja, nie rodziców.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczny Nocnik',
        description:
          'W bajce nocnik staje się czymś wyjątkowym – atrybutem dużego dziecka, które może wszystko.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o przygodzie nocnika...',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Nocnik? Nie, dziękuję!',
      shortDesc:
        'Nauka korzystania z nocnika. Bajka przedstawi nocnik jako naturalny krok w dorastaniu.',
    },
  },

  // ---------------------------------------------------------------------------
  // 11. Rozwód Rodziców
  // ---------------------------------------------------------------------------
  {
    slug: 'rozwod-rodzicow',
    problemId: 'parents_divorce',
    title: 'Bajkoterapia – Jak Pomóc Dziecku Przeżyć Rozwód Rodziców',
    metaDescription:
      'Rozwód to trudny czas – szczególnie dla dzieci. Bajkoterapia daje dziecku słowa, bezpieczeństwo i nadzieję.',
    badge: 'Delikatne wsparcie dla całej rodziny',
    headline: 'Jak wesprzeć dziecko emocjonalnie, gdy',
    headlineAccent: 'rodzina przechodzi przez rozstanie lub rozwód?',
    intro:
      'Rozwód to trudny czas – szczególnie dla dzieci, które nie rozumieją dlaczego ich świat się zmienił. Bajka, w której Twoje dziecko jest bohaterem, daje mu słowa, bezpieczeństwo i nadzieję.',
    heroImage: '/illustrations/theme-rozwod.png',
    heroImageAlt: 'Dziecko trzymane za rękę przez rodzica, czujące się bezpiecznie',
    painHeadline: 'Znasz to trudne pytanie: Dlaczego tata lub mama już z nami nie mieszka?',
    painEmpathy:
      'Rozumiemy, jak trudno jest wytłumaczyć dziecku o rozwodzie. Boisz się, że skrzywdzisz. Dziecko po rozwodzie rodziców bywa smutne, agresywne lub zamknięte w sobie.',
    painRootCause:
      'Dzieci często biorą winy na siebie. Potrzebują jasnego komunikatu: to nie ich wina, oboje rodziców je kocha. Bajka może przekazać tę wiadomość w bezpieczny, niebezpośredni sposób.',
    painCta:
      'Zamiast trudnych rozmów, które nie wychodzą, daj dziecku historię, która mówi: jesteś kochany przez oboje rodziców – zawsze.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku przeżyć rozstanie rodziców?',
    scienceSubheading:
      'Bajkoterapia daje dziecku bezpieczny dystans do przepracowania trudnych emocji.',
    scienceCards: [
      {
        icon: 'fa-solid fa-heart',
        title: 'Komunikat miłości',
        description:
          'Bajka wielokrotnie i jednoznacznie komunikuje: rodzice się rozstali, ale miłość do dziecka jest niezmieniona i wieczna.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'To nie Twoja wina',
        description:
          'Najważniejszy komunikat – ukryty w fabule, przeżyty emocjonalnie. Dziecko internalizuje go głębiej niż podczas rozmowy.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Nowa normalność',
        description:
          'Bohater buduje nowe, szczęśliwe życie. Dziecko widzi, że zmiana nie jest końcem – to nowy rozdział.',
      },
    ],
    loadingMessage: 'Tworzę bajkę pełną miłości i bezpieczeństwa...',
    category: 'trudne',
    catalog: {
      emoji: '💔',
      shortTitle: 'Rodzice się rozstają?',
      shortDesc:
        'Rozwód lub rozstanie rodziców. Bajka da dziecku poczucie bezpieczeństwa i miłości.',
    },
  },

  // ---------------------------------------------------------------------------
  // 12. Rywalizacja Rodzeństwo
  // ---------------------------------------------------------------------------
  {
    slug: 'rywalizacja-rodzenstwo',
    problemId: 'sibling_rivalry',
    title: 'Bajkoterapia – Rywalizacja i Konflikty Między Rodzeństwem',
    metaDescription:
      'Koniec z ciągłymi wojnami o zabawki i uwagę. Bajkoterapia buduje empatię i uczy współpracy między rodzeństwem.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak zatrzymać kłótnie, gdy',
    headlineAccent: 'rodzeństwo ciągle się bije i rywalizuje?',
    intro:
      'Koniec z ciągłymi wojnami o zabawki i uwagę. Pomóż dzieciom nauczyć się współpracy dzięki bajce, w której Twoje dziecko jest bohaterem. Bajkoterapia buduje empatię i uczy, jak być przyjacielem nawet dla brata czy siostry.',
    heroImage: '/illustrations/theme-rodzenstwo-klotnia.png',
    heroImageAlt: 'Dwoje dzieci bawiących się razem w zgodzie',
    painHeadline: 'Znasz to uczucie, gdy w domu trwa nieustanna wojna o każdą zabawkę?',
    painEmpathy:
      'Rozumiemy, jak wyczerpujące jest ciągłe rozdzielanie dzieci. Rodzeństwo się bije o pilota, o kanapę, o Twoją uwagę. Starsze bije młodsze, młodsze prowokuje starsze.',
    painRootCause:
      'Zazdrość i rywalizacja między rodzeństwem to normalna część rozwoju – ale można ją znacząco zmniejszyć. Dziecko potrzebuje pomocy w zrozumieniu, że miłość rodziców nie jest dobrem ograniczonym.',
    painCta:
      'Zamiast kolejnego nie bij i rozdzielania, daj dziecku historię o Bohaterze, który odkrywa, że razem jest silniejszy.',
    scienceHeadline: 'Dlaczego bajka redukuje konflikty między rodzeństwem lepiej niż kary?',
    scienceSubheading:
      'Spersonalizowana bajkoterapia uczy empatii i współpracy w bezpiecznym świecie wyobraźni.',
    scienceCards: [
      {
        icon: 'fa-solid fa-handshake',
        title: 'Buduje empatię',
        description:
          'Bajka pokazuje perspektywę rodzeństwa przez zabawę. Dziecko uczy się rozumieć, że brat lub siostra też ma swoje uczucia i potrzeby.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Nowe strategie',
        description:
          'Bohater odkrywa, że współpraca przynosi więcej radości niż rywalizacja. Dziecko dostaje gotowe wzorce zachowań.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczny Sojusznik',
        description:
          'W bajce rodzeństwo razem pokonuje przeszkody, budując więź, która inspiruje prawdziwe dzieci do współpracy.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o sile przyjaźni rodzeństwa...',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Kto jest ważniejszy — ja czy brat?',
      shortDesc:
        'Rywalizacja między rodzeństwem. Bajka pokaże, że miłość rodziców nie dzieli się na pół.',
    },
  },

  // ---------------------------------------------------------------------------
  // 13. Samodzielne Zasypianie
  // ---------------------------------------------------------------------------
  {
    slug: 'samodzielne-zasypianie',
    problemId: 'independent_sleep',
    title: 'Bajkoterapia – Nauka Samodzielnego Zasypiania | Dziecko Nie Śpi Samo',
    metaDescription:
      'Godziny przy łóżku, przenosiny w środku nocy. Bajkoterapia buduje pewność siebie i oswaja własny pokój. Krok po kroku, bez łez.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak nauczyć dziecko zasypiać samodzielnie, gdy',
    headlineAccent: 'nie chce spać w swoim pokoju?',
    intro:
      'Godziny przy łóżku, przenosiny w środku nocy, bezsenność dla całej rodziny. Bajka, w której Twoje dziecko jest bohaterem, buduje pewność siebie i oswaja własny pokój. Krok po kroku, bez łez.',
    heroImage: '/illustrations/theme-spanie-samodzielne.png',
    heroImageAlt: 'Dziecko śpiące spokojnie w swoim pokoju',
    painHeadline: 'Znasz to uczucie, gdy znowu kładziesz dziecko w swoim łóżku o 2 w nocy?',
    painEmpathy:
      'Rozumiemy wyczerpanie. Dziecko nie chce spać samo i co noc przychodzi do Waszego pokoju. Jak nauczyć dziecko spać w swoim łóżku? Próbowałeś metod stopniowych, nagród, lampek – nic nie działa.',
    painRootCause:
      'Lęk przed samotnością jest głęboko zakorzeniony. Dziecko potrzebuje nie tylko technik, ale też emocjonalnego przekonania, że jego pokój jest bezpieczny, a ono samo – wystarczająco odważne.',
    painCta:
      'Zamiast kolejnych nocy w triplebedu, daj dziecku historię, po której własny pokój stanie się najpiękniejszym miejscem na ziemi.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku zasypiać samodzielnie?',
    scienceSubheading:
      'Bajkoterapia buduje poczucie bezpieczeństwa i kompetencji poprzez identyfikację z odważnym bohaterem.',
    scienceCards: [
      {
        icon: 'fa-solid fa-bed',
        title: 'Pokój jako królestwo',
        description:
          'Bajka osadza akcję w pokoju dziecka, zamieniając go w magiczne miejsce pełne przygód. Dziecko zaczyna chcieć tam wracać.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje odwagę',
        description:
          'Bohater odkrywa w sobie odwagę do spania samemu. Dziecko internalizuje tę odwagę jako swoją własną – bo to jego historia.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Strażnik Snów',
        description:
          'W bajce pojawia się niewidzialny Strażnik, który czuwa nad dzieckiem całą noc. To samo poczucie bezpieczeństwa przenosi się do rzeczywistości.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o odważnym śnie...',
    category: 'sen',
    catalog: {
      emoji: '🌙',
      shortTitle: 'Pora na własne łóżeczko?',
      shortDesc:
        'Przejście do własnego łóżka. Bajka pokaże dziecku, że własne łóżeczko to bezpieczne miejsce.',
    },
  },

  // ---------------------------------------------------------------------------
  // 14. Trudności z Zasypianiem
  // ---------------------------------------------------------------------------
  {
    slug: 'trudnosci-z-zasypianiem',
    problemId: 'bedtime_resistance',
    title: 'Bajkoterapia – Dziecko Nie Chce Spać | Bajka na Dobranoc',
    metaDescription:
      'Gdy dziecko nie chce spać i wstaje po dziesięć razy – bajkoterapia zamienia czas snu w magiczną przygodę.',
    badge: 'Ponad 50 000 wyszukiwań miesięcznie',
    headline: 'Bajka na dobranoc, po której',
    headlineAccent: 'dziecko zaśnie szybko i spokojnie',
    intro:
      'Gdy dziecko nie chce spać i wstaje po dziesięć razy – bajkoterapia zmienia wszystko. Bajka, w której Twoje dziecko jest bohaterem, zamienia czas snu w magiczną przygodę i buduje zdrowy rytuał wieczorny.',
    heroImage:
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko śpiące spokojnie z pluszową zabawką',
    painHeadline: 'Znasz to uczucie, gdy kładziesz dziecko o 20:00, a ono wstaje do 22:00?',
    painEmpathy:
      'Rozumiemy ten wieczorny maraton. Dziecko nie chce spać i znajduje tysiąc powodów, żeby nie leżeć. Chce pić, chce siusiu, chce jeszcze jedno przytulanie. Jak uśpić dziecko bez godzinnego siedzenia przy łóżku?',
    painRootCause:
      'Trudności z zasypianiem często wynikają z nadmiaru bodźców lub lęku przed rozstaniem. Mózg dziecka potrzebuje sygnału do wyciszenia – a bajka jest idealnym mostem między dniem a snem.',
    painCta:
      'Zamiast kolejnego godzinnego siedzenia przy łóżku, daj dziecku historię, która prowadzi go w krainę snów.',
    scienceHeadline: 'Dlaczego spersonalizowana bajka zasypia dziecko lepiej niż bajki z YouTube?',
    scienceSubheading:
      'Bajka z imieniem dziecka aktywuje głębsze zaangażowanie mózgu i skuteczniej wycisza układ nerwowy.',
    scienceCards: [
      {
        icon: 'fa-solid fa-moon',
        title: 'Rytuał zasypiania',
        description:
          'Ta sama bajka czytana każdego wieczoru staje się sygnałem dla mózgu: czas na sen. Regularne rytuały dramatycznie skracają czas zasypiania.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Oswaja lęk przed ciemnością',
        description:
          'Bohater odkrywa, że noc jest pełna piękna i bezpiecznych przygód. Ciemność przestaje być straszna.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczny Opiekun Snów',
        description:
          'W bajce pojawia się przyjazna postać, która czuwa nad snem dziecka przez całą noc, dając mu poczucie bezpieczeństwa.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę na dobranoc...',
    category: 'sen',
    catalog: {
      emoji: '🌙',
      shortTitle: 'Twoje dziecko nie chce iść spać?',
      shortDesc:
        'Wieczorne bitwy o sen. Bajka pomoże dziecku zrozumieć, że pora snu może być przygodą.',
    },
  },

  // ---------------------------------------------------------------------------
  // 15. Wybiórczość Pokarmowa
  // ---------------------------------------------------------------------------
  {
    slug: 'wybiorczos-pokarmowa',
    problemId: 'food_selectivity',
    title: 'Bajkoterapia – Niejadek i Wybiórczość Pokarmowa',
    metaDescription:
      'Koniec z wojnami przy stole. Bajkoterapia zmienia stosunek malucha do jedzenia – bez wymuszania, bez stresu.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak zachęcić niejadka, gdy',
    headlineAccent: 'dziecko odmawia prawie wszystkiego?',
    intro:
      'Koniec z wojnami przy stole. Pomóż dziecku odkryć, że jedzenie to przygoda, dzięki bajce, w której ONO jest bohaterem. Bajkoterapia zmienia stosunek malucha do jedzenia – bez wymuszania, bez stresu.',
    heroImage: '/illustrations/theme-jedzenie.png',
    heroImageAlt: 'Dziecko odkrywające kolorowe owoce i warzywa',
    painHeadline: 'Znasz to uczucie, gdy każdy posiłek zamienia się w bitwę?',
    painEmpathy:
      'Rozumiemy, jak frustrujące jest, gdy Twoje dziecko nie chce jeść. Godzinami gotujesz i słyszysz nie lubię. Maluch odmawia jedzenia, akceptując tylko trzy rzeczy.',
    painRootCause:
      'Wybiórczość pokarmowa rzadko wynika ze złośliwości. Najczęściej to kwestia tekstur, nowych smaków lub lęku przed nieznanym. Dziecko potrzebuje bezpiecznej przestrzeni, by odkrywać jedzenie – najlepiej przez historię.',
    painCta:
      'Zamiast kolejnych negocjacji i wyrzucanych obiadów, daj dziecku historię o Bohaterze, który odkrywa magię smaków.',
    scienceHeadline: 'Dlaczego bajka zmienia stosunek do jedzenia skuteczniej niż nagrody?',
    scienceSubheading:
      'Spersonalizowana bajkoterapia to nie tylko piękna pamiątka. To narzędzie psychoedukacyjne opierające się na Efekcie Modelowania i uczeniu przez obserwację.',
    scienceCards: [
      {
        icon: 'fa-solid fa-utensils',
        title: 'Oswaja nowe smaki',
        description:
          'Bohater odkrywa nowe produkty jako część przygody – bez presji. Mózg uczy się kojarzyć jedzenie z ciekawością, nie lękiem.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Bezpieczny dystans',
        description:
          'Dziecko obserwuje jak bohater próbuje nowych smaków i czuje: Skoro on to lubi, to może ja też spróbuję?',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczny Kucharz',
        description:
          'W historii pojawia się Mądry Pomocnik, który zamienia każdy posiłek w fascynującą podróż przez świat smaków.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o odkrywaniu smaków...',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Je tylko 3 rzeczy?',
      shortDesc:
        'Wybiórczość pokarmowa i niejadek. Bajka zachęci dziecko do próbowania nowych smaków.',
    },
  },

  // ---------------------------------------------------------------------------
  // 16. Nawykowe Wstrzymywanie Potrzeb
  // ---------------------------------------------------------------------------
  {
    slug: 'wstrzymywanie-potrzeb',
    problemId: 'toilet_holding',
    title: 'Bajkoterapia – Dziecko Wstrzymuje Siusiu i Kupę | Pomoc',
    metaDescription:
      'Twoje dziecko wstrzymuje potrzeby i unika toalety? Bajka pomoże oswoić ciało i toaletę bez stresu i przymusu.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'wstrzymuje siusiu i kupę?',
    intro:
      'Wstrzymywanie potrzeb to częstszy problem, niż myślisz. Bajka, w której Twoje dziecko jest bohaterem, pomoże oswoić się z ciałem i toaletą — bez bólu, bez wstydu, bez walki.',
    heroImage:
      'https://images.unsplash.com/photo-1526399232581-2ab5608b6336?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Spokojne dziecko w łazience uczące się słuchać swojego ciała',
    painHeadline: 'Znasz to uczucie bezradności, gdy dziecko godzinami trzyma w sobie potrzeby?',
    painEmpathy:
      'Rozumiemy, jak trudne to jest. Twoje dziecko unika toalety, krzyżuje nogi, czerwienieje, ale za nic nie chce iść. Czasem dochodzi do bólów brzucha, zaparć, awantur w łazience.',
    painRootCause:
      'Wstrzymywanie potrzeb rzadko jest złośliwością — częściej to lęk, dyskomfort sensoryczny lub zła pamięć z bolesnego epizodu. Dziecko potrzebuje narzędzia, które pomoże mu zaufać własnemu ciału.',
    painCta:
      'Zamiast nakazywać i tłumaczyć, daj dziecku historię o Bohaterze, który zaprzyjaźnia się ze swoim ciałem i toaletą.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku rozluźnić się przy toalecie?',
    scienceSubheading:
      'Spersonalizowana bajkoterapia oswaja temat ciała i fizjologii w bezpiecznej, zabawnej formie.',
    scienceCards: [
      {
        icon: 'fa-solid fa-heart-pulse',
        title: 'Słucha ciała',
        description:
          'Bohater uczy się rozpoznawać sygnały z brzuszka i im ufać. Dziecko przejmuje tę umiejętność przez identyfikację.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Rozbraja lęk',
        description:
          'Bajka delikatnie pokazuje, że toaleta jest bezpieczna i przyjazna. Lęk przed bólem maleje wraz z każdą lekturą.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mądry Brzuszek',
        description:
          'W bajce pojawia się przyjazna postać brzuszka, która rozmawia z bohaterem. Dziecko uczy się, że ciało jest sojusznikiem.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o przyjaźni z brzuszkiem...',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Nie chce iść do toalety?',
      shortDesc:
        'Wstrzymywanie potrzeb to częsty problem. Bajka pomoże dziecku oswoić się z ciałem.',
    },
  },

  // ---------------------------------------------------------------------------
  // 17. Lęk Przed Kąpielą i Myciem Głowy
  // ---------------------------------------------------------------------------
  {
    slug: 'lek-przed-kapiela',
    problemId: 'bath_anxiety',
    title: 'Bajkoterapia – Dziecko Boi Się Kąpieli i Mycia Głowy',
    metaDescription:
      'Panika przy kąpieli, wrzask na widok prysznica, łzy podczas mycia głowy? Bajka zamieni strach w wesołą zabawę.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'boi się wody i mycia głowy?',
    intro:
      'Panika przy kąpieli, wrzask na widok prysznica. Bajka, w której Twoje dziecko jest bohaterem, zamieni strach w zabawę i pokaże, że woda potrafi być przyjaznym żywiołem.',
    heroImage:
      'https://images.unsplash.com/photo-1559329007-40df8a9345d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Roześmiane dziecko w wannie pełnej baniek mydlanych',
    painHeadline: 'Znasz to uczucie, gdy każda kąpiel to wieczorny dramat?',
    painEmpathy:
      'Rozumiemy, jak wyczerpujące to jest. Twoje dziecko ucieka przed wanną, krzyczy gdy woda dotknie głowy, pierwsza kropla na twarzy kończy się płaczem. Mycie szamponu to akt bohaterstwa.',
    painRootCause:
      'Lęk przed wodą wynika często z nadwrażliwości sensorycznej, jednorazowego nieprzyjemnego doświadczenia lub naturalnego strachu przed utratą kontroli. Dziecko potrzebuje pozytywnego, bezpiecznego doświadczenia z wodą.',
    painCta:
      'Zamiast siłowania i pospiechu, daj dziecku historię, w której kąpiel staje się magiczną podwodną przygodą.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku przestać bać się wody?',
    scienceSubheading:
      'Bajkoterapia zmienia kontekst emocjonalny kąpieli — z zagrożenia w przygodę.',
    scienceCards: [
      {
        icon: 'fa-solid fa-water',
        title: 'Oswaja żywioł',
        description:
          'Bajka pokazuje wodę jako przyjazną, magiczną krainę. Bohater odkrywa, że woda potrafi być najlepszym przyjacielem.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje kontrolę',
        description:
          'Bohater uczy się, że to on decyduje, kiedy zanurzyć głowę. Dziecko przejmuje to poczucie sprawczości.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczne Bańki',
        description:
          'W historii pojawia się Strażnik Baniek, który zamienia mycie w zabawę. Dziecko zaczyna czekać na kąpiel.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o podwodnej przygodzie...',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Boi się wody i mycia głowy?',
      shortDesc:
        'Lęk przed kąpielą i prysznicem. Bajka pomoże oswoić wodę i zamienić mycie w zabawę.',
    },
  },

  // ---------------------------------------------------------------------------
  // 18. Poranna Organizacja
  // ---------------------------------------------------------------------------
  {
    slug: 'poranna-organizacja',
    problemId: 'morning_routine',
    title: 'Bajkoterapia – Dziecko Marudzi Rano | Poranny Plan',
    metaDescription:
      'Ubieranie trwa wieczność, buty znikają, śniadanie stoi. Bajka nauczy małego bohatera porannego planu — bez krzyku.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak ogarnąć poranek, gdy',
    headlineAccent: 'rano nic nie idzie na czas?',
    intro:
      'Ubieranie trwa wieczność, buty znikają w najmniej spodziewanym miejscu. Bajka, w której Twoje dziecko jest bohaterem, nauczy malucha porannego planu — bez popędzania i nerwów.',
    heroImage:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko ubierające się samodzielnie z uśmiechem',
    painHeadline: 'Znasz to uczucie, gdy każdego ranka prosisz o to samo dziesięć razy?',
    painEmpathy:
      'Rozumiemy ten wyścig z czasem. Twoje dziecko ubiera jedną skarpetkę, potem znika do pokoju, do śniadania nie chce siadać, a buty zawsze są nie tam gdzie trzeba. Wychodzicie spóźnieni i zestresowani.',
    painRootCause:
      'Małe dzieci nie mają jeszcze rozwiniętej funkcji wykonawczej — czasu, sekwencji, priorytetów. Potrzebują wizualnego, emocjonalnego scenariusza, który pomoże im zorganizować poranek samodzielnie.',
    painCta:
      'Zamiast popędzania i napięcia, daj dziecku historię, po której rano samo zacznie pamiętać kolejne kroki.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku ogarnąć poranek?',
    scienceSubheading:
      'Bajkoterapia uczy sekwencji i samodzielności poprzez przeżyte doświadczenie bohatera.',
    scienceCards: [
      {
        icon: 'fa-solid fa-clock',
        title: 'Buduje rutynę',
        description:
          'Bajka pokazuje krok po kroku, co robi bohater rano. Mózg dziecka zapamiętuje sekwencję jak schemat zabawy.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Daje sprawczość',
        description:
          'Bohater dumnie sam się ubiera, sam pakuje plecak. Dziecko chce być takie samo dzielne — i staje się.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mistrz Czasu',
        description:
          'W historii pojawia się postać, która pomaga bohaterowi zaprzyjaźnić się z czasem. Poranek przestaje być wrogiem.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o porannej misji...',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Rano nic nie idzie na czas?',
      shortDesc: 'Poranna organizacja. Bajka nauczy małego bohatera, jak ogarnąć poranek.',
    },
  },

  // ---------------------------------------------------------------------------
  // 19. Zarządzanie Czasem Ekranowym
  // ---------------------------------------------------------------------------
  {
    slug: 'czas-ekranowy',
    problemId: 'screen_time_management',
    title: 'Bajkoterapia – Dziecko Nie Chce Wyłączyć Tableta | Ekrany',
    metaDescription:
      'Wyłączenie ekranu = koniec świata? Bajka pokaże dziecku, że poza bajkami w telefonie czeka jeszcze tyle fajnych rzeczy.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'nie chce odłożyć tableta?',
    intro:
      'Wyłączenie ekranu kończy się płaczem i awanturą? Bajka, w której Twoje dziecko jest bohaterem, pokaże, że świat poza ekranem jest pełen równie fajnych przygód.',
    heroImage:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko bawiące się klockami zamiast trzymania tabletu',
    painHeadline: 'Znasz to uczucie, gdy odebranie tableta wywołuje histerię?',
    painEmpathy:
      'Rozumiemy, jak trudno wyznaczyć granicę. Każde wyłącz to ostatni odcinek kończy się dramatem. Twoje dziecko prosi tylko jeszcze pięć minut, które zamieniają się w godzinę. A potem jest złe, że żadna prawdziwa zabawka go nie cieszy.',
    painRootCause:
      'Ekrany dają mózgowi dziecka silną dawkę dopaminy. Reszta świata wydaje się przy nich blada. To nie wina dziecka — to chemia. Dziecko potrzebuje pomocy w odkryciu, że offline też jest barwny.',
    painCta:
      'Zamiast walki o tablet, daj dziecku historię, po której samo zechce pobawić się klockami i pójść na dwór.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku ograniczyć ekran?',
    scienceSubheading:
      'Bajkoterapia konkurencyjnie aktywuje wyobraźnię — najsilniejszy ekran, jaki dziecko ma w głowie.',
    scienceCards: [
      {
        icon: 'fa-solid fa-mobile-screen',
        title: 'Pokazuje alternatywę',
        description:
          'Bohater odkrywa, że prawdziwe przygody dzieją się daleko od ekranu. Dziecko otrzymuje pomysły, czym się zająć poza tabletem.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Uczy granic',
        description:
          'Bajka pokazuje, że świadome zakończenie zabawy z ekranem to siła, nie strata. Bohater jest dumny, że potrafi.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Strażnik Wyobraźni',
        description:
          'W historii pojawia się postać, która pokazuje, że najlepsze bajki dziecko ma w sobie. Wyobraźnia wraca na pierwsze miejsce.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o przygodach poza ekranem...',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Nie mogę mu zabrać tableta?',
      shortDesc:
        'Zarządzanie czasem ekranowym. Bajka pokaże, że poza ekranem jest pełno fajnych rzeczy.',
    },
  },

  // ---------------------------------------------------------------------------
  // 20. Odstawienie Smoczka lub Butelki
  // ---------------------------------------------------------------------------
  {
    slug: 'odstawienie-smoczka',
    problemId: 'pacifier_weaning',
    title: 'Bajkoterapia – Odstawienie Smoczka i Butelki | Pożegnanie',
    metaDescription:
      'Smoczek dał dziecku bezpieczeństwo. Bajka pomoże delikatnie się z nim pożegnać — bez płaczu i straty zaufania.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pożegnać smoczek, gdy',
    headlineAccent: 'dziecko nie wyobraża sobie życia bez niego?',
    intro:
      'Smoczek dał bezpieczeństwo, ale nadchodzi czas, by go puścić. Bajka, w której Twoje dziecko jest bohaterem, zamieni pożegnanie w odważną przygodę — bez straty, bez dramatu.',
    heroImage:
      'https://images.unsplash.com/photo-1526399232581-2ab5608b6336?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Uśmiechnięte dziecko trzymające pluszaka, dumne z dorastania',
    painHeadline: 'Znasz to uczucie, gdy każda próba odstawienia smoczka kończy się łzami?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko zasypia tylko ze smoczkiem, w stresie chwyta po butelkę, próby ukrycia kończą się szukaniem przez pół domu. Boisz się, że odbierając smoczek, odbierzesz też poczucie bezpieczeństwa.',
    painRootCause:
      'Smoczek to nie tylko nawyk — to rytuał regulacji emocji. Dziecko potrzebuje czegoś, co zastąpi mu tę funkcję, oraz historii, która nada pożegnaniu sens i znaczenie.',
    painCta:
      'Zamiast nagłego zniknięcia smoczka, daj dziecku historię o Bohaterze, który dumnie i z miłością żegna swojego małego przyjaciela.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku rozstać się ze smoczkiem?',
    scienceSubheading:
      'Bajkoterapia daje dziecku rytuał i sens — dwa kluczowe składniki dobrego pożegnania.',
    scienceCards: [
      {
        icon: 'fa-solid fa-heart',
        title: 'Rytuał pożegnania',
        description:
          'Bohater oddaje smoczek w pięknej, znaczącej ceremonii. Dziecko otrzymuje gotowy scenariusz emocjonalnego pożegnania.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje dumę',
        description:
          'Pożegnanie nie jest stratą — jest dowodem dorastania. Bohater jest z siebie dumny, dziecko też chce być dumne.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczna Wróżka',
        description:
          'W bajce pojawia się postać, która zabiera smoczek i daje w zamian odwagę. Dziecko zostaje z poczuciem zysku, nie straty.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o pięknym pożegnaniu...',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Pora pożegnać się ze smoczkiem?',
      shortDesc: 'Odstawienie smoczka lub butelki. Bajka zamieni pożegnanie w odważną przygodę.',
    },
  },

  // ---------------------------------------------------------------------------
  // 21. Pojawienie się Nowego Dziecka
  // ---------------------------------------------------------------------------
  {
    slug: 'nowe-rodzenstwo',
    problemId: 'new_sibling',
    title: 'Bajkoterapia – Pojawienie Się Rodzeństwa | Wsparcie Starszego Dziecka',
    metaDescription:
      'Starsze dziecko regresuje, gryzie niemowlę, walczy o uwagę? Bajka pomoże mu odnaleźć się w roli starszej siostry lub brata.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak wesprzeć starsze dziecko, gdy',
    headlineAccent: 'w rodzinie pojawia się maluszek?',
    intro:
      'Starsze dziecko nagle znów sika w majtki, gryzie niemowlę, domaga się ciągłej uwagi. Bajka, w której Twoje dziecko jest bohaterem, pomoże mu odnaleźć się w nowej, pięknej roli starszej siostry lub brata.',
    heroImage: '/illustrations/theme-zazdrosc-rodzenstwo.png',
    heroImageAlt: 'Starsze dziecko delikatnie tulące młodsze rodzeństwo',
    painHeadline: 'Znasz to uczucie, gdy starsze dziecko nagle wraca do dawnych nawyków?',
    painEmpathy:
      'Rozumiemy, jak trudny to czas. Twoje starsze dziecko regresuje — chce butelki, ssania smoczka, mówi jak niemowlę. Bywa zazdrosne, prowokuje, czasem szczypie maluszka. Boisz się, że je tracisz na rzecz nowego.',
    painRootCause:
      'Pojawienie się rodzeństwa to dla starszego dziecka strata uwagi i statusu — zupełnie zrozumiała. Dziecko potrzebuje pewności, że Twoja miłość do niego nie maleje, oraz wizji, kim teraz jest w rodzinie.',
    painCta:
      'Zamiast tłumaczeń, daj dziecku historię, w której jest dumnym, kochanym bohaterem nowej rodzinnej epoki.',
    scienceHeadline: 'Dlaczego bajka pomaga starszemu dziecku zaakceptować rodzeństwo?',
    scienceSubheading: 'Bajkoterapia nazywa emocje regresji i daje dziecku nową, atrakcyjną rolę.',
    scienceCards: [
      {
        icon: 'fa-solid fa-baby',
        title: 'Nazywa emocje',
        description:
          'Bajka mówi wprost: czasem trudno mieć rodzeństwo. Dziecko czuje, że jest rozumiane, zamiast się tego wstydzić.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Nadaje rolę',
        description:
          'Bohater odkrywa moc bycia starszym — uczy, opiekuje się, jest mądrzejszy. To nowy, atrakcyjny status.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Pewność miłości',
        description:
          'Bajka wielokrotnie powtarza: rodzice kochają tak samo. Dziecko internalizuje to przez powtarzalne przeżycie.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o byciu starszym bratem lub siostrą...',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'W rodzinie pojawia się maluszek?',
      shortDesc:
        'Pojawienie się rodzeństwa. Bajka pomoże starszemu dziecku znaleźć się w nowej roli.',
    },
  },

  // ---------------------------------------------------------------------------
  // 22. Problem z Dzieleniem Się
  // ---------------------------------------------------------------------------
  {
    slug: 'dzielenie-sie',
    problemId: 'sharing_difficulty',
    title: 'Bajkoterapia – Dziecko Nie Chce Się Dzielić | Moje!',
    metaDescription:
      'Wszystko jest „moje!" i nic do oddania? Bajka delikatnie pokaże, że wspólna zabawa potrafi być fajniejsza niż zatrzymywanie dla siebie.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak nauczyć dziecko dzielić się, gdy',
    headlineAccent: 'mówi „moje!" do każdej zabawki?',
    intro:
      'Dzielenie się nie jest proste, gdy masz 3 lata. Bajka, w której Twoje dziecko jest bohaterem, pokaże, że wspólna zabawa potrafi być o wiele bardziej radosna niż samotne pilnowanie skarbu.',
    heroImage: '/illustrations/theme-dzielenie-zabawkami.png',
    heroImageAlt: 'Dwoje dzieci wspólnie bawiących się klockami',
    painHeadline: 'Znasz to uczucie wstydu, gdy w piaskownicy każda zabawka jest „moja"?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko nie chce dzielić się żadną zabawką, nawet z kuzynem na urodzinach. Każda próba oddania kończy się płaczem. W przedszkolu pani mówi, że wyrywa zabawki innym.',
    painRootCause:
      'Dla małego dziecka „moje" to nie egoizm — to dopiero raczkujące poczucie własności i tożsamości. Dziecko potrzebuje doświadczenia, że dawanie nie oznacza utraty.',
    painCta:
      'Zamiast moralizowania, daj dziecku historię o Bohaterze, który odkrywa, że dzielenie się przynosi więcej radości niż zachowywanie.',
    scienceHeadline: 'Dlaczego bajka uczy dzielenia się skuteczniej niż „bądź grzeczny"?',
    scienceSubheading:
      'Bajkoterapia pozwala dziecku przeżyć korzyści z dzielenia, zanim zaryzykuje w realu.',
    scienceCards: [
      {
        icon: 'fa-solid fa-handshake',
        title: 'Pokazuje korzyść',
        description:
          'Bohater dzieli się i odkrywa, że dostaje w zamian radość, przyjaciela, śmiech. Dziecko widzi: dawanie ≠ strata.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Szanuje granice',
        description:
          'Bajka uczy, że nie trzeba dzielić wszystkiego. Bohater ma swoje skarby — i to też jest okej. Dziecko czuje się szanowane.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magia Współdzielenia',
        description:
          'W historii zabawka zaczyna „rosnąć" w siłę, gdy ktoś się nią dzieli. Wspólna zabawa ma swoją magię.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o sile dzielenia się...',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Moje! Nie dam!',
      shortDesc: 'Trudność z dzieleniem się. Bajka pokaże, że wspólna zabawa może być fajniejsza.',
    },
  },

  // ---------------------------------------------------------------------------
  // 23. Empatia i Rozumienie Emocji Innych
  // ---------------------------------------------------------------------------
  {
    slug: 'empatia-rozumienie-emocji',
    problemId: 'empathy_building',
    title: 'Bajkoterapia – Rozwijanie Empatii u Dziecka | Rozumienie Emocji',
    metaDescription:
      'Twoje dziecko nie zauważa, że ktoś jest smutny? Bajka pomoże rozwinąć empatię i nauczyć rozumienia uczuć innych.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku rozwijać empatię i',
    headlineAccent: 'rozumieć uczucia innych?',
    intro:
      'Empatia to umiejętność, której można się nauczyć. Bajka, w której Twoje dziecko jest bohaterem, pokaże mu świat oczami innych — i pomoże dostrzec, co czują koledzy, rodzeństwo, rodzice.',
    heroImage:
      'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko pocieszające płaczącego kolegę z troską w oczach',
    painHeadline: 'Znasz to uczucie, gdy Twoje dziecko nie zauważa, że ktoś obok jest smutny?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko śmieje się, gdy kolega się przewróci. Nie reaguje, gdy rodzeństwo płacze. Reaguje gniewem, kiedy ktoś przeszkadza mu w zabawie. Martwisz się, czy będzie umiało zaprzyjaźnić się z innymi.',
    painRootCause:
      'Empatia rozwija się stopniowo, w odpowiednim wieku — ale można ją wspierać. Dziecko potrzebuje doświadczenia bycia w cudzej skórze, by zrozumieć cudze emocje. Bajka jest do tego idealnym narzędziem.',
    painCta:
      'Zamiast pouczać o uczuciach, daj dziecku historię, w której bohater wkracza w cudzą perspektywę i dowiaduje się, jak to jest być kimś innym.',
    scienceHeadline: 'Dlaczego bajka rozwija empatię u dziecka?',
    scienceSubheading:
      'Czytanie historii uruchamia te same obszary mózgu co realne przeżywanie emocji innych ludzi.',
    scienceCards: [
      {
        icon: 'fa-solid fa-face-smile',
        title: 'Trening perspektywy',
        description:
          'Bajka pokazuje, jak czują się inne postacie. Dziecko trenuje przyjmowanie cudzego punktu widzenia.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Nazywanie emocji',
        description:
          'Bohater identyfikuje, że kolega jest smutny, zazdrosny, zawstydzony. Dziecko buduje własny słownik emocji.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mądry Przewodnik',
        description:
          'W historii pojawia się postać, która pomaga bohaterowi zauważać uczucia innych — to jak trener empatii.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o rozumieniu serc...',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Nie zauważa cudzych emocji?',
      shortDesc: 'Rozwijanie empatii. Bajka pomoże dziecku zrozumieć, co czują inni.',
    },
  },

  // ---------------------------------------------------------------------------
  // 24. Budowanie Pierwszych Przyjaźni
  // ---------------------------------------------------------------------------
  {
    slug: 'pierwsze-przyjaznie',
    problemId: 'first_friendships',
    title: 'Bajkoterapia – Pierwsze Przyjaźnie Dziecka | Jak Pomóc',
    metaDescription:
      'Twoje dziecko nie wie, jak zagadać do innych dzieci? Bajka pokaże, że pierwszy krok ku przyjaźni jest najważniejszy — i wcale nie taki trudny.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku',
    headlineAccent: 'budować pierwsze przyjaźnie?',
    intro:
      'Nawiązywanie relacji z rówieśnikami to pierwsze duże wyzwanie społeczne. Bajka, w której Twoje dziecko jest bohaterem, pokaże mu, że pierwszy krok jest najważniejszy — i naprawdę prosty.',
    heroImage:
      'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dwoje dzieci wesoło bawiących się razem na placu zabaw',
    painHeadline: 'Znasz to uczucie, gdy dziecko stoi z boku i nie wie, jak dołączyć?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko chce się bawić z innymi, ale nie wie, jak zacząć rozmowę. Stoi obok grupy, czeka, aż ktoś się odezwie. Pyta po przedszkolu czy może się ze mną kolegował, ale jutro znowu się nie odważy.',
    painRootCause:
      'Pierwsze przyjaźnie wymagają konkretnych umiejętności społecznych, których trzeba się nauczyć: zagadanie, zaproszenie do zabawy, dzielenie się. Dziecko potrzebuje gotowych skryptów i dawki odwagi.',
    painCta:
      'Zamiast popychania idź się bawić, daj dziecku historię, po której samo zechce wyciągnąć rękę do drugiego dziecka.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku zaprzyjaźniać się z innymi?',
    scienceSubheading:
      'Bajkoterapia daje dziecku gotowy skrypt społeczny i bezpieczne doświadczenie sukcesu.',
    scienceCards: [
      {
        icon: 'fa-solid fa-users',
        title: 'Skrypty społeczne',
        description:
          'Bohater uczy się konkretnych słów: cześć, mogę się przyłączyć, lubię twój sweter. Dziecko zapamiętuje je przez identyfikację.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje śmiałość',
        description:
          'Bohater odważa się wyciągnąć rękę i okazuje się, że to działa. Dziecko zyskuje wewnętrzne „ja też mogę spróbować".',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Pierwsza Iskra',
        description:
          'W historii ktoś dostrzega bohatera i mówi „chodź się pobawić". Dziecko uczy się, że jest godne przyjaźni.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o pierwszej przyjaźni...',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Jak budować pierwsze przyjaźnie?',
      shortDesc:
        'Pierwsze relacje z rówieśnikami. Bajka pokaże, że pierwszy krok jest najważniejszy.',
    },
  },

  // ---------------------------------------------------------------------------
  // 25. Lęk Separacyjny
  // ---------------------------------------------------------------------------
  {
    slug: 'lek-separacyjny',
    problemId: 'separation_anxiety',
    title: 'Bajkoterapia – Lęk Separacyjny u Dziecka | Nie Zostawiaj Mnie',
    metaDescription:
      'Każde rozstanie to dramat? Bajka delikatnie oswoi lęk separacyjny i pokaże dziecku, że mama lub tata zawsze wracają.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak oswoić lęk separacyjny, gdy',
    headlineAccent: 'każde rozstanie kończy się dramatem?',
    intro:
      'Każde rozstanie to dramat? Lęk separacyjny jest naturalnym etapem rozwoju — i można go oswoić. Bajka, w której Twoje dziecko jest bohaterem, daje pewność, że Ci, których kochamy, zawsze wracają.',
    heroImage: '/illustrations/theme-rozstanie.png',
    heroImageAlt: 'Dziecko machające na pożegnanie z uśmiechem zamiast łez',
    painHeadline: 'Znasz to ścisnięcie serca, gdy dziecko płacze za Tobą przy każdym wyjściu?',
    painEmpathy:
      'Rozumiemy, jak bardzo to bolesne. Twoje dziecko trzyma się Ciebie kurczowo, panikuje, gdy idziesz nawet do toalety. Wyjście do pracy to codzienny dramat, a wieczorne pożegnania ciągną się w nieskończoność.',
    painRootCause:
      'Lęk separacyjny to znak silnej więzi — ale dziecku trudno znieść jej chwilowe przerwanie. Potrzebuje wewnętrznego przekonania, że osoba, którą kocha, istnieje nawet gdy jej nie widzi.',
    painCta:
      'Zamiast kolejnych obietnic „zaraz wrócę", daj dziecku historię o Bohaterze, który odkrywa, że miłość trwa nawet na odległość.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku znosić rozstania?',
    scienceSubheading:
      'Bajkoterapia buduje w dziecku trwałość obiektu emocjonalnego — pewność, że ukochane osoby istnieją także gdy ich nie widać.',
    scienceCards: [
      {
        icon: 'fa-solid fa-heart',
        title: 'Trwałość więzi',
        description:
          'Bajka pokazuje, że miłość rodziców istnieje cały czas — nawet gdy są daleko. Bohater nosi ją w sobie wszędzie.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Powrót pewny',
        description:
          'Historia wielokrotnie powtarza wzorzec: rozstanie → przygoda → powrót. Mózg dziecka uczy się, że rozstania kończą się ponownym spotkaniem.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczny Łącznik',
        description:
          'W bajce pojawia się przedmiot lub gest, który łączy bohatera z bliskimi nawet na odległość. Dziecko może mieć swój własny w realu.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o niewidzialnej nici miłości...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Nie zostawiaj mnie!',
      shortDesc: 'Lęk separacyjny. Bajka pomoże dziecku poczuć, że miłość trwa nawet na odległość.',
    },
  },

  // ---------------------------------------------------------------------------
  // 26. Lęk Przed Ciemnością
  // ---------------------------------------------------------------------------
  {
    slug: 'lek-przed-ciemnoscia',
    problemId: 'fear_of_dark',
    title: 'Bajkoterapia – Dziecko Boi Się Ciemności | Potwory pod Łóżkiem',
    metaDescription:
      'Potwory pod łóżkiem, cienie na ścianie, paniczny lęk przed ciemnym pokojem. Bajka pomoże odkryć, że ciemność może być przyjazna.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'boi się ciemności i potworów?',
    intro:
      'Potwory pod łóżkiem, cienie na ścianie, prośby o palące się światło. Bajka, w której Twoje dziecko jest bohaterem, pomoże mu odkryć, że ciemność wcale nie jest wrogiem — może być przyjacielem pełnym sekretów.',
    heroImage: '/illustrations/theme-lek-ciemnosci.png',
    heroImageAlt: 'Dziecko spokojnie zasypiające w przyciemnionym, przytulnym pokoju',
    painHeadline: 'Znasz to uczucie, gdy dziecko panicznie nie chce zostać samo w ciemnym pokoju?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko widzi potwory w cieniach, słyszy szelesty, wstaje co chwilę po szklankę wody, byle tylko nie zostać samo. Każde gaszenie światła to dramat, każdy wieczorny szmer wywołuje krzyk.',
    painRootCause:
      'Lęk przed ciemnością to bardzo częsty etap rozwojowy. Wyobraźnia dziecka jest potężna i wypełnia ciemność tym, czego nie widzi. Dziecko potrzebuje narzędzia, które przeprogramuje tę wyobraźnię na pozytyw.',
    painCta:
      'Zamiast kolejnej lampki nocnej, daj dziecku historię, w której ciemność staje się magiczną, bezpieczną krainą pełną przyjaciół.',
    scienceHeadline: 'Dlaczego bajka oswaja lęk przed ciemnością lepiej niż lampka?',
    scienceSubheading:
      'Bajkoterapia przekierowuje wyobraźnię dziecka — z generatora potworów na stwórcę przyjaciół.',
    scienceCards: [
      {
        icon: 'fa-solid fa-moon',
        title: 'Przeprogramowuje cienie',
        description:
          'Bajka zamienia cienie w postacie z bajki — sympatyczne, znajome. Dziecko widzi to, co przeczytaliście razem.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje odwagę',
        description:
          'Bohater odkrywa, że potrafi być dzielny w ciemności. Dziecko internalizuje tę odwagę jako swoją własną.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Strażnik Nocy',
        description:
          'W bajce pojawia się przyjazna postać, która czuwa nad dzieckiem. Ciemność przestaje być pusta — ma w sobie życzliwość.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o przyjaciołach z ciemności...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Boi się ciemności?',
      shortDesc:
        'Lęk przed ciemnością. Bajka pomoże dziecku odkryć, że ciemność może być przyjazna.',
    },
  },

  // ---------------------------------------------------------------------------
  // 27. Lęk Przed Zabiegami Medycznymi
  // ---------------------------------------------------------------------------
  {
    slug: 'lek-przed-lekarzem',
    problemId: 'medical_anxiety',
    title: 'Bajkoterapia – Dziecko Boi Się Lekarza | Szczepienia, Dentysta',
    metaDescription:
      'Panika przy fartuchu, krzyk na widok strzykawki? Bajka oswoi wizytę lekarską i pokaże, że to przygoda, nie kara.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak oswoić wizytę u lekarza, gdy',
    headlineAccent: 'dziecko panikuje przed badaniami?',
    intro:
      'Szczepienie, dentysta, biały fartuch — paniczny strach. Bajka, w której Twoje dziecko jest bohaterem, oswoi wizytę lekarską i pokaże, że gabinet to miejsce, gdzie ktoś się o niego troszczy.',
    heroImage: '/illustrations/theme-lekarz.png',
    heroImageAlt: 'Spokojne dziecko na wizycie u lekarza, otoczone troską',
    painHeadline:
      'Znasz to uczucie, gdy dziecko zaczyna płakać już w samochodzie po drodze do lekarza?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko panikuje na widok białego fartucha, krzyczy przy dentyście, odmawia otwarcia ust. Każde szczepienie to walka, każde badanie kończy się dramatem.',
    painRootCause:
      'Lęk przed lekarzem to często strach przed nieznanym i utratą kontroli. Dziecko potrzebuje przeżyć wizytę najpierw w wyobraźni — w bezpiecznej, przewidywalnej formie — by lepiej znieść tę prawdziwą.',
    painCta:
      'Zamiast obietnic „nic nie będzie boleć", daj dziecku historię, w której Bohater odkrywa, że gabinet jest miejscem przyjaznym.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku znieść wizytę lekarską?',
    scienceSubheading:
      'Bajkoterapia opiera się na ekspozycji w wyobraźni — najłagodniejszej formie oswajania lęku.',
    scienceCards: [
      {
        icon: 'fa-solid fa-stethoscope',
        title: 'Oswaja gabinet',
        description:
          'Bajka prowadzi przez wizytę krok po kroku. Dziecko poznaje, co się będzie działo i przestaje obawiać się nieznanego.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Daje techniki',
        description:
          'Bohater uczy się sposobów na poradzenie sobie ze strachem — głęboki oddech, ściśnięcie pluszaka. Dziecko ma realne narzędzia.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Lekarz Sojusznik',
        description:
          'W bajce lekarz to postać dobra i mądra, która chce pomóc. Dziecko zmienia wewnętrzną mapę z „wróg" na „przyjaciel".',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o odwadze w gabinecie...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Panikuje u lekarza?',
      shortDesc:
        'Lęk przed zabiegami medycznymi. Bajka oswoi wizytę i zamieni ją w odważną przygodę.',
    },
  },

  // ---------------------------------------------------------------------------
  // 28. Zmiana Miejsca Zamieszkania
  // ---------------------------------------------------------------------------
  {
    slug: 'przeprowadzka',
    problemId: 'relocation',
    title: 'Bajkoterapia – Przeprowadzka z Dzieckiem | Nowy Dom',
    metaDescription:
      'Przeprowadzka to dla dziecka utrata całego znanego świata. Bajka pomoże odkryć, że dom jest tam, gdzie rodzina.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak wesprzeć dziecko, gdy',
    headlineAccent: 'wasza rodzina się przeprowadza?',
    intro:
      'Nowy dom, nowy pokój, nowe miasto — to dla dziecka utrata całego znanego świata. Bajka, w której Twoje dziecko jest bohaterem, pomoże mu odkryć, że prawdziwym domem jest to, gdzie jest rodzina.',
    heroImage: '/illustrations/theme-przeprowadzka.png',
    heroImageAlt: 'Dziecko z pluszakiem ciekawie odkrywające nowy pokój',
    painHeadline: 'Znasz to uczucie, gdy widzisz, jak Twoje dziecko gubi grunt po przeprowadzce?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko nie chce spać w nowym pokoju, tęskni za dawnymi kolegami, pyta kiedy wrócimy do prawdziwego domu. Bywa smutne, agresywne lub regresuje do wcześniejszych zachowań.',
    painRootCause:
      'Dla dziecka przeprowadzka to wstrząs sensoryczny i emocjonalny — wszystko, co znajome, znika. Dziecko potrzebuje doświadczenia, że bezpieczeństwo nie tkwi w ścianach, tylko w relacjach.',
    painCta:
      'Zamiast tłumaczeń, że tu też będzie fajnie, daj dziecku historię o Bohaterze, który odkrywa, że dom da się odnaleźć w sobie.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku przeżyć przeprowadzkę?',
    scienceSubheading:
      'Bajkoterapia buduje wewnętrzne poczucie bezpieczeństwa, które przenosi się razem z dzieckiem.',
    scienceCards: [
      {
        icon: 'fa-solid fa-house',
        title: 'Dom w sercu',
        description:
          'Bajka pokazuje, że dom to nie miejsce, ale uczucie. Bohater nosi je w sobie, dziecko też zaczyna tak myśleć.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Oswaja zmianę',
        description:
          'Bohater odkrywa, że nowe miejsce ma swoje skarby. Dziecko zmienia perspektywę z „strata" na „odkrycie".',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Magiczna Pamięć',
        description:
          'W bajce pojawia się sposób na zachowanie wspomnień ze starego miejsca. Dziecko nie traci — zabiera ze sobą.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o nowym domu...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Przeprowadzka — nowy dom, nowy świat?',
      shortDesc:
        'Zmiana miejsca zamieszkania. Bajka pomoże odkryć, że dom jest tam, gdzie rodzina.',
    },
  },

  // ---------------------------------------------------------------------------
  // 29. Niska Samoocena
  // ---------------------------------------------------------------------------
  {
    slug: 'niska-samoocena',
    problemId: 'low_self_esteem',
    title: 'Bajkoterapia – Niska Samoocena u Dziecka | Wiara w Siebie',
    metaDescription:
      'Twoje dziecko mówi „nie potrafię" i porównuje się z innymi? Bajka pokaże, jak wiele potrafi i ile w nim jest piękna.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'nie wierzy w siebie i porównuje się z innymi?',
    intro:
      'Mówi nie potrafię, jestem gorszy, inni są lepsi. Bajka, w której Twoje dziecko jest bohaterem, pokaże mu krok po kroku, jak wiele już umie i ile w nim jest unikalnej wartości.',
    heroImage: '/illustrations/theme-bohaterowie.png',
    heroImageAlt: 'Dziecko z dumą trzymające swoją pracę plastyczną',
    painHeadline: 'Znasz to ścisnięcie serca, gdy dziecko mówi „jestem do niczego"?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko mówi „nie umiem", zanim spróbuje. Patrzy na innych z zazdrością, mówi że jest brzydkie albo głupie. Każda porażka utwierdza je w przekonaniu, że jest gorsze.',
    painRootCause:
      'Niska samoocena u dziecka rzadko bierze się znikąd. To często suma drobnych komentarzy, porównań, niespełnionych oczekiwań. Dziecko potrzebuje doświadczenia bycia bohaterem własnej historii.',
    painCta:
      'Zamiast pochwał na siłę, daj dziecku bajkę, w której widzi swoją prawdziwą, naturalną siłę.',
    scienceHeadline: 'Dlaczego bajka buduje samoocenę dziecka?',
    scienceSubheading:
      'Bajkoterapia daje dziecku doświadczenie bycia widzianym, docenionym i ważnym — fundamentu zdrowej samooceny.',
    scienceCards: [
      {
        icon: 'fa-solid fa-star',
        title: 'Bohater = Twoje dziecko',
        description:
          'Bajka pokazuje dziecko jako bohatera, który radzi sobie z trudnościami. Mózg internalizuje tę narrację o sobie.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Mocne strony',
        description:
          'Historia podkreśla unikalne cechy dziecka. Maluch zaczyna widzieć w sobie coś wartościowego — bo bajka mu to pokazała.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mądry Lustrzany',
        description:
          'W bajce pojawia się postać, która odzwierciedla bohaterowi jego prawdziwe piękno. Dziecko uczy się patrzeć na siebie inaczej.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o odkryciu własnej wartości...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Moje dziecko nie wierzy w siebie?',
      shortDesc: 'Niska samoocena. Bajka pokaże dziecku, ile w nim siły i piękna.',
    },
  },

  // ---------------------------------------------------------------------------
  // 30. Niska Odporność na Porażkę
  // ---------------------------------------------------------------------------
  {
    slug: 'odpornosc-na-porazke',
    problemId: 'failure_resilience',
    title: 'Bajkoterapia – Dziecko Nie Znosi Przegrywać | Perfekcjonizm',
    metaDescription:
      'Płacze przy przegranej, rzuca grę, boi się błędów? Bajka pokaże, że pomyłki to część zabawy — nie powód do dramatu.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'rezygnuje przy pierwszej trudności?',
    intro:
      'Płacz przy przegranej, rzucanie planszy, perfekcjonizm. Bajka, w której Twoje dziecko jest bohaterem, pokaże, że pomyłki to nie wstyd — to ważna część każdej prawdziwej przygody.',
    heroImage: '/illustrations/theme-niepowodzenie.png',
    heroImageAlt: 'Dziecko z uśmiechem próbujące czegoś nowego mimo wcześniejszej porażki',
    painHeadline: 'Znasz to uczucie, gdy każda przegrana w grze planszowej kończy się dramatem?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko nie znosi przegrywać. Rzuca pionki, krzyczy że gra jest głupia, odmawia spróbowania jeszcze raz. Pierwsza pomyłka w rysowaniu = zgnieciona kartka. Pierwszy upadek na rowerku = koniec jazdy.',
    painRootCause:
      'Niska odporność na porażkę to często ukryty perfekcjonizm i lęk przed wstydem. Dziecko potrzebuje doświadczenia, że pomyłka nie odbiera mu wartości — wręcz przeciwnie, pokazuje odwagę próbowania.',
    painCta:
      'Zamiast pocieszania, daj dziecku historię, w której Bohater traktuje błędy jak skarby na mapie przygody.',
    scienceHeadline: 'Dlaczego bajka uczy znosić porażki lepiej niż „nie martw się"?',
    scienceSubheading:
      'Bajkoterapia pozwala dziecku przeżyć porażkę bezpiecznie i zobaczyć, co po niej następuje.',
    scienceCards: [
      {
        icon: 'fa-solid fa-mountain',
        title: 'Pomyłki to mapa',
        description:
          'Bohater popełnia błędy i odkrywa, że każdy z nich coś go nauczył. Dziecko uczy się myśleć o porażce inaczej.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje wytrwałość',
        description:
          'Bajka pokazuje, że bohater próbuje jeszcze raz. To zachowanie zostaje wbudowane w wyobraźnię dziecka.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mądry Mistrz',
        description:
          'W historii pojawia się ktoś, kto mówi: każdy mistrz zaczynał od pomyłek. Dziecko widzi błąd jako etap, nie wyrok.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o sile próbowania...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Rezygnuje przy pierwszej trudności?',
      shortDesc: 'Niska odporność na porażkę. Bajka pokaże, że pomyłki to część każdej przygody.',
    },
  },

  // ---------------------------------------------------------------------------
  // 31. Kłamstwa i Konfabulacje
  // ---------------------------------------------------------------------------
  {
    slug: 'klamstwa-konfabulacje',
    problemId: 'lying_confabulation',
    title: 'Bajkoterapia – Dziecko Kłamie i Zmyśla | Prawda i Wyobraźnia',
    metaDescription:
      'Twoje dziecko zmyśla i kłamie? To często kreatywność, nie złośliwość. Bajka pokaże różnicę między wyobraźnią a prawdą.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'zmyśla, konfabuluje i mija się z prawdą?',
    intro:
      'Konfabulacje to często czysta kreatywność, nie złośliwość. Bajka, w której Twoje dziecko jest bohaterem, pokaże mu różnicę między bogatą wyobraźnią a prawdą — bez wstydu, bez kary.',
    heroImage:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko z radością opowiadające bajkę i odkrywające moc prawdy',
    painHeadline:
      'Znasz to uczucie zaskoczenia, gdy dziecko spokojnie zmyśla niesamowite historie?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko opowiada o smoku, który był w przedszkolu. Kłamie, że umyło zęby, choć szczoteczka jest sucha. Czasem kłamie z powodów, których nie rozumiesz. Boisz się, kiedy zacząć reagować poważnie.',
    painRootCause:
      'U małych dzieci granica między fantazją a prawdą jest cienka. Czasem to czysta kreatywność, czasem strach przed konsekwencją. Dziecko potrzebuje pomocy w rozróżnieniu, kiedy bajka jest fajna, a kiedy potrzebna jest prawda.',
    painCta:
      'Zamiast karania za kłamstwo, daj dziecku historię, która pokazuje wartość prawdy i radość z bezpiecznego mówienia szczerze.',
    scienceHeadline: 'Dlaczego bajka uczy prawdomówności bez moralizowania?',
    scienceSubheading:
      'Bajkoterapia pokazuje konsekwencje obu wyborów — prawdy i kłamstwa — w bezpiecznej, fikcyjnej formie.',
    scienceCards: [
      {
        icon: 'fa-solid fa-feather',
        title: 'Granica fantazji',
        description:
          'Bajka uczy, że bajki są wspaniałe — a prawda potrzebna w prawdziwym życiu. Dziecko zaczyna te dwie krainy rozróżniać.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Bezpieczeństwo prawdy',
        description:
          'Bohater odkrywa, że gdy mówi prawdę, jest kochany — a nawet trudna prawda nie sprowadza katastrofy.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Strażnik Prawdy',
        description:
          'W bajce pojawia się postać, która pomaga rozróżniać między sercem-bajarzem a sercem-świadkiem. Dziecko uczy się, kiedy która jest potrzebna.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o sile prawdy...',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Zmyśla i kłamie?',
      shortDesc: 'Konfabulacje i kłamstwa. Bajka pokaże różnicę między wyobraźnią a prawdą.',
    },
  },

  // ---------------------------------------------------------------------------
  // 32. Śmierć w Rodzinie
  // ---------------------------------------------------------------------------
  {
    slug: 'smierc-w-rodzinie',
    problemId: 'death_in_family',
    title: 'Bajkoterapia – Jak Powiedzieć Dziecku o Śmierci | Wsparcie',
    metaDescription:
      'Ktoś bliski odszedł na zawsze? Bajka pomoże dziecku zrozumieć, że kochane osoby zostają w sercu — także gdy ich już nie ma fizycznie.',
    badge: 'Delikatne wsparcie dla całej rodziny',
    headline: 'Jak wesprzeć dziecko, gdy',
    headlineAccent: 'ktoś bliski odszedł na zawsze?',
    intro:
      'Śmierć bliskiej osoby to najtrudniejszy temat dla dziecka. Bajka, w której Twoje dziecko jest bohaterem, delikatnie pomoże mu zrozumieć, że ci, których kochamy, zostają w naszym sercu — na zawsze.',
    heroImage:
      'https://images.unsplash.com/photo-1484665754804-74b091211472?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko trzymane czule przez rodzica, w spokojnym, ciepłym świetle',
    painHeadline: 'Znasz tę chwilę, gdy musisz powiedzieć dziecku, że ktoś już nie wróci?',
    painEmpathy:
      'Rozumiemy, jak trudne to jest. Boisz się, że skrzywdzisz słowem. Twoje dziecko pyta kiedy babcia wróci, smuci się bez powodu, czasem reaguje gniewem, czasem zamyka się w sobie. Nie wiesz, jak rozmawiać o czymś, czego sama nie udźwignąłeś.',
    painRootCause:
      'Dzieci przeżywają stratę inaczej niż dorośli — w falach, czasem przez zabawę, czasem przez ciszę. Potrzebują pomocy w nazwaniu tego, co czują, i pewności, że miłość nie znika wraz z osobą.',
    painCta:
      'Zamiast trudnych rozmów, na które brakuje słów, daj dziecku historię, która delikatnie i z miłością mówi o pożegnaniu.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku przeżyć stratę?',
    scienceSubheading:
      'Bajkoterapia daje dziecku język, rytuał i bezpieczny dystans potrzebne do żałoby.',
    scienceCards: [
      {
        icon: 'fa-solid fa-dove',
        title: 'Daje słowa',
        description:
          'Bajka mówi o śmierci delikatnie, w sposób dostosowany do wieku. Dziecko zyskuje słownik, którego mu brakowało.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Miłość trwa',
        description:
          'Historia pokazuje, że osoba, która odeszła, nadal jest obecna we wspomnieniach, gestach, zwyczajach. Dziecko uczy się żywej pamięci.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Ścieżka pożegnania',
        description:
          'W bajce pojawia się rytuał — pożegnanie, latawiec puszczony w niebo, list. Dziecko może odtworzyć go w realu.',
      },
    ],
    loadingMessage: 'Tworzę bajkę pełną delikatności i miłości...',
    category: 'trudne',
    catalog: {
      emoji: '💔',
      shortTitle: 'Ktoś bliski odszedł na zawsze?',
      shortDesc: 'Śmierć w rodzinie. Bajka pomoże dziecku zrozumieć, że miłość zostaje w sercu.',
    },
  },

  // ---------------------------------------------------------------------------
  // 33. Choroba w Rodzinie
  // ---------------------------------------------------------------------------
  {
    slug: 'choroba-w-rodzinie',
    problemId: 'family_illness',
    title: 'Bajkoterapia – Choroba Bliskiej Osoby | Jak Wesprzeć Dziecko',
    metaDescription:
      'Choroba mamy, taty, dziadków budzi w dziecku lęk i bezradność. Bajka pokaże, że można być odważnym, gdy świat się zmienia.',
    badge: 'Delikatne wsparcie dla całej rodziny',
    headline: 'Jak wesprzeć dziecko, gdy',
    headlineAccent: 'ktoś w rodzinie poważnie choruje?',
    intro:
      'Choroba kogoś bliskiego budzi w dziecku lęk, którego nie umie nazwać. Bajka, w której Twoje dziecko jest bohaterem, pokaże mu, że można być dzielnym i czuć się bezpiecznie nawet wtedy, gdy świat się zmienia.',
    heroImage:
      'https://images.unsplash.com/photo-1484665754804-74b091211472?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko trzymające za rękę chorego rodzica z czułością',
    painHeadline: 'Znasz to uczucie bezradności, gdy dziecko pyta, czy mama wyzdrowieje?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko widzi, że tata jest słabszy, mama jeździ do szpitala, dziadek się zmienił. Pyta dziwne pytania, czasem reaguje gniewem, czasem nadmierną troską. Nie wiesz, ile mówić, by nie przerazić, ile ukrywać, by nie skłamać.',
    painRootCause:
      'Choroba w rodzinie zaburza poczucie bezpieczeństwa dziecka. Maluch wyczuwa niepokój dorosłych, ale nie ma narzędzi, by go zrozumieć. Potrzebuje słów dostosowanych do wieku oraz pewności, że jest kochany i bezpieczny.',
    painCta:
      'Zamiast unikania tematu, daj dziecku historię, która delikatnie nazywa to, co czuje, i daje siłę bycia razem.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku w trudnym czasie choroby bliskiego?',
    scienceSubheading:
      'Bajkoterapia daje dziecku ramy emocjonalne — wie, co czuje i wie, że jest to w porządku.',
    scienceCards: [
      {
        icon: 'fa-solid fa-heart-pulse',
        title: 'Nazywa lęk',
        description:
          'Bajka mówi o chorobie wprost, ale czule. Dziecko czuje, że nie jest w tym samo i nie musi udawać.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Daje rolę',
        description:
          'Bohater odkrywa, że może być pomocą — przytulić, narysować, być obok. Dziecko zyskuje sprawczość w trudnym czasie.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mądry Towarzysz',
        description:
          'W bajce pojawia się postać, która pomaga bohaterowi nieść ciężar. Dziecko uczy się, że można prosić o wsparcie.',
      },
    ],
    loadingMessage: 'Tworzę bajkę o sile bycia razem...',
    category: 'trudne',
    catalog: {
      emoji: '💔',
      shortTitle: 'Ktoś w rodzinie jest chory?',
      shortDesc: 'Choroba bliskiej osoby. Bajka da dziecku siłę, gdy świat się zmienia.',
    },
  },

  // ---------------------------------------------------------------------------
  // 34. Choroba Dziecka
  // ---------------------------------------------------------------------------
  {
    slug: 'choroba-dziecka',
    problemId: 'child_illness',
    title: 'Bajkoterapia – Chore Dziecko w Szpitalu | Bądź Dzielny',
    metaDescription:
      'Pobyt w szpitalu, leki, badania. Bajka da dziecku siłę i pokaże, że chorowanie nie znaczy bycie samotnym.',
    badge: 'Delikatne wsparcie dla całej rodziny',
    headline: 'Jak wesprzeć dziecko, gdy',
    headlineAccent: 'choruje i musi być dzielne?',
    intro:
      'Pobyt w szpitalu, leki, badania, długie dni w łóżku. Bajka, w której Twoje dziecko jest bohaterem, da mu siłę i pokaże, że bycie chorym nie oznacza bycia samotnym — wręcz przeciwnie.',
    heroImage:
      'https://images.unsplash.com/photo-1484665754804-74b091211472?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko w łóżku szpitalnym czytające książkę z uśmiechem',
    painHeadline: 'Znasz to uczucie bezsilności, gdy patrzysz na chore dziecko w szpitalu?',
    painEmpathy:
      'Rozumiemy, jak wyczerpujące to jest dla całej rodziny. Twoje dziecko jest osłabione, boi się badań, tęskni za domem. Pyta dlaczego ja, jest smutne, czasem rozdrażnione. Boisz się, że to doświadczenie zostawi w nim ślad na zawsze.',
    painRootCause:
      'Choroba u dziecka to nie tylko ciało — to też tożsamość, samodzielność, kontrola. Dziecko potrzebuje historii, która powie mu: jesteś bohaterem swojej drogi, nie ofiarą choroby.',
    painCta:
      'Zamiast tylko pocieszania, daj dziecku historię, w której Bohater odkrywa w sobie więcej siły, niż myślał, że ma.',
    scienceHeadline: 'Dlaczego bajka pomaga choremu dziecku?',
    scienceSubheading:
      'Bajkoterapia buduje psychologiczną odporność i daje dziecku poczucie sprawczości w czasie choroby.',
    scienceCards: [
      {
        icon: 'fa-solid fa-hospital',
        title: 'Oswaja szpital',
        description:
          'Bajka pokazuje szpital jako miejsce, w którym ludzie pomagają. Bohater odkrywa, że nawet tam można czuć się bezpiecznie.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje siłę',
        description:
          'Bohater odkrywa swoją wewnętrzną odwagę. Dziecko internalizuje narrację „jestem dzielny", co realnie pomaga w chorobie.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Niewidzialny Sojusznik',
        description:
          'W bajce pojawia się przyjaciel, który towarzyszy bohaterowi w każdym badaniu. Dziecko może wyobrażać go sobie naprawdę.',
      },
    ],
    loadingMessage: 'Tworzę bajkę o sile małego bohatera...',
    category: 'trudne',
    catalog: {
      emoji: '💔',
      shortTitle: 'Twoje dziecko choruje i musi być dzielne?',
      shortDesc:
        'Choroba dziecka. Bajka da siłę i pokaże, że chorowanie nie znaczy bycie samotnym.',
    },
  },

  // ---------------------------------------------------------------------------
  // 35. Akceptacja Odmienności Własnej
  // ---------------------------------------------------------------------------
  {
    slug: 'akceptacja-odmiennosci-wlasnej',
    problemId: 'self_acceptance',
    title: 'Bajkoterapia – Dziecko Czuje Się Inne | Akceptacja Siebie',
    metaDescription:
      'Twoje dziecko pyta dlaczego jestem inny? Bajka pokaże, że bycie wyjątkowym to supermoc — nie wada.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'czuje, że jest inne niż rówieśnicy?',
    intro:
      'Autyzm, ADHD, nadwrażliwość, a może po prostu inny temperament. Bajka, w której Twoje dziecko jest bohaterem, pokaże, że bycie wyjątkowym to nie wada — to prawdziwa supermoc.',
    heroImage:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko stojące dumnie w słońcu, świadome swojej wyjątkowości',
    painHeadline: 'Znasz to ścisnięcie serca, gdy dziecko pyta „dlaczego jestem inny"?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko widzi, że robi rzeczy inaczej niż rówieśnicy — szybciej, wolniej, intensywniej, w swoim rytmie. Słyszy komentarze, czuje, że nie pasuje. Mówi że chciałoby być takie jak inni.',
    painRootCause:
      'Bycie innym samo w sobie nie boli — boli niedopasowanie do oczekiwań i brak słów na własną wyjątkowość. Dziecko potrzebuje narracji, w której jego inność jest źródłem mocy, nie wstydu.',
    painCta:
      'Zamiast tłumaczeń, że jesteś jak inni, daj dziecku historię, w której jego unikalność staje się największą siłą.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku zaakceptować siebie?',
    scienceSubheading:
      'Bajkoterapia daje dziecku narrację o sobie, w której jego wyjątkowość ma sens i wartość.',
    scienceCards: [
      {
        icon: 'fa-solid fa-star',
        title: 'Inność = supermoc',
        description:
          'Bajka przekształca to, co dziecko widzi jako wadę, w mocną stronę bohatera. Maluch zaczyna patrzeć na siebie z dumą.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Buduje tożsamość',
        description:
          'Historia daje dziecku słowa, którymi może opisać siebie. Tożsamość rośnie z opowieści, jaką znamy o samych sobie.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Spotkanie z Sobą',
        description:
          'W bajce pojawia się postać, która rozumie bohatera bez słów. Dziecko czuje, że nie jest samo w byciu sobą.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o byciu wyjątkowym...',
    category: 'roznorodnosc',
    catalog: {
      emoji: '🌈',
      shortTitle: 'Dlaczego jestem inny niż inni?',
      shortDesc: 'Akceptacja własnej odmienności. Bajka pokaże, że inność to supermoc.',
    },
  },

  // ---------------------------------------------------------------------------
  // 36. Akceptacja Odmienności Rówieśników
  // ---------------------------------------------------------------------------
  {
    slug: 'akceptacja-odmiennosci-rowiesnikow',
    problemId: 'peer_acceptance',
    title: 'Bajkoterapia – Akceptacja Odmienności Rówieśników | Otwartość',
    metaDescription:
      'Twoje dziecko nie wie, jak reagować na niepełnosprawność lub inność rówieśnika? Bajka zbuduje zrozumienie i otwartość.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku zrozumieć, że',
    headlineAccent: 'inni mogą być inni — i to jest okej?',
    intro:
      'Dziecko na wózku w przedszkolu, kolega z aparatem słuchowym, koleżanka z autyzmem. Bajka, w której Twoje dziecko jest bohaterem, zbuduje zrozumienie, otwartość i serdeczną ciekawość.',
    heroImage:
      'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dzieci o różnym wyglądzie i sprawności bawiące się razem',
    painHeadline: 'Znasz to uczucie zakłopotania, gdy dziecko głośno pyta o czyjąś inność?',
    painEmpathy:
      'Rozumiemy. Twoje dziecko głośno pyta dlaczego on jeździ na wózku?, czemu ona tak dziwnie mówi?. Nie wiesz, jak odpowiedzieć, by ani nie skrzywdzić, ani nie zignorować pytania. Boisz się, że dziecko nie umie zauważać innych z otwartością.',
    painRootCause:
      'Dzieci nie rodzą się z uprzedzeniami, ale szybko uczą się reagować na inność lękiem lub odrzuceniem, jeśli nie dostaną innych narzędzi. Potrzebują doświadczenia, że różnorodność jest piękna i ciekawa.',
    painCta:
      'Zamiast cicho-cicho, nie pytaj, daj dziecku historię, w której bohater odkrywa, jak fascynująco różni są ludzie.',
    scienceHeadline: 'Dlaczego bajka uczy akceptacji rówieśników skuteczniej niż pouczenia?',
    scienceSubheading:
      'Bajkoterapia tworzy emocjonalne przeżycie spotkania z innością — fundament empatii i otwartości.',
    scienceCards: [
      {
        icon: 'fa-solid fa-people-group',
        title: 'Spotkanie z innością',
        description:
          'Bohater poznaje kogoś bardzo innego od siebie i zaprzyjaźnia się. Dziecko przeżywa tę przyjaźń razem z nim.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Ciekawość zamiast lęku',
        description:
          'Bajka uczy zadawania pytań z szacunkiem. Inność staje się intrygująca, nie odpychająca.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Most Empatii',
        description:
          'W historii pojawia się postać, która tłumaczy bohaterowi, jak czuje się druga osoba. Dziecko uczy się patrzeć cudzymi oczami.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o różnorodności świata...',
    category: 'roznorodnosc',
    catalog: {
      emoji: '🌈',
      shortTitle: 'Dlaczego on jeździ na wózku?',
      shortDesc: 'Akceptacja odmienności rówieśników. Bajka zbuduje zrozumienie i otwartość.',
    },
  },

  // ---------------------------------------------------------------------------
  // 37. Wykluczenie Rówieśnicze
  // ---------------------------------------------------------------------------
  {
    slug: 'wykluczenie-rowiesnicze',
    problemId: 'peer_exclusion',
    title: 'Bajkoterapia – Dziecko Wykluczone w Grupie | Nikt Nie Chce Się Bawić',
    metaDescription:
      'Twoje dziecko mówi „nikt nie chce się ze mną bawić"? Bajka pomoże mu znaleźć siłę, wiarę w siebie i miejsce wśród rówieśników.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku, gdy',
    headlineAccent: 'czuje się wykluczone w grupie rówieśniczej?',
    intro:
      'Wykluczenie boli. Bajka, w której Twoje dziecko jest bohaterem, pomoże mu odzyskać wiarę w siebie i znaleźć swoje miejsce — także w grupach, które wcześniej go odrzucały.',
    heroImage:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko odważnie podchodzące do nowej grupy z uśmiechem',
    painHeadline: 'Znasz to bolesne wyznanie: „Mamo, nikt nie chce się ze mną bawić"?',
    painEmpathy:
      'Rozumiemy, jak rozdziera serce ten moment. Twoje dziecko wraca z przedszkola smutne. Mówi, że Zosia powiedziała, że jej nie lubi. Inne dzieci się od niego odsuwają. Patrzysz na to bezsilnie i nie wiesz, jak pomóc.',
    painRootCause:
      'Wykluczenie rówieśnicze rzadko jest winą dziecka — częściej to dynamika grupy. Ale dziecko bierze to do siebie. Potrzebuje narracji, w której jest wartościowe niezależnie od tego, co mówi grupa.',
    painCta:
      'Zamiast pocieszania, daj dziecku historię, w której Bohater odkrywa swoją wartość — niezależnie od tego, kto go nie zauważa.',
    scienceHeadline: 'Dlaczego bajka pomaga dziecku przeżyć wykluczenie?',
    scienceSubheading:
      'Bajkoterapia odbudowuje wewnętrzne poczucie wartości, które fundamentalnie odporne na zewnętrzne odrzucenie.',
    scienceCards: [
      {
        icon: 'fa-solid fa-seedling',
        title: 'Wartość od środka',
        description:
          'Bajka pokazuje, że wartość bohatera nie zależy od grupy. Dziecko uczy się, że może się sobie podobać niezależnie od opinii.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Strategie społeczne',
        description:
          'Bohater odkrywa, jak znaleźć innych, którzy go zauważą i polubią. Dziecko zyskuje praktyczne wskazówki.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Pierwszy Sojusznik',
        description:
          'W bajce ktoś dostrzega bohatera mimo opinii grupy. Dziecko uczy się, że wystarczy jedna osoba — i wszystko może się zmienić.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o sile bycia sobą...',
    category: 'roznorodnosc',
    catalog: {
      emoji: '🌈',
      shortTitle: 'Nikt nie chce się ze mną bawić?',
      shortDesc:
        'Wykluczenie rówieśnicze. Bajka pomoże dziecku odzyskać siłę i znaleźć swoje miejsce.',
    },
  },

  // ---------------------------------------------------------------------------
  // 38. Zrozumienie Celu Nauki
  // ---------------------------------------------------------------------------
  {
    slug: 'zrozumienie-celu-nauki',
    problemId: 'learning_motivation',
    title: 'Bajkoterapia – Po Co Mi Ta Szkoła? | Motywacja do Nauki',
    metaDescription:
      'Twoje dziecko pyta po co mi szkoła? Bajka pokaże, że uczenie się to fascynująca przygoda odkrywania świata.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pokazać dziecku, że',
    headlineAccent: 'nauka to przygoda, a nie kara?',
    intro:
      'Po co mi to wszystko? Bajka, w której Twoje dziecko jest bohaterem, pokaże mu, że uczenie się to nie obowiązek — to klucz do skarbów świata, które same czekają na odkrycie.',
    heroImage:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko z otwartą książką, w oczach iskra ciekawości',
    painHeadline: 'Znasz to pytanie zniechęcenia: „Mamo, po co mi ta cała szkoła?"',
    painEmpathy:
      'Rozumiemy. Twoje dziecko mówi że szkoła jest nudna, że to wszystko bez sensu. Każde zadanie domowe to dramat, każda lektura to przymus. Boisz się, że gaśnie w nim ciekawość, którą miało jako maluch.',
    painRootCause:
      'Dzieci rodzą się ciekawe — szkolny system czasem to gasi. Dziecko potrzebuje doświadczenia, że uczenie się to nie zlecone zadanie, ale moc otwierająca drzwi do tego, co je naprawdę interesuje.',
    painCta:
      'Zamiast moralizowania o przyszłości, daj dziecku historię, w której Bohater odkrywa, że wiedza to magiczne narzędzie.',
    scienceHeadline: 'Dlaczego bajka rozpala motywację do nauki?',
    scienceSubheading:
      'Bajkoterapia łączy uczenie się z ekscytacją i znaczeniem — najsilniejszymi motywatorami w mózgu dziecka.',
    scienceCards: [
      {
        icon: 'fa-solid fa-book-open',
        title: 'Nauka = klucz',
        description:
          'Bajka pokazuje, jak konkretna wiedza pomaga bohaterowi rozwiązać przygodę. Nauka zyskuje sens i smak zwycięstwa.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Odkrywanie zamiast nudy',
        description:
          'Bohater traktuje świat jak zagadkę do rozszyfrowania. Dziecko zaczyna patrzeć na lekcje przez ten sam pryzmat.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Mistrz Pytań',
        description:
          'W bajce pojawia się postać, która uczy zadawać dobre pytania. Dziecko odkrywa, że ciekawość to siła.',
      },
    ],
    loadingMessage: 'Tworzę magiczną bajkę o radości odkrywania...',
    category: 'roznorodnosc',
    catalog: {
      emoji: '🌈',
      shortTitle: 'Po co mi ta szkoła?',
      shortDesc: 'Zrozumienie celu nauki. Bajka pokaże, że uczenie się to odkrywanie świata.',
    },
  },
];

/**
 * All valid topic slugs, useful for SSG prerendering.
 */
export const TOPIC_SLUGS = TOPICS.map((t) => t.slug);

/**
 * Lookup a topic by its URL slug.
 */
export function getTopicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

/**
 * Filter topics for the catalog grid by category, or 'all' for everything.
 */
export function topicsByCategory(category: CatalogCategory | 'all'): Topic[] {
  if (category === 'all') return TOPICS;
  return TOPICS.filter((t) => t.category === category);
}
