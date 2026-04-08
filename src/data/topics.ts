/**
 * Topic landing page data extracted from HTML prototypes in docs/prototypes/.
 * Each topic corresponds to a SEO landing page for a specific parenting challenge.
 */

export interface ScienceCard {
  icon: string;
  title: string;
  description: string;
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
}

export const TOPICS: Topic[] = [
  // ---------------------------------------------------------------------------
  // 1. Adaptacja Przedszkolna
  // ---------------------------------------------------------------------------
  {
    slug: 'adaptacja-przedszkolna',
    problemId: 'fear_of_separation',
    title: 'Bajkoterapia – Dziecko Nie Chce Iść do Przedszkola | Adaptacja',
    metaDescription:
      'Łzy przy bramce, kurczowe trzymanie za rękę – bajkoterapia zamienia przedszkole w ekscytującą przygodę i oswaja lęk separacyjny.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku polubić przedszkole, gdy',
    headlineAccent: 'płacze przy każdym pożegnaniu?',
    intro:
      'Łzy przy bramce, kurczowe trzymanie za rękę, błagalne nie zostawiaj mnie – to boli oboje. Bajka, w której Twoje dziecko jest bohaterem, zamienia przedszkole w ekscytującą przygodę i oswaja lęk separacyjny.',
    heroImage:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
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
  },

  // ---------------------------------------------------------------------------
  // 2. Bajkoterapia Personalizowana Ogólna
  // ---------------------------------------------------------------------------
  {
    slug: 'bajkoterapia-ogolna',
    problemId: null,
    title: 'Bajkoterapia – Spersonalizowana Bajka Terapeutyczna dla Dziecka',
    metaDescription:
      'Każde dziecko ma swoje wyzwania. Bajkoterapia dopasowuje historię do konkretnego imienia, wyglądu i problemu Twojego malucha.',
    badge: 'Najlepsza personalizowana bajka terapeutyczna',
    headline: 'Spersonalizowana bajka terapeutyczna,',
    headlineAccent: 'w której Twoje dziecko jest bohaterem',
    intro:
      'Każde dziecko ma swoje wyzwania. Bajkoterapia dopasowuje historię do konkretnego imienia, wyglądu i problemu Twojego malucha. Naukowe podejście, magiczny efekt – gotowe w 15 minut.',
    heroImage:
      'https://images.unsplash.com/photo-1512253022256-19f4cb92a4dc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    heroImageAlt: 'Dziecko z magiczną spersonalizowaną książką',
    painHeadline: 'Szukasz bajki terapeutycznej, która naprawdę zadziała na Twoje dziecko?',
    painEmpathy:
      'Zwykłe bajki terapeutyczne dla dzieci są ogólne – mówią o jakimś Jasiu lub Zosi. Personalizowana książka dla dziecka to coś zupełnie innego. Gdy maluch słyszy własne imię – magia się zaczyna.',
    painRootCause:
      'Każde wyzwanie wychowawcze jest inne. Nasza platforma dopasowuje treść bajki do problemu, który aktualnie przeżywa Twoje dziecko – czy to złość, lęk, czy trudności z adaptacją.',
    painCta: 'Daj dziecku Jego własną historię – i obserwuj, jak zaczyna ją żyć naprawdę.',
    scienceHeadline: 'Dlaczego spersonalizowana bajkoterapia działa lepiej niż ogólne bajki?',
    scienceSubheading:
      'Spersonalizowana bajkoterapia opiera się na udowodnionym naukowo Efekcie Odniesienia do Ja (Self-Reference Effect).',
    scienceCards: [
      {
        icon: 'fa-solid fa-user-astronaut',
        title: 'Twoje dziecko = bohater',
        description:
          'Imię, wygląd, ulubiona zabawka – wszystko wplecione w opowieść. Mózg dziecka przetwarza tę historię jako swoją własną.',
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Dopasowany temat',
        description:
          'Wybierasz problem, który aktualnie dotyczy Twojego dziecka. Bajka zawiera psychoedukacyjne rozwiązanie ukryte w fabule.',
      },
      {
        icon: 'fa-solid fa-hat-wizard',
        title: 'Ilustracje 3D',
        description:
          'Każda bajka zawiera 5 oryginalnych ilustracji 3D ze spersonalizowaną postacią dziecka – z pełną spójnością wizualną.',
      },
    ],
    loadingMessage: 'Tworzę Twoją wyjątkową spersonalizowaną bajkę...',
  },

  // ---------------------------------------------------------------------------
  // 3. Bije Inne Dzieci
  // ---------------------------------------------------------------------------
  {
    slug: 'bicie-innych',
    problemId: 'bullying',
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
  },

  // ---------------------------------------------------------------------------
  // 4. Bunt i Odmowa Współpracy
  // ---------------------------------------------------------------------------
  {
    slug: 'bunt-odmowa-wspolpracy',
    problemId: 'tantrums',
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
  },

  // ---------------------------------------------------------------------------
  // 5. Częste Pobudki Nocne
  // ---------------------------------------------------------------------------
  {
    slug: 'czeste-pobudki-nocne',
    problemId: 'fear_of_dark',
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
  },

  // ---------------------------------------------------------------------------
  // 6. Mycie Zębów
  // ---------------------------------------------------------------------------
  {
    slug: 'mycie-zebow',
    problemId: null,
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
  },

  // ---------------------------------------------------------------------------
  // 7. Nadwrażliwość Sensoryczna
  // ---------------------------------------------------------------------------
  {
    slug: 'nadwrazliwosc-sensoryczna',
    problemId: null,
    title: 'Bajkoterapia – Nadwrażliwość Sensoryczna u Dziecka',
    metaDescription:
      'Twoje dziecko zatyka uszy, boi się głośnych dźwięków lub tłumów? Bajkoterapia uczy malucha rozumieć swoje zmysły.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak pomóc dziecku z',
    headlineAccent: 'nadwrażliwością na dźwięki i bodźce?',
    intro:
      'Twoje dziecko zatyka uszy, boi się głośnych dźwięków lub tłumów? Pomóż mu poczuć się bezpiecznie dzięki bajce, w której ONO jest bohaterem. Bajkoterapia uczy malucha rozumieć swoje zmysły – bez paniki, bez ucieczki.',
    heroImage:
      'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
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
    heroImage:
      'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
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
    heroImage:
      'https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
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
  },

  // ---------------------------------------------------------------------------
  // 11. Rozwód Rodziców
  // ---------------------------------------------------------------------------
  {
    slug: 'rozwod-rodzicow',
    problemId: null,
    title: 'Bajkoterapia – Jak Pomóc Dziecku Przeżyć Rozwód Rodziców',
    metaDescription:
      'Rozwód to trudny czas – szczególnie dla dzieci. Bajkoterapia daje dziecku słowa, bezpieczeństwo i nadzieję.',
    badge: 'Delikatne wsparcie dla całej rodziny',
    headline: 'Jak wesprzeć dziecko emocjonalnie, gdy',
    headlineAccent: 'rodzina przechodzi przez rozstanie lub rozwód?',
    intro:
      'Rozwód to trudny czas – szczególnie dla dzieci, które nie rozumieją dlaczego ich świat się zmienił. Bajka, w której Twoje dziecko jest bohaterem, daje mu słowa, bezpieczeństwo i nadzieję.',
    heroImage:
      'https://images.unsplash.com/photo-1484665754804-74b091211472?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
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
  },

  // ---------------------------------------------------------------------------
  // 12. Rywalizacja Rodzeństwo
  // ---------------------------------------------------------------------------
  {
    slug: 'rywalizacja-rodzenstwo',
    problemId: 'jealousy_sibling',
    title: 'Bajkoterapia – Rywalizacja i Konflikty Między Rodzeństwem',
    metaDescription:
      'Koniec z ciągłymi wojnami o zabawki i uwagę. Bajkoterapia buduje empatię i uczy współpracy między rodzeństwem.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak zatrzymać kłótnie, gdy',
    headlineAccent: 'rodzeństwo ciągle się bije i rywalizuje?',
    intro:
      'Koniec z ciągłymi wojnami o zabawki i uwagę. Pomóż dzieciom nauczyć się współpracy dzięki bajce, w której Twoje dziecko jest bohaterem. Bajkoterapia buduje empatię i uczy, jak być przyjacielem nawet dla brata czy siostry.',
    heroImage:
      'https://images.unsplash.com/photo-1517026575980-3e1e2dedeab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
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
  },

  // ---------------------------------------------------------------------------
  // 13. Samodzielne Zasypianie
  // ---------------------------------------------------------------------------
  {
    slug: 'samodzielne-zasypianie',
    problemId: 'fear_of_dark',
    title: 'Bajkoterapia – Nauka Samodzielnego Zasypiania | Dziecko Nie Śpi Samo',
    metaDescription:
      'Godziny przy łóżku, przenosiny w środku nocy. Bajkoterapia buduje pewność siebie i oswaja własny pokój. Krok po kroku, bez łez.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak nauczyć dziecko zasypiać samodzielnie, gdy',
    headlineAccent: 'nie chce spać w swoim pokoju?',
    intro:
      'Godziny przy łóżku, przenosiny w środku nocy, bezsenność dla całej rodziny. Bajka, w której Twoje dziecko jest bohaterem, buduje pewność siebie i oswaja własny pokój. Krok po kroku, bez łez.',
    heroImage:
      'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
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
  },

  // ---------------------------------------------------------------------------
  // 14. Trudności z Zasypianiem
  // ---------------------------------------------------------------------------
  {
    slug: 'trudnosci-z-zasypianiem',
    problemId: 'fear_of_dark',
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
  },

  // ---------------------------------------------------------------------------
  // 15. Wybiórczość Pokarmowa
  // ---------------------------------------------------------------------------
  {
    slug: 'wybiorczos-pokarmowa',
    problemId: 'picky_eating',
    title: 'Bajkoterapia – Niejadek i Wybiórczość Pokarmowa',
    metaDescription:
      'Koniec z wojnami przy stole. Bajkoterapia zmienia stosunek malucha do jedzenia – bez wymuszania, bez stresu.',
    badge: 'Metoda oparta na badaniach',
    headline: 'Jak zachęcić niejadka, gdy',
    headlineAccent: 'dziecko odmawia prawie wszystkiego?',
    intro:
      'Koniec z wojnami przy stole. Pomóż dziecku odkryć, że jedzenie to przygoda, dzięki bajce, w której ONO jest bohaterem. Bajkoterapia zmienia stosunek malucha do jedzenia – bez wymuszania, bez stresu.',
    heroImage:
      'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
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
