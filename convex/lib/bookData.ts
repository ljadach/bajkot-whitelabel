/**
 * Problems catalog and appearance options for the book pipeline.
 * Ported from trustee-book-pipeline/demo/src/data/problems.ts.
 *
 * Keys are used as IDs in bookOrders form fields (problemId, hairColor, etc.).
 * Polish labels are for the order form UI; English values are for LLM prompts.
 */

import type { OutfitDefinition, ProblemDefinition, StyleDefinition } from './bookTypes';

// ── Problem Categories ───────────────────────────

export const PROBLEM_CATEGORIES: Record<string, string> = {
  fears: 'Lęki i obawy',
  emotions: 'Emocje i zachowanie',
  social: 'Relacje społeczne',
  routine: 'Nawyki i codzienność',
  change: 'Zmiany w życiu',
  general: 'Wsparcie ogólne',
};

// ── Problems ─────────────────────────────────────

export const PROBLEMS: Record<string, ProblemDefinition> = {
  // === fears ===
  fear_of_dark: {
    title_pl: 'Lęk przed ciemnością',
    context_pl:
      'Dziecko boi się braku kontroli. Pokaż, że ciemność kryje ciekawe rzeczy, nie straszne.',
    metaphor_pl: 'Latarka zmieniająca cienie w przyjazne zwierzęta. Strażnik Snów.',
    category: 'fears',
  },
  fear_of_doctor: {
    title_pl: 'Lęk przed lekarzem / szpitalem',
    context_pl:
      'Dziecko odczuwa lęk przed nieznanym środowiskiem medycznym i bólem. Pokaż lekarza jako sojusznika, a narzędzia jako magiczne pomocniki.',
    metaphor_pl:
      'Szpital to warsztat naprawczy superbohaterów, a stetoskop słucha historii serca. Doktor Iskierka.',
    category: 'fears',
  },
  fear_of_separation: {
    title_pl: 'Lęk separacyjny',
    context_pl:
      'Dziecko boi się rozłąki z opiekunem. Pokaż, że miłość nie znika gdy rodzic wychodzi — zawsze wraca.',
    metaphor_pl:
      'Niewidzialna nitka łącząca serca dziecka i rodzica, świecąca nawet przez ściany. Elfik Powrócik.',
    category: 'fears',
  },
  fear_of_monsters: {
    title_pl: 'Lęk przed potworami',
    context_pl:
      'Dziecko widzi zagrożenia w cieniach i dźwiękach. Pokaż, że potwory można oswoić — wyobraźnia działa w dwie strony.',
    metaphor_pl:
      'Potwory to zagubione, nieśmiałe stworzenia potrzebujące przyjaciela. Potworek Mrumś.',
    category: 'fears',
  },

  // === emotions ===
  tantrums: {
    title_pl: 'Napady złości / trudności z regulacją emocji',
    context_pl:
      'Dziecko nie umie jeszcze zarządzać silnymi emocjami. Pokaż, że złość to sygnał, nie wróg.',
    metaphor_pl: 'Wulkan emocji, który można oswoić oddechem.',
    category: 'emotions',
  },
  jealousy_sibling: {
    title_pl: 'Zazdrość o rodzeństwo',
    context_pl:
      'Dziecko czuje, że traci pozycję i miłość rodziców. Pokaż, że miłość się mnoży, nie dzieli.',
    metaphor_pl:
      'Serce rodzica to magiczny ogród — im więcej kwiatów, tym piękniejszy. Wróżka Dośćdlawszystkich.',
    category: 'emotions',
  },
  low_self_esteem: {
    title_pl: 'Niska samoocena',
    context_pl:
      'Dziecko nie wierzy w swoje możliwości. Pokaż mu unikalne talenty i siłę, którą już ma.',
    metaphor_pl: 'Magiczne lustro pokazujące ukryte supermoce dziecka. Kameleon Kolorusz.',
    category: 'emotions',
  },

  // === social ===
  shyness: {
    title_pl: 'Nieśmiałość',
    context_pl:
      'Dziecko chce uczestniczyć, ale boi się odrzucenia. Pokaż, że pierwszy krok jest najtrudniejszy — a potem robi się łatwiej.',
    metaphor_pl: 'Muszla, z której wychodzi perła dopiero gdy się otworzy. Ślimak Odważniak.',
    category: 'social',
  },
  sharing_difficulty: {
    title_pl: 'Trudności z dzieleniem się',
    context_pl:
      'Dziecko broni swoich rzeczy ze strachu przed utratą. Pokaż, że dzielenie się tworzy więcej radości, nie mniej.',
    metaphor_pl:
      'Magiczny plecak — im więcej z niego dajesz, tym więcej się w nim pojawia. Chomik Dzieluszek.',
    category: 'social',
  },
  bullying: {
    title_pl: 'Dokuczanie / bycie ofiarą przemocy rówieśniczej',
    context_pl:
      'Dziecko doświadcza wykluczenia lub agresji. Pokaż siłę w proszeniu o pomoc i budowaniu sojuszów.',
    metaphor_pl:
      'Tarcza odwagi, która rośnie gdy się o nią poprosisz — rycerze nigdy nie walczą sami. Rycerz Sojusz.',
    category: 'social',
  },

  // === routine ===
  picky_eating: {
    title_pl: 'Niejadek / wybiórczość pokarmowa',
    context_pl:
      'Dziecko odmawia jedzenia lub je bardzo wybiórczo. Pokaż jedzenie jako przygodę, nie obowiązek.',
    metaphor_pl: 'Magiczna kuchnia, gdzie każdy smak to nowa kraina. Kucharz Zdzichu.',
    category: 'routine',
  },
  potty_training: {
    title_pl: 'Nauka korzystania z nocnika / toalety',
    context_pl:
      'Dziecko opiera się lub boi nowego etapu. Pokaż nocnik jako „tron" przygody, nie obowiązek.',
    metaphor_pl: 'Magiczny tron, na którym siada każdy prawdziwy odkrywca. Żabka Plusik.',
    category: 'routine',
  },
  screen_addiction: {
    title_pl: 'Nadmierne przywiązanie do ekranów',
    context_pl:
      'Dziecko nie chce oderwać się od tabletu/TV. Pokaż, że prawdziwy świat jest ciekawszy niż ekran.',
    metaphor_pl: 'Ekran to okno — ale drzwi prowadzą do prawdziwych przygód. Motyl Wyłącznik.',
    category: 'routine',
  },

  // === change ===
  new_sibling: {
    title_pl: 'Nowe rodzeństwo w rodzinie',
    context_pl:
      'Dziecko mierzy się z nową rolą starszego brata/siostry. Pokaż, że to awans, nie degradacja.',
    metaphor_pl: 'Korona starszego rodzeństwa z magicznymi mocami opiekuna. Miś Starszak.',
    category: 'change',
  },
  moving_house: {
    title_pl: 'Przeprowadzka',
    context_pl:
      'Dziecko traci znane otoczenie i rutynę. Pokaż, że wspomnienia podróżują z nami, a nowe miejsce czeka na odkrycie.',
    metaphor_pl:
      'Magiczna walizka wspomnień, która otwiera portale do nowych przygód. Żółwik Domek.',
    category: 'change',
  },
  parents_divorce: {
    title_pl: 'Rozwód lub rozstanie rodziców',
    context_pl:
      'Dziecko mierzy się z rozpadem rodziny i często bierze winę na siebie. Pokaż, że miłość rodziców do dziecka nie kończy się z rozstaniem, a dwa domy mogą być źródłem podwójnej troski, nie podziału.',
    metaphor_pl:
      'Drzewo o jednym pniu i dwóch koronach — choć gałęzie rosną w różne strony, korzenie wciąż karmią ten sam liść. Wróżka Dwóch Gniazd.',
    category: 'change',
  },
  tooth_brushing: {
    title_pl: 'Opór przed myciem zębów',
    context_pl:
      'Dziecko traktuje mycie zębów jako narzuconą walkę. Pokaż szczoteczkę jako narzędzie misji, a mikroby jako oswojonych przeciwników, których odgania się z radością, nie ze strachu.',
    metaphor_pl:
      'Szczoteczka to magiczna miotełka rycerza Białego Uśmiechu, która zamienia ząbki w lśniące perły.',
    category: 'routine',
  },
  sensory_sensitivity: {
    title_pl: 'Nadwrażliwość sensoryczna',
    context_pl:
      'Dziecko jest przeciążone bodźcami — głośne dźwięki, tłumy, faktury wywołują panikę. Pokaż, że jego zmysły są jak superczułe radary, które można nauczyć się ściszać i strojić, a nie wyłączać.',
    metaphor_pl:
      'Wewnętrzne pokrętło głośności i magiczne słuchawki ciszy, które oddają dziecku kontrolę nad światem. Lis Wyciszek.',
    category: 'emotions',
  },
  general_resilience: {
    title_pl: 'Ogólne wsparcie emocjonalne',
    context_pl:
      'Dziecko mierzy się z codziennymi trudnościami, które rodzic chce wesprzeć opowieścią. Pokaż uniwersalną podróż bohatera — odkrycie własnej siły, mądrego przewodnika i odwagi, by spróbować jeszcze raz.',
    metaphor_pl:
      'Kompas serca, który zawsze wskazuje drogę do wewnętrznej siły dziecka. Ćmik Iskra.',
    category: 'emotions',
  },

  // === Spec § 4 — Sen i Wieczór ===
  bedtime_resistance: {
    title_pl: 'Trudności z zasypianiem',
    context_pl:
      'Dziecko opóźnia kładzenie się — kolejna szklanka wody, jeszcze jedna bajka. Pokaż, że spokojne wieczory to wspólny rytuał, nie walka.',
    metaphor_pl:
      'Magiczne pióro, które otwiera „wieczorną krainę" tylko gdy dziecko samo zaprosi sen. Sowa Sennica.',
    category: 'routine',
  },
  night_wakings: {
    title_pl: 'Częste pobudki nocne',
    context_pl:
      'Dziecko budzi się w nocy z płaczem, woła rodzica, boi się ciemności. Pokaż, że noc też ma swoich opiekunów i można poczuć się bezpiecznie do rana.',
    metaphor_pl:
      'Strażnik Nocy z latarnią księżyca, który przyświeca aż do brzasku. Borsuk Bezsenny-Już-Nie.',
    category: 'fears',
  },
  independent_sleep: {
    title_pl: 'Nauka samodzielnego zasypiania',
    context_pl:
      'Dziecko przechodzi ze wspólnego łóżka do swojego pokoju. Pokaż, że własne łóżeczko to gniazdo siły, nie miejsce rozłąki.',
    metaphor_pl:
      'Magiczny kocyk, który pamięta zapach mamy i taty nawet gdy dziecko śpi już samo. Pingwin Pierwszy-Sen.',
    category: 'change',
  },

  // === Spec § 4 — Emocje i Zachowanie ===
  physical_aggression: {
    title_pl: 'Agresja fizyczna (bicie, gryzienie, kopanie)',
    context_pl:
      'Dziecko nie umie nazwać emocji — uderza, gryzie, kopie. Pokaż, że to sygnał potrzeby, a nie złośliwość, i że istnieją inne sposoby pokazania, co czujesz.',
    metaphor_pl:
      'Burzowa chmura w środku, którą można rozproszyć słowem-zaklęciem zamiast ręką. Lew Łapka-Stop.',
    category: 'emotions',
  },
  defiance: {
    title_pl: 'Bunt i odmowa współpracy',
    context_pl:
      'Dziecko ciągle mówi „NIE" — to naturalna część rozwoju, ale nie musi oznaczać codziennej walki. Pokaż, że współpraca może być fajniejsza niż opór.',
    metaphor_pl:
      'Magiczne klucze, które otwierają się tylko gdy „NIE" zamienisz w „spróbuję". Smok Wybór.',
    category: 'emotions',
  },

  // === Spec § 4 — Higiena i Nawyki ===
  toilet_holding: {
    title_pl: 'Nawykowe wstrzymywanie potrzeb',
    context_pl:
      'Dziecko nie chce iść do toalety i wstrzymuje potrzeby. Pokaż, że ciało wysyła ważne sygnały, których warto słuchać.',
    metaphor_pl:
      'Kapitan brzuszka, który dowodzi statkiem ciała i woła „pora na port!" Foka Słuchaczka.',
    category: 'routine',
  },
  bedwetting: {
    title_pl: 'Moczenie nocne',
    context_pl:
      'Dziecko moczy się w nocy lub w przedszkolu i wstydzi się tego. Zdejmij wstyd i presję — pokaż, że ciało uczy się we własnym tempie, a mokra noc nie odbiera bohaterowi odwagi.',
    metaphor_pl:
      'Nocna chmurka, z której czasem popada deszcz, ale każdy poranek wstaje ze słońcem. Bobrzyk Suchy-Poranek.',
    category: 'routine',
  },
  food_selectivity: {
    title_pl: 'Wybiórczość pokarmowa (niejadek)',
    context_pl:
      'Dziecko je tylko kilka rzeczy i odmawia próbowania nowych smaków. Pokaż jedzenie jako odkrywanie krain, nie obowiązek.',
    metaphor_pl:
      'Talerz to mapa, każdy nowy smak to nowa wyspa do odwiedzenia. Wiewiórka Smakożerka.',
    category: 'routine',
  },
  bath_anxiety: {
    title_pl: 'Lęk przed kąpielą i myciem głowy',
    context_pl:
      'Dziecko panikuje przy kąpieli, krzyczy przy myciu głowy. Pokaż wodę jako przyjazny żywioł i kąpiel jako przygodę.',
    metaphor_pl: 'Wanna to ocean odkrywców, a piana to magiczna mgła chmurowa.',
    category: 'fears',
  },
  morning_routine: {
    title_pl: 'Poranna organizacja',
    context_pl:
      'Dziecko nie umie zorganizować się rano — ubranie trwa wieczność, buty się gubią. Pokaż, że poranek może być rytuałem przygody, nie walki.',
    metaphor_pl:
      'Magiczna lista skarbu — każdy odhaczony krok przybliża do dziennej misji. Wróbelek Punktualnik.',
    category: 'routine',
  },
  screen_time_management: {
    title_pl: 'Zarządzanie czasem ekranowym',
    context_pl:
      'Dziecko traktuje wyłączenie tabletu jak koniec świata. Pokaż, że ekran to jedna z wielu kraina zabawy, a inne są równie ciekawe.',
    metaphor_pl:
      'Czarodziejska klepsydra, która zaprasza do nowych przygód, gdy ekran zasypia. Lis Wyłącznik.',
    category: 'routine',
  },
  pacifier_weaning: {
    title_pl: 'Odstawienie smoczka lub butelki',
    context_pl:
      'Dziecko żegna się ze smoczkiem/butelką i traci znajomy sposób uspokajania. Pokaż, że pożegnanie to start nowej przygody, nie strata.',
    metaphor_pl:
      'Wróżkowa wymiana — smoczek zostawiony pod poduszką zamienia się w drobny prezent odwagi. Zajączek Pożegnańczyk.',
    category: 'change',
  },

  // === Spec § 4 — Relacje i Rodzeństwo ===
  sibling_rivalry: {
    title_pl: 'Rywalizacja między rodzeństwem',
    context_pl:
      'Dziecko walczy o uwagę rodzica, jest zazdrosne o siostrę/brata. Pokaż, że miłość rodzica nie dzieli się — mnoży.',
    metaphor_pl:
      'Magiczne serce-ogród rodzica, w którym kwitnie tyle kwiatów, ile dzieci. Wróżka Dośćdlawszystkich.',
    category: 'emotions',
  },
  empathy_building: {
    title_pl: 'Empatia i rozumienie emocji innych',
    context_pl:
      'Dziecko nie chce się bawić z innymi, nie zauważa ich uczuć. Pokaż, że każdy bohater ma swoją historię — i można jej posłuchać.',
    metaphor_pl: 'Magiczne lusterko serca, które pokazuje, co czuje druga osoba. Sowa Wsłuchana.',
    category: 'social',
  },
  first_friendships: {
    title_pl: 'Budowanie pierwszych przyjaźni',
    context_pl:
      'Dziecko nie wie, jak nawiązać kontakt z rówieśnikiem. Pokaż, że pierwszy krok jest najtrudniejszy, ale potem robi się łatwiej.',
    metaphor_pl:
      'Niewidzialna nić, która łączy serca dwóch dzieci od pierwszego „cześć". Mrówka Zaprzyjaźnioneczka.',
    category: 'social',
  },

  // === Spec § 4 — Lęki i Odwaga ===
  separation_anxiety: {
    title_pl: 'Lęk separacyjny',
    context_pl:
      'Każde rozstanie z rodzicem to dramat. Pokaż, że miłość nie znika, gdy rodzic wychodzi — zawsze wraca.',
    metaphor_pl:
      'Niewidzialna nitka łącząca serca dziecka i rodzica, świecąca nawet przez ściany. Elfik Powrócik.',
    category: 'fears',
  },
  preschool_adaptation: {
    title_pl: 'Adaptacja przedszkolna i szkolna',
    context_pl:
      'Dziecko płacze przy drzwiach, prosi o zostanie w domu. Pokaż, że przedszkole/szkoła to bezpieczne miejsce pełne nowych przyjaciół.',
    metaphor_pl:
      'Magiczna brama, która znika, gdy bohater odkrywa, że po drugiej stronie czekają już znajomi. Niedźwiadek Pierwszy-Dzień.',
    category: 'change',
  },
  medical_anxiety: {
    title_pl: 'Lęk przed zabiegami medycznymi',
    context_pl:
      'Szczepienie, dentysta, biały fartuch = panika. Pokaż lekarza jako sojusznika, a narzędzia jako magiczne pomocniki.',
    metaphor_pl:
      'Szpital to warsztat naprawczy superbohaterów, a stetoskop słucha historii serca. Doktor Iskierka.',
    category: 'fears',
  },
  hospital_stay: {
    title_pl: 'Wizyta w szpitalu',
    context_pl:
      'Dziecko czeka pobyt w szpitalu lub zabieg — boi się nieznanego miejsca, badań i rozłąki z rodzicami. Oswój szpital z wyprzedzeniem: pokaż przebieg wydarzeń krok po kroku, personel jako pomocników i to, że rodzice zawsze wracają.',
    metaphor_pl:
      'Szpital to zamek dzielnych rycerzy, a opaska na nadgarstku to tarcza odwagi. Smok Plasterek.',
    category: 'fears',
  },
  relocation: {
    title_pl: 'Zmiana miejsca zamieszkania',
    context_pl:
      'Dziecko traci znane otoczenie i rutynę. Pokaż, że dom jest tam, gdzie rodzina, a wspomnienia podróżują z nami.',
    metaphor_pl:
      'Magiczna walizka wspomnień, która otwiera portale do nowych przygód. Żółwik Domek.',
    category: 'change',
  },
  failure_resilience: {
    title_pl: 'Niska odporność na porażkę',
    context_pl:
      'Dziecko rezygnuje przy pierwszej trudności, płacze przy przegranej. Pokaż, że pomyłki to część zabawy, a próba to już zwycięstwo.',
    metaphor_pl:
      'Magiczny dziennik, w którym każda pomyłka rozkwita w mądrość. Króliczek Spróbujmy-Jeszcze.',
    category: 'emotions',
  },
  lying_confabulation: {
    title_pl: 'Kłamstwa i konfabulacje',
    context_pl:
      'Dziecko zmyśla, miesza wyobraźnię z prawdą. Pokaż, że to często kreatywność, a nie złośliwość, i że oba światy mają swoje miejsce.',
    metaphor_pl:
      'Magiczna szuflada — w jednej połówce mieszkają historie, w drugiej fakty. Lis Prawdomówca.',
    category: 'emotions',
  },

  // === Spec § 4 — Trudne Sytuacje Życiowe ===
  death_in_family: {
    title_pl: 'Śmierć w rodzinie',
    context_pl:
      'Dziecko zmaga się z odejściem bliskiej osoby. Pokaż delikatnie, że osoby, które kochaliśmy, zostają w naszym sercu i wspomnieniach.',
    metaphor_pl:
      'Świetlik wspomnień, który świeci w sercu nawet gdy ktoś bliski odszedł. Motyl Ciepło.',
    category: 'change',
  },
  family_illness: {
    title_pl: 'Choroba w rodzinie',
    context_pl:
      'Dziecko boi się, że choroba kogoś bliskiego zmieni wszystko. Pokaż, że może być odważne i że miłość pomaga niezależnie od tego, co się dzieje.',
    metaphor_pl:
      'Świetlikowa lampa wsparcia, którą każdy w rodzinie może zapalić, gdy się boi. Kotek Otulisz.',
    category: 'change',
  },
  child_illness: {
    title_pl: 'Choroba dziecka',
    context_pl:
      'Dziecko boi się szpitala, badań, samotności. Pokaż, że nawet w trudnych chwilach jest otoczone miłością i że bycie chorym nie znaczy bycie samotnym.',
    metaphor_pl:
      'Magiczna kołderka odwagi, która grzeje serce nawet pod kroplówką. Pingwinek Dzielniak.',
    category: 'change',
  },

  // === Spec § 4 — Różnorodność i Akceptacja ===
  self_acceptance: {
    title_pl: 'Akceptacja odmienności własnej',
    context_pl:
      'Dziecko czuje, że jest „inne" niż rówieśnicy. Pokaż, że bycie innym to supermoc, nie wada.',
    metaphor_pl:
      'Magiczne lusterko, które pokazuje unikalny wzór serca każdego dziecka. Pawik Iskra.',
    category: 'emotions',
  },
  peer_acceptance: {
    title_pl: 'Akceptacja odmienności rówieśników',
    context_pl:
      'Dziecko nie rozumie, dlaczego ktoś jest inny — fizycznie, emocjonalnie, kulturowo. Pokaż, że różnorodność czyni świat ciekawszym.',
    metaphor_pl:
      'Magiczna mozaika, gdzie każdy kafelek ma inny kolor, ale razem tworzą najpiękniejszy obraz. Wiewiórka Witamy-Każdego.',
    category: 'social',
  },
  peer_exclusion: {
    title_pl: 'Wykluczenie rówieśnicze',
    context_pl:
      'Dziecko czuje, że nikt nie chce się z nim bawić. Pokaż, że jego wartość nie zależy od decyzji innych dzieci, a prawdziwi przyjaciele są tam, gdzie szczerość.',
    metaphor_pl:
      'Magiczne ognisko serca, do którego sami siadają ci, którzy potrafią się ogrzać. Lis Sojusznik.',
    category: 'social',
  },
  learning_motivation: {
    title_pl: 'Zrozumienie celu nauki',
    context_pl:
      'Dziecko nie widzi sensu nauki, wszystko wydaje się nudne. Pokaż, że uczenie się to odkrywanie świata i nowych supermocy.',
    metaphor_pl: 'Magiczna mapa wiedzy, która powiększa się z każdą nauczoną rzeczą. Sowa Cyferka.',
    category: 'emotions',
  },
};

/**
 * Aliases for renamed problemIds — keeps old slugs working without
 * duplicating prompt copy. Use `resolveProblemId(id)` to canonicalize.
 */
export const PROBLEM_ALIASES: Record<string, string> = {
  // Empty for now — every spec problemId has its own entry above.
};

/**
 * Resolves a frontend problemId to its canonical entry in PROBLEMS.
 * Falls back to the input if no alias exists. Caller is responsible
 * for handling the case where the canonical id isn't in PROBLEMS.
 */
export function resolveProblemId(id: string): string {
  return PROBLEM_ALIASES[id] ?? id;
}

// ── Appearance Maps ──────────────────────────────

// Spec § 3.4 intake form sends Polish, capitalized strings verbatim
// (e.g. "Blond", "Brązowe"). Earlier internal slugs are kept for
// backwards compatibility with orders already in flight.
export const HAIR_COLOR_MAP: Record<string, string> = {
  // Spec values
  Blond: 'blonde',
  Brązowe: 'brown',
  Czarne: 'black',
  Rude: 'red / ginger',
  // Legacy slugs
  blond: 'blonde',
  jasny_braz: 'light brown',
  braz: 'brown',
  ciemny_braz: 'dark brown',
  czarny: 'black',
  rudy: 'red / ginger',
};

export const HAIR_STYLE_MAP: Record<string, string> = {
  // Spec § 3.4 collapses hair structure to length only.
  Krótkie: 'short',
  Średnie: 'medium-length',
  Długie: 'long',
  // Legacy slugs (richer style options)
  krotkie_proste: 'short and straight',
  krotkie_falowane: 'short and slightly wavy',
  srednie_proste: 'medium-length and straight',
  srednie_falowane: 'medium-length and wavy',
  dlugie_proste: 'long and straight',
  dlugie_krecone: 'long and curly',
  koki: 'in pigtails',
  kucyk: 'in a ponytail',
};

export const EYE_COLOR_MAP: Record<string, string> = {
  // Spec values
  Niebieskie: 'blue',
  Zielone: 'green',
  Brązowe: 'brown',
  Szare: 'gray',
  // Legacy slugs
  niebieskie: 'blue',
  zielone: 'green',
  brazowe: 'brown',
  piwne: 'hazel',
  szare: 'gray',
};

export const SKIN_TONE_MAP: Record<string, string> = {
  jasna: 'light / fair skin',
  srednia: 'medium / olive skin',
  ciemna: 'dark brown skin',
  smietankowa: 'cream / peachy skin',
};

export const OUTFIT_MAP: Record<string, OutfitDefinition> = {
  bluza_dinozaur: {
    pl: 'żółta bluza z dinozaurem',
    en: 'yellow hoodie with green dinosaur print',
  },
  bluza_jednorozec: {
    pl: 'różowa bluza z jednorożcem',
    en: 'pink hoodie with unicorn print',
  },
  bluza_rakieta: {
    pl: 'niebieska bluza z rakietą',
    en: 'blue hoodie with rocket print',
  },
  bluza_kwiaty: {
    pl: 'fioletowa bluza w kwiatki',
    en: 'purple hoodie with flower pattern',
  },
  koszulka_serce: {
    pl: 'biała koszulka z sercem',
    en: 'white t-shirt with red heart print',
  },
  koszulka_auto: {
    pl: 'czerwona koszulka z autkiem',
    en: 'red t-shirt with toy car print',
  },
  pizama_gwiazdy: {
    pl: 'niebieska piżama w gwiazdki',
    en: 'blue pajamas with star pattern',
  },
  pizama_misie: {
    pl: 'różowa piżama z misiami',
    en: 'pink pajamas with teddy bear pattern',
  },
  sukienka_motyle: {
    pl: 'żółta sukienka w motyle',
    en: 'yellow dress with butterfly pattern',
  },
  ogrodniczki: {
    pl: 'jeansowe ogrodniczki',
    en: 'denim overalls with front pocket',
  },
};

// ── Art Style Definitions ────────────────────────

export const STYLE_A: StyleDefinition = {
  id: 'A',
  name_pl: 'Styl mieszany (Rocio Bonilla)',
  name_en: 'Mixed Media Illustration (Rocio Bonilla)',
  style:
    "Bold graphic mixed-media children's book illustration with thick black ink outlines and paper collage textures",
  modifiers:
    'THICK BLACK INK OUTLINES around every shape, heavy bold linework like a graphic novel, torn paper collage elements and craft paper textures, FLAT color fills with NO gradients, strictly limited palette of 3-4 strong saturated colors (red, yellow, teal, black), visible rough pencil sketching underneath the ink, white cream paper background showing through everywhere, characters have oversized heads and small round bodies with exaggerated cartoon expressions, big dot eyes, scrapbook cutout aesthetic, editorial illustration style, shapes are geometric and simplified, NO soft edges NO blending NO watercolor effects, everything has a hard defined edge, hand-stamped and hand-cut feel, kraft paper and newsprint collage pieces visible',
};

export const STYLE_B: StyleDefinition = {
  id: 'B',
  name_pl: 'Styl akwarelowy (Jona Jung)',
  name_en: 'Ecoline & Colored Pencil Illustration (Jona Jung)',
  style:
    'Soft dreamy fine-art watercolor painting with NO outlines and wet paint washes bleeding into paper',
  modifiers:
    'ABSOLUTELY NO OUTLINES no linework no ink lines, soft feathered edges where paint meets paper, wet-on-wet watercolor technique with visible paint drips and water blooms, FULL RICH SATURATED RAINBOW PALETTE with smooth gradient color transitions from warm to cool, dreamy ethereal atmosphere with soft focus misty backgrounds, characters gently blend into the painted background with lost edges, visible paper grain texture through transparent watercolor layers, paint pooling and granulation effects, delicate translucent color overlays, atmospheric perspective with pale distant washes, painterly and impressionistic, every surface looks WET and freshly painted, like a fine art watercolor gallery piece, luminous backlit glow through transparent pigments, NO hard edges NO black lines NO flat fills',
};
