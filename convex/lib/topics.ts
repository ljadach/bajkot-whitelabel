/**
 * Topic catalog — the problems a parent can pick a book for.
 *
 * Shared by the frontend (topic picker, order form) and the backend. The
 * `problemId` is what the pipeline receives; it keys the per-problem data in
 * lib/bookData.ts (titles in e-mails) and the prompts' guidance.
 */

export type CatalogCategory =
  | 'sen'
  | 'emocje'
  | 'higiena'
  | 'relacje'
  | 'leki'
  | 'trudne'
  | 'roznorodnosc';

export const CATALOG_CATEGORIES: readonly { id: CatalogCategory; label: string; emoji: string }[] =
  [
    { id: 'sen', label: 'Sen i Wieczór', emoji: '🌙' },
    { id: 'emocje', label: 'Emocje i Zachowanie', emoji: '😤' },
    { id: 'higiena', label: 'Higiena i Nawyki', emoji: '🧼' },
    { id: 'relacje', label: 'Relacje i Rodzeństwo', emoji: '👫' },
    { id: 'leki', label: 'Lęki i Odwaga', emoji: '🦁' },
    { id: 'trudne', label: 'Trudne Sytuacje', emoji: '💔' },
    { id: 'roznorodnosc', label: 'Różnorodność', emoji: '🌈' },
  ];

export interface Topic {
  /** URL slug of the order form: /zamow/<slug>. */
  slug: string;
  /** Problem key sent to the pipeline. Unique across topics. */
  problemId: string;
  category: CatalogCategory;
  /** Card content: emoji, headline, one-line description. */
  catalog: {
    emoji: string;
    shortTitle: string;
    shortDesc: string;
  };
}

export const TOPICS: readonly Topic[] = [
  {
    slug: 'adaptacja-przedszkolna',
    problemId: 'preschool_adaptation',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Nie chce iść do przedszkola?',
      shortDesc: 'Adaptacja przedszkolna. Historia pomoże oswoić nowe miejsce i nowych ludzi.',
    },
  },
  {
    slug: 'bicie-innych',
    problemId: 'physical_aggression',
    category: 'emocje',
    catalog: {
      emoji: '😤',
      shortTitle: 'Bije, gryzie, kopie?',
      shortDesc:
        'Agresywne zachowania u małych dzieci. Historia pokaże inne sposoby wyrażania emocji.',
    },
  },
  {
    slug: 'bunt-odmowa-wspolpracy',
    problemId: 'defiance',
    category: 'emocje',
    catalog: {
      emoji: '😤',
      shortTitle: 'Ciągle mówi NIE?',
      shortDesc:
        'Bunt i odmowa współpracy. Bajka pomoże dziecku zrozumieć zasady i znaleźć kompromis.',
    },
  },
  {
    slug: 'czeste-pobudki-nocne',
    problemId: 'night_wakings',
    category: 'sen',
    catalog: {
      emoji: '🌙',
      shortTitle: 'Budzi się w nocy z płaczem?',
      shortDesc:
        'Nocne pobudki, koszmary i lęk przed ciemnością. Historia, która da dziecku poczucie bezpieczeństwa nocą.',
    },
  },
  {
    slug: 'mycie-zebow',
    problemId: 'tooth_brushing',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Mycie zębów to codzienne pole bitwy?',
      shortDesc: 'Higiena jamy ustnej jako walka. Historia zamieni mycie zębów w zabawną przygodę.',
    },
  },
  {
    slug: 'nadwrazliwosc-sensoryczna',
    problemId: 'sensory_sensitivity',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Zatyka uszy, boi się burzy lub tłumu?',
      shortDesc:
        'Nadwrażliwość sensoryczna. Bajka pomoże dziecku radzić sobie z głośnymi dźwiękami.',
    },
  },
  {
    slug: 'napady-zlosci',
    problemId: 'tantrums',
    category: 'emocje',
    catalog: {
      emoji: '😤',
      shortTitle: 'Wybuchy złości, których nie da się opanować?',
      shortDesc:
        'Napady histerii i frustracji. Bajka nauczy dziecko rozpoznawać i oswajać trudne emocje.',
    },
  },
  {
    slug: 'niesmialosci',
    problemId: 'shyness',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Nie chce się bawić z innymi dziećmi?',
      shortDesc: 'Wycofanie społeczne. Historia pokaże, jak fajnie jest mieć przyjaciół.',
    },
  },
  {
    slug: 'odpieluchowanie',
    problemId: 'potty_training',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Nocnik? Nie, dziękuję!',
      shortDesc:
        'Nauka korzystania z nocnika. Bajka przedstawi nocnik jako naturalny krok w dorastaniu.',
    },
  },
  {
    slug: 'rozwod-rodzicow',
    problemId: 'parents_divorce',
    category: 'trudne',
    catalog: {
      emoji: '💔',
      shortTitle: 'Rodzice się rozstają?',
      shortDesc:
        'Rozwód lub rozstanie rodziców. Bajka da dziecku poczucie bezpieczeństwa i miłości.',
    },
  },
  {
    slug: 'rywalizacja-rodzenstwo',
    problemId: 'sibling_rivalry',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Kto jest ważniejszy — ja czy brat?',
      shortDesc:
        'Rywalizacja między rodzeństwem. Bajka pokaże, że miłość rodziców nie dzieli się na pół.',
    },
  },
  {
    slug: 'samodzielne-zasypianie',
    problemId: 'independent_sleep',
    category: 'sen',
    catalog: {
      emoji: '🌙',
      shortTitle: 'Pora na własne łóżeczko?',
      shortDesc:
        'Przejście do własnego łóżka. Bajka pokaże dziecku, że własne łóżeczko to bezpieczne miejsce.',
    },
  },
  {
    slug: 'trudnosci-z-zasypianiem',
    problemId: 'bedtime_resistance',
    category: 'sen',
    catalog: {
      emoji: '🌙',
      shortTitle: 'Twoje dziecko nie chce iść spać?',
      shortDesc:
        'Wieczorne bitwy o sen. Bajka pomoże dziecku zrozumieć, że pora snu może być przygodą.',
    },
  },
  {
    slug: 'wybiorczos-pokarmowa',
    problemId: 'food_selectivity',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Je tylko 3 rzeczy?',
      shortDesc:
        'Wybiórczość pokarmowa i niejadek. Bajka zachęci dziecko do próbowania nowych smaków.',
    },
  },
  {
    slug: 'wstrzymywanie-potrzeb',
    problemId: 'toilet_holding',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Nie chce iść do toalety?',
      shortDesc:
        'Wstrzymywanie potrzeb to częsty problem. Bajka pomoże dziecku oswoić się z ciałem.',
    },
  },
  {
    slug: 'lek-przed-kapiela',
    problemId: 'bath_anxiety',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Boi się wody i mycia głowy?',
      shortDesc:
        'Lęk przed kąpielą i prysznicem. Bajka pomoże oswoić wodę i zamienić mycie w zabawę.',
    },
  },
  {
    slug: 'poranna-organizacja',
    problemId: 'morning_routine',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Rano nic nie idzie na czas?',
      shortDesc: 'Poranna organizacja. Bajka nauczy małego bohatera, jak ogarnąć poranek.',
    },
  },
  {
    slug: 'czas-ekranowy',
    problemId: 'screen_time_management',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Nie mogę mu zabrać tableta?',
      shortDesc:
        'Zarządzanie czasem ekranowym. Bajka pokaże, że poza ekranem jest pełno fajnych rzeczy.',
    },
  },
  {
    slug: 'odstawienie-smoczka',
    problemId: 'pacifier_weaning',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Pora pożegnać się ze smoczkiem?',
      shortDesc: 'Odstawienie smoczka lub butelki. Bajka zamieni pożegnanie w odważną przygodę.',
    },
  },
  {
    slug: 'nowe-rodzenstwo',
    problemId: 'new_sibling',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'W rodzinie pojawia się maluszek?',
      shortDesc:
        'Pojawienie się rodzeństwa. Bajka pomoże starszemu dziecku znaleźć się w nowej roli.',
    },
  },
  {
    slug: 'dzielenie-sie',
    problemId: 'sharing_difficulty',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Moje! Nie dam!',
      shortDesc: 'Trudność z dzieleniem się. Bajka pokaże, że wspólna zabawa może być fajniejsza.',
    },
  },
  {
    slug: 'empatia-rozumienie-emocji',
    problemId: 'empathy_building',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Nie zauważa cudzych emocji?',
      shortDesc: 'Rozwijanie empatii. Bajka pomoże dziecku zrozumieć, co czują inni.',
    },
  },
  {
    slug: 'pierwsze-przyjaznie',
    problemId: 'first_friendships',
    category: 'relacje',
    catalog: {
      emoji: '👫',
      shortTitle: 'Jak budować pierwsze przyjaźnie?',
      shortDesc:
        'Pierwsze relacje z rówieśnikami. Bajka pokaże, że pierwszy krok jest najważniejszy.',
    },
  },
  {
    slug: 'lek-separacyjny',
    problemId: 'separation_anxiety',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Nie zostawiaj mnie!',
      shortDesc: 'Lęk separacyjny. Bajka pomoże dziecku poczuć, że miłość trwa nawet na odległość.',
    },
  },
  {
    slug: 'lek-przed-ciemnoscia',
    problemId: 'fear_of_dark',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Boi się ciemności?',
      shortDesc:
        'Lęk przed ciemnością. Bajka pomoże dziecku odkryć, że ciemność może być przyjazna.',
    },
  },
  {
    slug: 'lek-przed-lekarzem',
    problemId: 'medical_anxiety',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Panikuje u lekarza?',
      shortDesc:
        'Lęk przed zabiegami medycznymi. Bajka oswoi wizytę i zamieni ją w odważną przygodę.',
    },
  },
  {
    slug: 'przeprowadzka',
    problemId: 'relocation',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Przeprowadzka — nowy dom, nowy świat?',
      shortDesc:
        'Zmiana miejsca zamieszkania. Bajka pomoże odkryć, że dom jest tam, gdzie rodzina.',
    },
  },
  {
    slug: 'niska-samoocena',
    problemId: 'low_self_esteem',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Moje dziecko nie wierzy w siebie?',
      shortDesc: 'Niska samoocena. Bajka pokaże dziecku, ile w nim siły i piękna.',
    },
  },
  {
    slug: 'odpornosc-na-porazke',
    problemId: 'failure_resilience',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Rezygnuje przy pierwszej trudności?',
      shortDesc: 'Niska odporność na porażkę. Bajka pokaże, że pomyłki to część każdej przygody.',
    },
  },
  {
    slug: 'klamstwa-konfabulacje',
    problemId: 'lying_confabulation',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Zmyśla i kłamie?',
      shortDesc: 'Konfabulacje i kłamstwa. Bajka pokaże różnicę między wyobraźnią a prawdą.',
    },
  },
  {
    slug: 'smierc-w-rodzinie',
    problemId: 'death_in_family',
    category: 'trudne',
    catalog: {
      emoji: '💔',
      shortTitle: 'Ktoś bliski odszedł na zawsze?',
      shortDesc: 'Śmierć w rodzinie. Bajka pomoże dziecku zrozumieć, że miłość zostaje w sercu.',
    },
  },
  {
    slug: 'choroba-w-rodzinie',
    problemId: 'family_illness',
    category: 'trudne',
    catalog: {
      emoji: '💔',
      shortTitle: 'Ktoś w rodzinie jest chory?',
      shortDesc: 'Choroba bliskiej osoby. Bajka da dziecku siłę, gdy świat się zmienia.',
    },
  },
  {
    slug: 'choroba-dziecka',
    problemId: 'child_illness',
    category: 'trudne',
    catalog: {
      emoji: '💔',
      shortTitle: 'Twoje dziecko choruje i musi być dzielne?',
      shortDesc:
        'Choroba dziecka. Bajka da siłę i pokaże, że chorowanie nie znaczy bycie samotnym.',
    },
  },
  {
    slug: 'akceptacja-odmiennosci-wlasnej',
    problemId: 'self_acceptance',
    category: 'roznorodnosc',
    catalog: {
      emoji: '🌈',
      shortTitle: 'Dlaczego jestem inny niż inni?',
      shortDesc: 'Akceptacja własnej odmienności. Bajka pokaże, że inność to supermoc.',
    },
  },
  {
    slug: 'akceptacja-odmiennosci-rowiesnikow',
    problemId: 'peer_acceptance',
    category: 'roznorodnosc',
    catalog: {
      emoji: '🌈',
      shortTitle: 'Dlaczego on jeździ na wózku?',
      shortDesc: 'Akceptacja odmienności rówieśników. Bajka zbuduje zrozumienie i otwartość.',
    },
  },
  {
    slug: 'wykluczenie-rowiesnicze',
    problemId: 'peer_exclusion',
    category: 'roznorodnosc',
    catalog: {
      emoji: '🌈',
      shortTitle: 'Nikt nie chce się ze mną bawić?',
      shortDesc:
        'Wykluczenie rówieśnicze. Bajka pomoże dziecku odzyskać siłę i znaleźć swoje miejsce.',
    },
  },
  {
    slug: 'zrozumienie-celu-nauki',
    problemId: 'learning_motivation',
    category: 'roznorodnosc',
    catalog: {
      emoji: '🌈',
      shortTitle: 'Po co mi ta szkoła?',
      shortDesc: 'Zrozumienie celu nauki. Bajka pokaże, że uczenie się to odkrywanie świata.',
    },
  },
  {
    slug: 'moczenie-nocne',
    problemId: 'bedwetting',
    category: 'higiena',
    catalog: {
      emoji: '🧼',
      shortTitle: 'Moczy się w nocy?',
      shortDesc: 'Moczenie nocne. Bajka zdejmie wstyd i presję, które podtrzymują problem.',
    },
  },
  {
    slug: 'wizyta-w-szpitalu',
    problemId: 'hospital_stay',
    category: 'leki',
    catalog: {
      emoji: '🦁',
      shortTitle: 'Czeka je pobyt w szpitalu?',
      shortDesc: 'Wizyta w szpitalu. Bajka oswoi oddział, badania i rozłąkę — zanim się wydarzą.',
    },
  },
];

export function getTopicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

/** Topics of one catalog tab, or every topic for 'all'. */
export function topicsByCategory(category: CatalogCategory | 'all'): readonly Topic[] {
  if (category === 'all') return TOPICS;
  return TOPICS.filter((t) => t.category === category);
}
