/**
 * Simulated story openings for topic landing pages — written to match the
 * style and safety rules of the book pipeline prompts (convex/lib/prompts.ts).
 * Shown in the "wpisz imię dziecka" demo section. {name} = child's name in
 * nominative; m/f variants differ only in grammatical gender forms.
 * Generated 2026-07-28; review before publishing (spec-lp-v4-rollout.md, F3).
 */

export interface StoryOpeningParagraph {
  m: string;
  f: string;
}

export interface StoryOpening {
  /** Book-title pattern with {name} placeholder. */
  title: string;
  paragraphs: [StoryOpeningParagraph, StoryOpeningParagraph, StoryOpeningParagraph];
}

/** Keyed by topic slug (see src/data/topics.ts). */
export const STORY_OPENINGS: Record<string, StoryOpening> = {
  'adaptacja-przedszkolna': {
    title: '{name} i Klucz do Krainy Przedszkola',
    paragraphs: [
      {
        m: 'Był sobotni poranek i w kuchni pachniało naleśnikami. {name} siedział na wysokim krześle i machał nogami w rytm radia. Przed nim stał kubek z żyrafą, a w kubku było ciepłe kakao. Przez okno widać było wróbla, który skakał po parapecie.',
        f: 'Był sobotni poranek i w kuchni pachniało naleśnikami. {name} siedziała na wysokim krześle i machała nogami w rytm radia. Przed nią stał kubek z żyrafą, a w kubku było ciepłe kakao. Przez okno widać było wróbla, który skakał po parapecie.',
      },
      {
        m: 'Po śniadaniu {name} zbudował na podłodze długą drogę z poduszek. Po jednej stronie stał pluszowy słoń, po drugiej mały, drewniany autobus. Autobus woził słonia na wycieczki i zawsze wracał na to samo miejsce. To była jego ulubiona zabawa.',
        f: 'Po śniadaniu {name} zbudowała na podłodze długą drogę z poduszek. Po jednej stronie stał pluszowy słoń, po drugiej mały, drewniany autobus. Autobus woził słonia na wycieczki i zawsze wracał na to samo miejsce. To była jej ulubiona zabawa.',
      },
      {
        m: 'W przedpokoju wisiał nowy plecak. Był granatowy i miał kieszeń akurat na bidon. Mama powiedziała, że w poniedziałek plecak pojedzie razem z nim do przedszkola. {name} spojrzał na plecak i poczuł w brzuchu coś dziwnego, trochę jak łaskotki, a trochę jak pytanie.',
        f: 'W przedpokoju wisiał nowy plecak. Był granatowy i miał kieszeń akurat na bidon. Mama powiedziała, że w poniedziałek plecak pojedzie razem z nią do przedszkola. {name} spojrzała na plecak i poczuła w brzuchu coś dziwnego, trochę jak łaskotki, a trochę jak pytanie.',
      },
    ],
  },

  'bicie-innych': {
    title: '{name} i Smok, który Nauczył się Oddychać',
    paragraphs: [
      {
        m: 'Popołudnie było ciepłe, a piasek w piaskownicy nagrzany od słońca. {name} kopał tunel pod wielkim zamkiem. Obok leżała żółta koparka z odklejoną naklejką. Ziarenka piasku sypały się cicho, szszsz, przez palce.',
        f: 'Popołudnie było ciepłe, a piasek w piaskownicy nagrzany od słońca. {name} kopała tunel pod wielkim zamkiem. Obok leżała żółta koparka z odklejoną naklejką. Ziarenka piasku sypały się cicho, szszsz, przez palce.',
      },
      {
        m: 'Zamek rósł powoli. Miał trzy wieże i most zrobiony z patyka. {name} przynosił wodę w wiaderku i mocno ubijał mokry piasek. Kiedy skończył, usiadł i popatrzył na zamek z bliska, jednym okiem, jak prawdziwy budowniczy.',
        f: 'Zamek rósł powoli. Miał trzy wieże i most zrobiony z patyka. {name} przynosiła wodę w wiaderku i mocno ubijała mokry piasek. Kiedy skończyła, usiadła i popatrzyła na zamek z bliska, jednym okiem, jak prawdziwa budowniczyni.',
      },
      {
        m: 'Wtedy na plac zabaw przyszły inne dzieci. Jeden chłopiec podszedł blisko zamku i wyciągnął rękę po koparkę. {name} poczuł, jak w środku robi się gorąco, zupełnie jakby ktoś zapalił małe światełko w brzuchu. Jeszcze nie wiedział, co z tym gorącem zrobić.',
        f: 'Wtedy na plac zabaw przyszły inne dzieci. Jeden chłopiec podszedł blisko zamku i wyciągnął rękę po koparkę. {name} poczuła, jak w środku robi się gorąco, zupełnie jakby ktoś zapalił małe światełko w brzuchu. Jeszcze nie wiedziała, co z tym gorącem zrobić.',
      },
    ],
  },

  'bunt-odmowa-wspolpracy': {
    title: '{name} i Kapitan Własnej Łódki',
    paragraphs: [
      {
        m: 'Za oknem padał drobny deszcz, a w pokoju było sucho i ciepło. {name} leżał na brzuchu i układał tor dla kulek. Tor biegł od krzesła, przez książkę, aż pod kaloryfer. Kulka jechała, jechała i na końcu, bum, wpadała do pudełka.',
        f: 'Za oknem padał drobny deszcz, a w pokoju było sucho i ciepło. {name} leżała na brzuchu i układała tor dla kulek. Tor biegł od krzesła, przez książkę, aż pod kaloryfer. Kulka jechała, jechała i na końcu, bum, wpadała do pudełka.',
      },
      {
        m: 'To była jego własna trasa. Sam wymyślił każdy zakręt i sam poprawiał tor, gdy kulka uciekała w bok. Nikt mu nie mówił, gdzie ma być mostek. {name} lubił, kiedy o czymś decydował.',
        f: 'To była jej własna trasa. Sama wymyśliła każdy zakręt i sama poprawiała tor, gdy kulka uciekała w bok. Nikt jej nie mówił, gdzie ma być mostek. {name} lubiła, kiedy o czymś decydowała.',
      },
      {
        m: 'Z kuchni zawołała mama. Powiedziała, że za chwilę wychodzą i trzeba założyć kurtkę. {name} nie podniósł głowy. W środku pojawiło się jedno małe, mocne słowo i to słowo brzmiało: nie.',
        f: 'Z kuchni zawołała mama. Powiedziała, że za chwilę wychodzą i trzeba założyć kurtkę. {name} nie podniosła głowy. W środku pojawiło się jedno małe, mocne słowo i to słowo brzmiało: nie.',
      },
    ],
  },

  'czeste-pobudki-nocne': {
    title: '{name} i Latarnia Spokojnej Nocy',
    paragraphs: [
      {
        m: 'Wieczór był miękki jak kołdra. {name} leżał już w łóżku, w piżamie w małe gwiazdki. Na suficie świeciła lampka-księżyc i rzucała blade kółka światła. Za ścianą cicho szumiała zmywarka.',
        f: 'Wieczór był miękki jak kołdra. {name} leżała już w łóżku, w piżamie w małe gwiazdki. Na suficie świeciła lampka-księżyc i rzucała blade kółka światła. Za ścianą cicho szumiała zmywarka.',
      },
      {
        m: 'Obok poduszki spał pluszowy borsuk Bruno. Bruno miał jedno ucho krótsze, bo dawno temu ktoś go za nie ciągnął. {name} przykrył go rogiem kołdry i szepnął: dobranoc. Borsuk oczywiście nic nie odpowiedział, ale wyglądał na zadowolonego.',
        f: 'Obok poduszki spał pluszowy borsuk Bruno. Bruno miał jedno ucho krótsze, bo dawno temu ktoś go za nie ciągnął. {name} przykryła go rogiem kołdry i szepnęła: dobranoc. Borsuk oczywiście nic nie odpowiedział, ale wyglądał na zadowolonego.',
      },
      {
        m: 'Mama zgasiła duże światło i zostawiła uchylone drzwi. W pokoju zrobiło się cicho, tak cicho, że słychać było własny oddech. {name} wiedział, że zaśnie szybko. Nie wiedział tylko, co się stanie, kiedy w środku nocy nagle otworzy oczy.',
        f: 'Mama zgasiła duże światło i zostawiła uchylone drzwi. W pokoju zrobiło się cicho, tak cicho, że słychać było własny oddech. {name} wiedziała, że zaśnie szybko. Nie wiedziała tylko, co się stanie, kiedy w środku nocy nagle otworzy oczy.',
      },
    ],
  },

  'mycie-zebow': {
    title: '{name} i Straż Błyszczących Zębów',
    paragraphs: [
      {
        m: 'W łazience paliło się małe światło nad lustrem. Na kaloryferze wisiał ręcznik z rekinem, a na półce stały trzy kubki: duży, średni i najmniejszy. Najmniejszy był jego. {name} właśnie skończył kąpiel i miał mokre włosy.',
        f: 'W łazience paliło się małe światło nad lustrem. Na kaloryferze wisiał ręcznik z rekinem, a na półce stały trzy kubki: duży, średni i najmniejszy. Najmniejszy był jej. {name} właśnie skończyła kąpiel i miała mokre włosy.',
      },
      {
        m: 'Na parapecie mieszkała gumowa kaczka o imieniu Zenek. Zenek pilnował mydła i podobno nigdy nie spał. {name} postawił go dokładnie na środku parapetu, żeby wszystko widział. Kaczka patrzyła prosto w lustro.',
        f: 'Na parapecie mieszkała gumowa kaczka o imieniu Zenek. Zenek pilnował mydła i podobno nigdy nie spał. {name} postawiła go dokładnie na środku parapetu, żeby wszystko widział. Kaczka patrzyła prosto w lustro.',
      },
      {
        m: 'Z korytarza dobiegł głos taty: zęby. Na półce leżała szczoteczka z zielonym paskiem. {name} spojrzał na nią kątem oka i przestąpił z nogi na nogę. Wieczorem szczoteczka zawsze wydawała się większa niż rano.',
        f: 'Z korytarza dobiegł głos taty: zęby. Na półce leżała szczoteczka z zielonym paskiem. {name} spojrzała na nią kątem oka i przestąpiła z nogi na nogę. Wieczorem szczoteczka zawsze wydawała się większa niż rano.',
      },
    ],
  },

  'nadwrazliwosc-sensoryczna': {
    title: '{name} i Wyspa Cichych Dźwięków',
    paragraphs: [
      {
        m: 'Za regałem, w rogu pokoju, było jego ulubione miejsce. Mieściła się tam poduszka, koc w kratkę i pudełko z klockami. Światło docierało tam tylko trochę, przez szparę między książkami. {name} siedział tam często, kiedy w domu robiło się głośno.',
        f: 'Za regałem, w rogu pokoju, było jej ulubione miejsce. Mieściła się tam poduszka, koc w kratkę i pudełko z klockami. Światło docierało tam tylko trochę, przez szparę między książkami. {name} siedziała tam często, kiedy w domu robiło się głośno.',
      },
      {
        m: 'Klocki {name} układał zawsze według kolorów. Najpierw niebieskie, potem żółte, na końcu czerwone. Kiedy klocek wskakiwał na swoje miejsce, robił cichutkie klik. To klik było przyjemne, jakby ktoś głaskał w środku głowy.',
        f: 'Klocki {name} układała zawsze według kolorów. Najpierw niebieskie, potem żółte, na końcu czerwone. Kiedy klocek wskakiwał na swoje miejsce, robił cichutkie klik. To klik było przyjemne, jakby ktoś głaskał w środku głowy.',
      },
      {
        m: 'Do pokoju zajrzała mama z torbami. Powiedziała, że jadą teraz do dużego sklepu po zakupy na weekend. {name} znał ten sklep: jasne światło, piszczące kasy, muzyka spod sufitu. Odłożył klocek i przez chwilę siedział bez ruchu.',
        f: 'Do pokoju zajrzała mama z torbami. Powiedziała, że jadą teraz do dużego sklepu po zakupy na weekend. {name} znała ten sklep: jasne światło, piszczące kasy, muzyka spod sufitu. Odłożyła klocek i przez chwilę siedziała bez ruchu.',
      },
    ],
  },

  'napady-zlosci': {
    title: '{name} i Wulkan, który Umiał Ostygnąć',
    paragraphs: [
      {
        m: 'Popołudnie pachniało pomarańczą, bo mama obierała ją w kuchni. {name} siedział przy niskim stoliku i rysował kredkami. Kartka była prawie cała czerwona i pomarańczowa. To miał być wulkan, prawdziwy, z dymem.',
        f: 'Popołudnie pachniało pomarańczą, bo mama obierała ją w kuchni. {name} siedziała przy niskim stoliku i rysowała kredkami. Kartka była prawie cała czerwona i pomarańczowa. To miał być wulkan, prawdziwy, z dymem.',
      },
      {
        m: 'Wulkan rósł na kartce coraz wyżej. {name} dorysował mu iskry, kamienie i małą ścieżkę na dole. Kredka do dymu złamała się w połowie, ale to nic, druga połówka rysowała tak samo dobrze. Na dole kartki powstała jeszcze rzeka.',
        f: 'Wulkan rósł na kartce coraz wyżej. {name} dorysowała mu iskry, kamienie i małą ścieżkę na dole. Kredka do dymu złamała się w połowie, ale to nic, druga połówka rysowała tak samo dobrze. Na dole kartki powstała jeszcze rzeka.',
      },
      {
        m: 'Za oknem zawołali koledzy z podwórka. Trzeba było odłożyć kredki i szybko wyjść, chociaż wulkan nie był skończony. {name} poczuł, że coś w środku robi się ciasne i gorące. Prawdziwe wulkany też najpierw robią się gorące w środku.',
        f: 'Za oknem zawołali koledzy z podwórka. Trzeba było odłożyć kredki i szybko wyjść, chociaż wulkan nie był skończony. {name} poczuła, że coś w środku robi się ciasne i gorące. Prawdziwe wulkany też najpierw robią się gorące w środku.',
      },
    ],
  },

  niesmialosci: {
    title: '{name} i Głos Schowany w Kieszeni',
    paragraphs: [
      {
        m: 'W parku było jeszcze wcześnie i mgła leżała nisko nad stawem. {name} szedł ścieżką z papierową torebką pełną chleba dla kaczek. Buty chrupały na żwirze: chrup, chrup, chrup. Powietrze pachniało mokrymi liśćmi.',
        f: 'W parku było jeszcze wcześnie i mgła leżała nisko nad stawem. {name} szła ścieżką z papierową torebką pełną chleba dla kaczek. Buty chrupały na żwirze: chrup, chrup, chrup. Powietrze pachniało mokrymi liśćmi.',
      },
      {
        m: 'Kaczki znały to miejsce i przypływały same. Były cztery: trzy brązowe i jedna prawie biała. {name} rzucał okruszki po jednym, żeby dla każdej starczyło. Do kaczek mówił półgłosem, bo kaczki słuchają cierpliwie i nigdy się nie śmieją.',
        f: 'Kaczki znały to miejsce i przypływały same. Były cztery: trzy brązowe i jedna prawie biała. {name} rzucała okruszki po jednym, żeby dla każdej starczyło. Do kaczek mówiła półgłosem, bo kaczki słuchają cierpliwie i nigdy się nie śmieją.',
      },
      {
        m: 'Na trawie, kawałek dalej, bawiła się grupa dzieci. Jedna dziewczynka zamachała ręką w jego stronę. {name} zamachał króciutko i od razu spuścił wzrok na torebkę z chlebem. W gardle zrobiło się nagle wąsko, jakby ktoś zawiązał tam mały supeł.',
        f: 'Na trawie, kawałek dalej, bawiła się grupa dzieci. Jedna dziewczynka zamachała ręką w jej stronę. {name} zamachała króciutko i od razu spuściła wzrok na torebkę z chlebem. W gardle zrobiło się nagle wąsko, jakby ktoś zawiązał tam mały supeł.',
      },
    ],
  },

  odpieluchowanie: {
    title: '{name} i Stacja Małego Konduktora',
    paragraphs: [
      {
        m: 'W pokoju było ciepło, a przez okno wpadało popołudniowe słońce. {name} bawił się w pociąg. Krzesła stały jedno za drugim i były wagonami, a poduszka na przedzie lokomotywą. Konduktorem był pluszowy zając Fasolka.',
        f: 'W pokoju było ciepło, a przez okno wpadało popołudniowe słońce. {name} bawiła się w pociąg. Krzesła stały jedno za drugim i były wagonami, a poduszka na przedzie lokomotywą. Konduktorem był pluszowy zając Fasolka.',
      },
      {
        m: 'Pociąg zatrzymywał się na trzech stacjach. Pierwsza była przy szafie, druga przy oknie, a trzecia przy drzwiach. Na każdej stacji {name} wołał: prosimy wysiadać. Fasolka wysiadał zawsze ostatni, bo konduktor pilnuje wszystkiego.',
        f: 'Pociąg zatrzymywał się na trzech stacjach. Pierwsza była przy szafie, druga przy oknie, a trzecia przy drzwiach. Na każdej stacji {name} wołała: prosimy wysiadać. Fasolka wysiadał zawsze ostatni, bo konduktor pilnuje wszystkiego.',
      },
      {
        m: 'W kącie łazienki, tuż obok pralki, stało coś nowego. Biało-zielony nocnik, który przyjechał wczoraj w kartonie. {name} zaglądał tam już dwa razy i za każdym razem szybko wychodził. Nocnik czekał spokojnie, jak stacja, na której pociąg jeszcze się nie zatrzymał.',
        f: 'W kącie łazienki, tuż obok pralki, stało coś nowego. Biało-zielony nocnik, który przyjechał wczoraj w kartonie. {name} zaglądała tam już dwa razy i za każdym razem szybko wychodziła. Nocnik czekał spokojnie, jak stacja, na której pociąg jeszcze się nie zatrzymał.',
      },
    ],
  },

  'rozwod-rodzicow': {
    title: '{name} i Most Między Dwoma Domami',
    paragraphs: [
      {
        m: 'Sobotni poranek był cichy i jasny. {name} siedział na dywanie w salonie i budował z klocków dwa domy. Jeden miał czerwony dach, drugi niebieski. Między domami zostawił szeroką, pustą przestrzeń.',
        f: 'Sobotni poranek był cichy i jasny. {name} siedziała na dywanie w salonie i budowała z klocków dwa domy. Jeden miał czerwony dach, drugi niebieski. Między domami zostawiła szeroką, pustą przestrzeń.',
      },
      {
        m: 'W czerwonym domu mieszkał pluszowy pies Guzik. W niebieskim mała, drewniana sowa. Rano pies odwiedzał sowę, a wieczorem sowa odwiedzała psa. {name} przenosił ich ostrożnie, dwoma palcami, żeby nikt się nie przewrócił.',
        f: 'W czerwonym domu mieszkał pluszowy pies Guzik. W niebieskim mała, drewniana sowa. Rano pies odwiedzał sowę, a wieczorem sowa odwiedzała psa. {name} przenosiła ich ostrożnie, dwoma palcami, żeby nikt się nie przewrócił.',
      },
      {
        m: 'Z kuchni dobiegały głosy mamy i taty. Mówili spokojnie, ale jakoś inaczej niż zwykle, wolniej i ciszej. {name} nie odrywał wzroku od klocków. Powoli położył długi, płaski klocek pomiędzy domami, jak most.',
        f: 'Z kuchni dobiegały głosy mamy i taty. Mówili spokojnie, ale jakoś inaczej niż zwykle, wolniej i ciszej. {name} nie odrywała wzroku od klocków. Powoli położyła długi, płaski klocek pomiędzy domami, jak most.',
      },
    ],
  },

  'rywalizacja-rodzenstwo': {
    title: '{name} i Wieża Zbudowana dla Dwojga',
    paragraphs: [
      {
        m: 'Deszcz bębnił o parapet, więc zabawa przeniosła się na dywan w salonie. {name} wysypał z pudełka wszystkie klocki naraz. Zrobiła się z nich kolorowa góra, wysoka prawie do kolan. Obok, na kanapie, siedziała starsza siostra i czytała komiks.',
        f: 'Deszcz bębnił o parapet, więc zabawa przeniosła się na dywan w salonie. {name} wysypała z pudełka wszystkie klocki naraz. Zrobiła się z nich kolorowa góra, wysoka prawie do kolan. Obok, na kanapie, siedziała starsza siostra i czytała komiks.',
      },
      {
        m: 'Z klocków powstawała wieża. Najpierw szerokie klocki, potem coraz węższe, a na samej górze czerwony daszek. {name} budował uważnie i wstrzymywał oddech przy każdym piętrze. Wieża urosła wyżej niż pudełko po butach.',
        f: 'Z klocków powstawała wieża. Najpierw szerokie klocki, potem coraz węższe, a na samej górze czerwony daszek. {name} budowała uważnie i wstrzymywała oddech przy każdym piętrze. Wieża urosła wyżej niż pudełko po butach.',
      },
      {
        m: 'Siostra odłożyła komiks i podeszła bliżej. Powiedziała, że dołoży okno, i sięgnęła po klocek z samej góry. {name} przykrył wieżę dłonią, zanim zdążył pomyśleć. To była przecież jego wieża.',
        f: 'Siostra odłożyła komiks i podeszła bliżej. Powiedziała, że dołoży okno, i sięgnęła po klocek z samej góry. {name} przykryła wieżę dłonią, zanim zdążyła pomyśleć. To była przecież jej wieża.',
      },
    ],
  },

  'samodzielne-zasypianie': {
    title: '{name} i Załoga Własnego Łóżka',
    paragraphs: [
      {
        m: 'Nad łóżkiem wisiała girlanda z małych lampek i świeciła ciepłym, żółtym światłem. {name} właśnie skończył wieczorną książkę i zamknął ją na ostatniej stronie. Poduszka była chłodna z jednej strony, a ciepła z drugiej. W pokoju pachniało kremem po kąpieli.',
        f: 'Nad łóżkiem wisiała girlanda z małych lampek i świeciła ciepłym, żółtym światłem. {name} właśnie skończyła wieczorną książkę i zamknęła ją na ostatniej stronie. Poduszka była chłodna z jednej strony, a ciepła z drugiej. W pokoju pachniało kremem po kąpieli.',
      },
      {
        m: 'Na półce nad łóżkiem stała cała załoga: żółw Pancerz, króliczek bez jednego ucha i mały, drewniany samolot. Każdy z nich miał swoje miejsce i nikt go nie zmieniał. {name} sprawdził wieczorem, czy wszyscy są. Byli.',
        f: 'Na półce nad łóżkiem stała cała załoga: żółw Pancerz, króliczek bez jednego ucha i mały, drewniany samolot. Każdy z nich miał swoje miejsce i nikt go nie zmieniał. {name} sprawdziła wieczorem, czy wszyscy są. Byli.',
      },
      {
        m: 'Tata pocałował go w czoło i powiedział, że jest obok. Drzwi zostały uchylone na szerokość dłoni. {name} popatrzył na duże łóżko rodziców po drugiej stronie korytarza. Potem mocniej przytulił żółwia.',
        f: 'Tata pocałował ją w czoło i powiedział, że jest obok. Drzwi zostały uchylone na szerokość dłoni. {name} popatrzyła na duże łóżko rodziców po drugiej stronie korytarza. Potem mocniej przytuliła żółwia.',
      },
    ],
  },

  'trudnosci-z-zasypianiem': {
    title: '{name} i Pociąg do Krainy Snu',
    paragraphs: [
      {
        m: 'Po kąpieli włosy pachniały rumiankiem, a piżama w rakiety była jeszcze ciepła z suszarki. {name} biegał po korytarzu, żeby wysuszyć głowę szybciej. Za oknem robiło się granatowo. W kuchni tata nalewał mleko do kubka.',
        f: 'Po kąpieli włosy pachniały rumiankiem, a piżama w rakiety była jeszcze ciepła z suszarki. {name} biegała po korytarzu, żeby wysuszyć głowę szybciej. Za oknem robiło się granatowo. W kuchni tata nalewał mleko do kubka.',
      },
      {
        m: 'Wieczorem zawsze była jedna książka. Dziś wypadła ta o kocie, który pilnował latarni morskiej. {name} znał ją prawie na pamięć i mówił razem z tatą ostatnie zdanie. Potem trzeba było zamknąć okładkę i zgasić dużą lampę.',
        f: 'Wieczorem zawsze była jedna książka. Dziś wypadła ta o kocie, który pilnował latarni morskiej. {name} znała ją prawie na pamięć i mówiła razem z tatą ostatnie zdanie. Potem trzeba było zamknąć okładkę i zgasić dużą lampę.',
      },
      {
        m: 'Łóżko było posłane, a kołdra odchylona jak zaproszenie. {name} położył się i od razu przypomniał sobie o trzech ważnych sprawach. Chciało mu się pić, chciało mu się jeszcze raz przytulić i koniecznie trzeba było opowiedzieć o dinozaurze z przedszkola. Noc dopiero się zaczynała.',
        f: 'Łóżko było posłane, a kołdra odchylona jak zaproszenie. {name} położyła się i od razu przypomniała sobie o trzech ważnych sprawach. Chciało jej się pić, chciało jej się jeszcze raz przytulić i koniecznie trzeba było opowiedzieć o dinozaurze z przedszkola. Noc dopiero się zaczynała.',
      },
    ],
  },

  'wybiorczos-pokarmowa': {
    title: '{name} i Wyprawa po Siedem Smaków',
    paragraphs: [
      {
        m: 'Sobotnie popołudnie pachniało mąką i cynamonem. Na kuchennym stole leżała biała plama mąki, a w niej odciski małych dłoni. {name} stał na taborecie przy blacie, w fartuchu, który był za długi. Babcia wałkowała ciasto i podśpiewywała pod nosem.',
        f: 'Sobotnie popołudnie pachniało mąką i cynamonem. Na kuchennym stole leżała biała plama mąki, a w niej odciski małych dłoni. {name} stała na taborecie przy blacie, w fartuchu, który był za długi. Babcia wałkowała ciasto i podśpiewywała pod nosem.',
      },
      {
        m: 'Ciastka wycinali szklanką, bo foremki gdzieś się zawieruszyły. Wychodziły z tego same kółka, ale za to idealne. {name} układał je na blaszce, jedno obok drugiego, dokładnie w rzędach. Do środka każdego wciskał palcem małe wgłębienie.',
        f: 'Ciastka wycinały szklanką, bo foremki gdzieś się zawieruszyły. Wychodziły z tego same kółka, ale za to idealne. {name} układała je na blaszce, jedno obok drugiego, dokładnie w rzędach. Do środka każdego wciskała palcem małe wgłębienie.',
      },
      {
        m: 'Kiedy blaszka poszła do piekarnika, babcia postawiła na stole miskę. W misce była zupa jarzynowa, z marchewką, pietruszką i czymś zielonym na wierzchu. {name} przysunął talerz i zajrzał do środka ostrożnie, jak do jaskini. Nie wiedział jeszcze, czy to zielone jest bezpieczne.',
        f: 'Kiedy blaszka poszła do piekarnika, babcia postawiła na stole miskę. W misce była zupa jarzynowa, z marchewką, pietruszką i czymś zielonym na wierzchu. {name} przysunęła talerz i zajrzała do środka ostrożnie, jak do jaskini. Nie wiedziała jeszcze, czy to zielone jest bezpieczne.',
      },
    ],
  },

  'wstrzymywanie-potrzeb': {
    title: '{name} i Sekretny Sygnał Brzuszka',
    paragraphs: [
      {
        m: 'W domu trwała wielka gra w chowanego. {name} siedział w szafie, między kurtkami, i starał się nie oddychać za głośno. Przez szparę wpadał wąski pasek światła. Na dole, koło butów, leżała zgubiona kiedyś skarpetka w paski.',
        f: 'W domu trwała wielka gra w chowanego. {name} siedziała w szafie, między kurtkami, i starała się nie oddychać za głośno. Przez szparę wpadał wąski pasek światła. Na dole, koło butów, leżała zgubiona kiedyś skarpetka w paski.',
      },
      {
        m: 'Tata liczył w salonie do dwudziestu. Liczył powoli, a przy dziesiątce zawsze udawał, że się pomylił. {name} zakrywał usta dłonią, żeby się nie roześmiać. To była najlepsza część zabawy, te sekundy tuż przed.',
        f: 'Tata liczył w salonie do dwudziestu. Liczył powoli, a przy dziesiątce zawsze udawał, że się pomylił. {name} zakrywała usta dłonią, żeby się nie roześmiać. To była najlepsza część zabawy, te sekundy tuż przed.',
      },
      {
        m: 'W brzuchu pojawiło się małe pukanie. Takie ciche, ale wyraźne, jak ktoś, kto stoi za drzwiami i czeka. {name} przestąpił z nogi na nogę w ciemnej szafie. Toaleta była tuż obok, za rogiem, ale gra dopiero się zaczęła.',
        f: 'W brzuchu pojawiło się małe pukanie. Takie ciche, ale wyraźne, jak ktoś, kto stoi za drzwiami i czeka. {name} przestąpiła z nogi na nogę w ciemnej szafie. Toaleta była tuż obok, za rogiem, ale gra dopiero się zaczęła.',
      },
    ],
  },

  'lek-przed-kapiela': {
    title: '{name} i Kapitan Ciepłej Fali',
    paragraphs: [
      {
        m: 'Wieczorem na podłodze w pokoju stała duża miska z wodą. Pływały w niej trzy papierowe statki, zrobione po południu z gazety. {name} klęczał obok i dmuchał w żagle. Statki płynęły przez ocean wielkości miski.',
        f: 'Wieczorem na podłodze w pokoju stała duża miska z wodą. Pływały w niej trzy papierowe statki, zrobione po południu z gazety. {name} klęczała obok i dmuchała w żagle. Statki płynęły przez ocean wielkości miski.',
      },
      {
        m: 'Najlepszy był ten najmniejszy, z niebieskim znaczkiem na boku. Płynął szybko i nigdy nie przewracał się na bok. {name} nazwał go Wiatrak. Woda w misce była letnia i przyjemna na palcach.',
        f: 'Najlepszy był ten najmniejszy, z niebieskim znaczkiem na boku. Płynął szybko i nigdy nie przewracał się na bok. {name} nazwała go Wiatrak. Woda w misce była letnia i przyjemna na palcach.',
      },
      {
        m: 'Z łazienki dobiegł szum lecącej wody. Mama zawołała, że wanna już się napełnia. {name} popatrzył na swoje statki i mocniej ścisnął brzeg miski. W małej misce woda była dobra. W dużej wannie to była zupełnie inna woda.',
        f: 'Z łazienki dobiegł szum lecącej wody. Mama zawołała, że wanna już się napełnia. {name} popatrzyła na swoje statki i mocniej ścisnęła brzeg miski. W małej misce woda była dobra. W dużej wannie to była zupełnie inna woda.',
      },
    ],
  },

  'poranna-organizacja': {
    title: '{name} i Zegar z Kieszonką Czasu',
    paragraphs: [
      {
        m: 'Za oknem było jeszcze szaro, kiedy w kuchni zapaliło się światło. {name} przyszedł tam w skarpetkach i usiadł przy stole. Na stole czekała miska płatków i łyżka z wygiętą rączką. Radio grało cicho, żeby nie obudzić reszty domu.',
        f: 'Za oknem było jeszcze szaro, kiedy w kuchni zapaliło się światło. {name} przyszła tam w skarpetkach i usiadła przy stole. Na stole czekała miska płatków i łyżka z wygiętą rączką. Radio grało cicho, żeby nie obudzić reszty domu.',
      },
      {
        m: 'Płatki najlepiej smakowały wtedy, gdy jeszcze chrupały. {name} nabierał po trochu i liczył, ile razy chrupnie. Za ósmym razem płatki robiły się miękkie i wtedy zabawa się kończyła. Za oknem przejechał pierwszy autobus, ten żółty.',
        f: 'Płatki najlepiej smakowały wtedy, gdy jeszcze chrupały. {name} nabierała po trochu i liczyła, ile razy chrupnie. Za ósmym razem płatki robiły się miękkie i wtedy zabawa się kończyła. Za oknem przejechał pierwszy autobus, ten żółty.',
      },
      {
        m: 'Na krześle leżały przygotowane ubrania: spodnie, bluza i dwie skarpetki nie do pary. W przedpokoju stał zegar, który tykał trochę za głośno. Mama powiedziała, że wychodzą, kiedy duża wskazówka dojdzie do góry. {name} spojrzał na zegar i pomyślał, że wskazówka porusza się dziwnie szybko.',
        f: 'Na krześle leżały przygotowane ubrania: spodnie, bluza i dwie skarpetki nie do pary. W przedpokoju stał zegar, który tykał trochę za głośno. Mama powiedziała, że wychodzą, kiedy duża wskazówka dojdzie do góry. {name} spojrzała na zegar i pomyślała, że wskazówka porusza się dziwnie szybko.',
      },
    ],
  },

  'czas-ekranowy': {
    title: '{name} i Wyspa za Szklanym Oknem',
    paragraphs: [
      {
        m: 'Deszczowe popołudnie, kanapa i koc w zielone paski. {name} leżał z tabletem opartym o poduszkę. Na ekranie mały, żółty lisek skakał po platformach i zbierał gwiazdki. Z kuchni dochodził zapach zapiekanki.',
        f: 'Deszczowe popołudnie, kanapa i koc w zielone paski. {name} leżała z tabletem opartym o poduszkę. Na ekranie mały, żółty lisek skakał po platformach i zbierał gwiazdki. Z kuchni dochodził zapach zapiekanki.',
      },
      {
        m: 'Lisek miał już dwadzieścia dwie gwiazdki. Do końca poziomu brakowało trzech, może czterech. {name} przygryzał wargę i przechylał tablet razem z liskiem, chociaż to wcale nie pomagało. Palce zrobiły się ciepłe od ekranu.',
        f: 'Lisek miał już dwadzieścia dwie gwiazdki. Do końca poziomu brakowało trzech, może czterech. {name} przygryzała wargę i przechylała tablet razem z liskiem, chociaż to wcale nie pomagało. Palce zrobiły się ciepłe od ekranu.',
      },
      {
        m: 'Mama stanęła w drzwiach i powiedziała, że za pięć minut kolacja. Pięć minut brzmiało jak coś bardzo krótkiego. Na dywanie leżały klocki, których {name} nie dotykał od rana. Lisek na ekranie czekał, a klocki czekały jeszcze cierpliwiej.',
        f: 'Mama stanęła w drzwiach i powiedziała, że za pięć minut kolacja. Pięć minut brzmiało jak coś bardzo krótkiego. Na dywanie leżały klocki, których {name} nie dotykała od rana. Lisek na ekranie czekał, a klocki czekały jeszcze cierpliwiej.',
      },
    ],
  },

  'odstawienie-smoczka': {
    title: '{name} i Skarbiec Małych Rzeczy',
    paragraphs: [
      {
        m: 'Wieczór był spokojny, a na parapecie świeciła lampka w kształcie grzybka. {name} siedział na łóżku z drewnianym pudełkiem na kolanach. Pudełko było stare, po herbacie, i miało obtarte rogi. W środku mieszkały same najważniejsze rzeczy.',
        f: 'Wieczór był spokojny, a na parapecie świeciła lampka w kształcie grzybka. {name} siedziała na łóżku z drewnianym pudełkiem na kolanach. Pudełko było stare, po herbacie, i miało obtarte rogi. W środku mieszkały same najważniejsze rzeczy.',
      },
      {
        m: 'Był tam kasztan z zeszłej jesieni, muszelka znad morza i guzik od dziadka. Każdą rzecz {name} wyjmował po kolei i kładł na kołdrze. Kasztan był gładki jak kamień. Muszelka pachniała trochę wakacjami, a trochę kurzem.',
        f: 'Był tam kasztan z zeszłej jesieni, muszelka znad morza i guzik od dziadka. Każdą rzecz {name} wyjmowała po kolei i kładła na kołdrze. Kasztan był gładki jak kamień. Muszelka pachniała trochę wakacjami, a trochę kurzem.',
      },
      {
        m: 'Na dnie pudełka, pod muszelką, leżał smoczek. Ten ulubiony, z niebieskim uchwytem, używany tylko wieczorem. {name} wziął go do ręki i obejrzał ze wszystkich stron. Wieczorem świat robił się miękki właśnie dzięki tej jednej, małej rzeczy.',
        f: 'Na dnie pudełka, pod muszelką, leżał smoczek. Ten ulubiony, z niebieskim uchwytem, używany tylko wieczorem. {name} wzięła go do ręki i obejrzała ze wszystkich stron. Wieczorem świat robił się miękki właśnie dzięki tej jednej, małej rzeczy.',
      },
    ],
  },

  'nowe-rodzenstwo': {
    title: '{name} i Miejsce, Którego Nikt Nie Zabierze',
    paragraphs: [
      {
        m: 'W domu od kilku dni pachniało nowo, proszkiem do prania i czymś słodkim. {name} siedział na podłodze w korytarzu i przyklejał naklejki do kartonu. Naklejki były w kształcie planet i gwiazd. Karton stał tam, bo jeszcze nie wiadomo było, gdzie go postawić.',
        f: 'W domu od kilku dni pachniało nowo, proszkiem do prania i czymś słodkim. {name} siedziała na podłodze w korytarzu i przyklejała naklejki do kartonu. Naklejki były w kształcie planet i gwiazd. Karton stał tam, bo jeszcze nie wiadomo było, gdzie go postawić.',
      },
      {
        m: 'Kiedyś ten korytarz był torem wyścigowym. Jeździły po nim czerwone auto i wóz strażacki, a meta była przy grzejniku. {name} pamiętał każdy zakręt. Auto nadal stało pod szafką i czekało na kolejny wyścig.',
        f: 'Kiedyś ten korytarz był torem wyścigowym. Jeździły po nim czerwone auto i wóz strażacki, a meta była przy grzejniku. {name} pamiętała każdy zakręt. Auto nadal stało pod szafką i czekało na kolejny wyścig.',
      },
      {
        m: 'W pokoju obok, tam gdzie kiedyś była pusta ściana, stało teraz małe łóżeczko. Nad łóżeczkiem wisiała karuzela z owieczkami, która grała cichą melodię. Mama powiedziała, że siostrzyczka przyjedzie do domu w ten weekend. {name} popatrzył na karuzelę i nie bardzo wiedział, co ma o tym myśleć.',
        f: 'W pokoju obok, tam gdzie kiedyś była pusta ściana, stało teraz małe łóżeczko. Nad łóżeczkiem wisiała karuzela z owieczkami, która grała cichą melodię. Mama powiedziała, że siostrzyczka przyjedzie do domu w ten weekend. {name} popatrzyła na karuzelę i nie bardzo wiedziała, co ma o tym myśleć.',
      },
    ],
  },

  'dzielenie-sie': {
    title: '{name} i Skarb, który Rósł od Dzielenia',
    paragraphs: [
      {
        m: 'Na podwórku pachniało skoszoną trawą, a piasek w piaskownicy był jeszcze wilgotny po nocy. {name} przyjechał tam z ciężarówką wywrotką. Wywrotka była pomarańczowa i miała kółko, które lekko piszczało. Piszczało tylko wtedy, gdy jechała szybko.',
        f: 'Na podwórku pachniało skoszoną trawą, a piasek w piaskownicy był jeszcze wilgotny po nocy. {name} przyjechała tam z ciężarówką wywrotką. Wywrotka była pomarańczowa i miała kółko, które lekko piszczało. Piszczało tylko wtedy, gdy jechała szybko.',
      },
      {
        m: 'Wywrotka woziła piasek z jednego końca piaskownicy na drugi. {name} sypał ładunek łopatką i za każdym razem mówił: uwaga, odjazd. Powstał z tego duży kopiec, prawie do pasa. Na kopcu stanęła gałązka zamiast flagi.',
        f: 'Wywrotka woziła piasek z jednego końca piaskownicy na drugi. {name} sypała ładunek łopatką i za każdym razem mówiła: uwaga, odjazd. Powstał z tego duży kopiec, prawie do pasa. Na kopcu stanęła gałązka zamiast flagi.',
      },
      {
        m: 'Do piaskownicy weszła dziewczynka w żółtych kaloszach. Popatrzyła na wywrotkę, potem na kopiec, i przysiadła na brzegu. Zapytała cicho, czy może chwilę pojeździć. {name} mocniej złapał wywrotkę za burtę.',
        f: 'Do piaskownicy weszła dziewczynka w żółtych kaloszach. Popatrzyła na wywrotkę, potem na kopiec, i przysiadła na brzegu. Zapytała cicho, czy może chwilę pojeździć. {name} mocniej złapała wywrotkę za burtę.',
      },
    ],
  },

  'empatia-rozumienie-emocji': {
    title: '{name} i Okulary Pokazujące Uczucia',
    paragraphs: [
      {
        m: 'Po obiedzie w pokoju powstał teatr. Oparcie kanapy było sceną, a koc kurtyną. {name} ustawił w rzędzie całą publiczność: dwa misie, żyrafę i psa na kółkach. Publiczność siedziała bardzo grzecznie.',
        f: 'Po obiedzie w pokoju powstał teatr. Oparcie kanapy było sceną, a koc kurtyną. {name} ustawiła w rzędzie całą publiczność: dwa misie, żyrafę i psa na kółkach. Publiczność siedziała bardzo grzecznie.',
      },
      {
        m: 'Przedstawienie było o wyprawie na biegun. Miś kapitan gubił mapę, żyrafa znajdowała ją pod poduszką, a pies szczekał na końcu. {name} mówił za każdą postać innym głosem. Najtrudniejszy był głos żyrafy, bo musiał być bardzo wysoki.',
        f: 'Przedstawienie było o wyprawie na biegun. Miś kapitan gubił mapę, żyrafa znajdowała ją pod poduszką, a pies szczekał na końcu. {name} mówiła za każdą postać innym głosem. Najtrudniejszy był głos żyrafy, bo musiał być bardzo wysoki.',
      },
      {
        m: 'W drugim pokoju coś głośno stuknęło, a potem rozległ się płacz młodszego brata. Mama pobiegła tam szybkim krokiem. {name} przerwał przedstawienie i przez chwilę nasłuchiwał. Płacz brzmiał inaczej niż zwykle, ale trudno było zgadnąć dlaczego.',
        f: 'W drugim pokoju coś głośno stuknęło, a potem rozległ się płacz młodszego brata. Mama pobiegła tam szybkim krokiem. {name} przerwała przedstawienie i przez chwilę nasłuchiwała. Płacz brzmiał inaczej niż zwykle, ale trudno było zgadnąć dlaczego.',
      },
    ],
  },

  'pierwsze-przyjaznie': {
    title: '{name} i Most z Jednego Słowa',
    paragraphs: [
      {
        m: 'Na chodniku przed domem leżało pudełko kolorowych kred. Słońce grzało w plecy, a asfalt był ciepły pod kolanami. {name} rysował wielkiego smoka, który zajmował już trzy płyty chodnikowe. Smok miał zielone łuski i czerwony ogon.',
        f: 'Na chodniku przed domem leżało pudełko kolorowych kred. Słońce grzało w plecy, a asfalt był ciepły pod kolanami. {name} rysowała wielkiego smoka, który zajmował już trzy płyty chodnikowe. Smok miał zielone łuski i czerwony ogon.',
      },
      {
        m: 'Do smoka trzeba było jeszcze dorysować skrzydła. {name} sięgnął po żółtą kredę, ale została z niej tylko krótka końcówka. Rysowanie takim kikutem szło wolno i palce robiły się kolorowe. Na chodniku został żółty ślad w kształcie łuku.',
        f: 'Do smoka trzeba było jeszcze dorysować skrzydła. {name} sięgnęła po żółtą kredę, ale została z niej tylko krótka końcówka. Rysowanie takim kikutem szło wolno i palce robiły się kolorowe. Na chodniku został żółty ślad w kształcie łuku.',
      },
      {
        m: 'Przy furtce zatrzymał się chłopiec z hulajnogą. Popatrzył na smoka, potem na kredę, i zrobił jeden krok bliżej. {name} podniósł głowę i otworzył usta, żeby coś powiedzieć. Ale słowa akurat gdzieś się schowały.',
        f: 'Przy furtce zatrzymał się chłopiec z hulajnogą. Popatrzył na smoka, potem na kredę, i zrobił jeden krok bliżej. {name} podniosła głowę i otworzyła usta, żeby coś powiedzieć. Ale słowa akurat gdzieś się schowały.',
      },
    ],
  },

  'lek-separacyjny': {
    title: '{name} i Niewidzialna Nitka',
    paragraphs: [
      {
        m: 'W kuchni było ciepło od piekarnika i pachniało jabłkami. {name} siedział przy stole i nawlekał makaron na sznurek. Powstawał z tego długi naszyjnik dla mamy. Mama krzątała się obok i co chwilę mówiła coś śmiesznego.',
        f: 'W kuchni było ciepło od piekarnika i pachniało jabłkami. {name} siedziała przy stole i nawlekała makaron na sznurek. Powstawał z tego długi naszyjnik dla mamy. Mama krzątała się obok i co chwilę mówiła coś śmiesznego.',
      },
      {
        m: 'Makaronowe rurki miały różne kolory, bo mama pofarbowała je rano. Najładniejsze były te fioletowe. {name} układał je według wzoru: dwie fioletowe, jedna żółta i znowu od początku. Sznurek robił się coraz cięższy.',
        f: 'Makaronowe rurki miały różne kolory, bo mama pofarbowała je rano. Najładniejsze były te fioletowe. {name} układała je według wzoru: dwie fioletowe, jedna żółta i znowu od początku. Sznurek robił się coraz cięższy.',
      },
      {
        m: 'W przedpokoju zabrzęczały klucze. Mama powiedziała, że musi wyskoczyć na chwilę do sklepu, a babcia zostanie w domu. {name} odłożył sznurek i wstał od stołu, jakby ktoś go pociągnął za rękę. Naszyjnik został na stole, niedokończony.',
        f: 'W przedpokoju zabrzęczały klucze. Mama powiedziała, że musi wyskoczyć na chwilę do sklepu, a babcia zostanie w domu. {name} odłożyła sznurek i wstała od stołu, jakby ktoś ją pociągnął za rękę. Naszyjnik został na stole, niedokończony.',
      },
    ],
  },

  'lek-przed-ciemnoscia': {
    title: '{name} i Latarnik Ciemnych Godzin',
    paragraphs: [
      {
        m: 'Za oknem dzień powoli chował się za dachami. W pokoju paliła się mała lampka z abażurem w kropki. {name} leżał na dywanie i układał puzzle z rakietą. Brakowało już tylko dwóch kawałków, tych z rogu.',
        f: 'Za oknem dzień powoli chował się za dachami. W pokoju paliła się mała lampka z abażurem w kropki. {name} leżała na dywanie i układała puzzle z rakietą. Brakowało już tylko dwóch kawałków, tych z rogu.',
      },
      {
        m: 'Rakieta na puzzlach leciała między gwiazdami. Gwiazd było mnóstwo, drobnych i błyszczących. {name} znalazł przedostatni kawałek pod skarpetką. Ostatni schował się gdzieś zupełnie i trzeba go było szukać na czworakach.',
        f: 'Rakieta na puzzlach leciała między gwiazdami. Gwiazd było mnóstwo, drobnych i błyszczących. {name} znalazła przedostatni kawałek pod skarpetką. Ostatni schował się gdzieś zupełnie i trzeba go było szukać na czworakach.',
      },
      {
        m: 'Mama zajrzała do pokoju i powiedziała, że czas na piżamę. Puzzle zostały na dywanie, a lampka miała zaraz zgasnąć. {name} spojrzał na ścianę, po której już zaczynały wędrować pierwsze cienie od firanki. Wieczorem ściany zawsze robiły się dziwnie ruchliwe.',
        f: 'Mama zajrzała do pokoju i powiedziała, że czas na piżamę. Puzzle zostały na dywanie, a lampka miała zaraz zgasnąć. {name} spojrzała na ścianę, po której już zaczynały wędrować pierwsze cienie od firanki. Wieczorem ściany zawsze robiły się dziwnie ruchliwe.',
      },
    ],
  },

  'lek-przed-lekarzem': {
    title: '{name} i Doktor Pluszowego Serca',
    paragraphs: [
      {
        m: 'Na dywanie w pokoju urządzony był szpital dla pluszaków. Pacjenci leżeli w rzędzie pod ręcznikiem, który był kocem. {name} miał plastikowy stetoskop i pudełko po butach zamiast apteczki. W apteczce leżały plastry, wata i jedna prawdziwa łyżeczka.',
        f: 'Na dywanie w pokoju urządzony był szpital dla pluszaków. Pacjenci leżeli w rzędzie pod ręcznikiem, który był kocem. {name} miała plastikowy stetoskop i pudełko po butach zamiast apteczki. W apteczce leżały plastry, wata i jedna prawdziwa łyżeczka.',
      },
      {
        m: 'Pierwszym pacjentem był miś ze zwichniętą łapą. {name} osłuchał go dokładnie i powiedział, że potrzebny jest bandaż. Bandaż zrobił się z paska papieru, owiniętego trzy razy. Miś zniósł zabieg bardzo dzielnie.',
        f: 'Pierwszym pacjentem był miś ze zwichniętą łapą. {name} osłuchała go dokładnie i powiedziała, że potrzebny jest bandaż. Bandaż zrobił się z paska papieru, owiniętego trzy razy. Miś zniósł zabieg bardzo dzielnie.',
      },
      {
        m: 'Do pokoju weszła mama z kalendarzem w ręku. Powiedziała, że w czwartek jadą do przychodni na krótkie badanie. {name} spojrzał na swój stetoskop, a potem na drzwi. Bycie lekarzem było znacznie łatwiejsze niż bycie pacjentem.',
        f: 'Do pokoju weszła mama z kalendarzem w ręku. Powiedziała, że w czwartek jadą do przychodni na krótkie badanie. {name} spojrzała na swój stetoskop, a potem na drzwi. Bycie lekarką było znacznie łatwiejsze niż bycie pacjentką.',
      },
    ],
  },

  przeprowadzka: {
    title: '{name} i Mapa Nowego Domu',
    paragraphs: [
      {
        m: 'W nowym pokoju pachniało jeszcze farbą, a pod ścianami stały kartony. Na jednym kartonie napisane było grubym flamastrem: KLOCKI. {name} siedział na parapecie i patrzył na podwórko z drugiego piętra. Podwórko było większe niż to poprzednie.',
        f: 'W nowym pokoju pachniało jeszcze farbą, a pod ścianami stały kartony. Na jednym kartonie napisane było grubym flamastrem: KLOCKI. {name} siedziała na parapecie i patrzyła na podwórko z drugiego piętra. Podwórko było większe niż to poprzednie.',
      },
      {
        m: 'Z kartonu wystawał róg starego dywanu w kwadraty. To był ten sam dywan, co w poprzednim pokoju. {name} rozłożył go na środku podłogi i usiadł dokładnie na tym samym kwadracie co zawsze. Dywan pachniał starym domem.',
        f: 'Z kartonu wystawał róg starego dywanu w kwadraty. To był ten sam dywan, co w poprzednim pokoju. {name} rozłożyła go na środku podłogi i usiadła dokładnie na tym samym kwadracie co zawsze. Dywan pachniał starym domem.',
      },
      {
        m: 'Tata przyniósł kartkę i flamastry, żeby narysować plan nowego mieszkania. Trzeba było zaznaczyć kuchnię, łazienkę i drogę do sklepu. {name} narysował najpierw swój pokój, a potem zatrzymał flamaster nad pustym miejscem. Nie wiedział jeszcze, co powinno tam być.',
        f: 'Tata przyniósł kartkę i flamastry, żeby narysować plan nowego mieszkania. Trzeba było zaznaczyć kuchnię, łazienkę i drogę do sklepu. {name} narysowała najpierw swój pokój, a potem zatrzymała flamaster nad pustym miejscem. Nie wiedziała jeszcze, co powinno tam być.',
      },
    ],
  },

  'niska-samoocena': {
    title: '{name} i Lustro, które Mówiło Prawdę',
    paragraphs: [
      {
        m: 'W sobotę rano na stole rozłożone były farby. Woda w słoiku zrobiła się już szara od pędzli. {name} malował drzewo z bardzo dużą koroną. Korona zajmowała prawie całą kartkę.',
        f: 'W sobotę rano na stole rozłożone były farby. Woda w słoiku zrobiła się już szara od pędzli. {name} malowała drzewo z bardzo dużą koroną. Korona zajmowała prawie całą kartkę.',
      },
      {
        m: 'Liście robiło się przez przyciskanie pędzla płasko do papieru. Wychodziły z tego małe, zielone chmurki. {name} przyciskał pędzel raz po raz i liczył w myślach. Przy trzydziestym liściu drzewo wyglądało już naprawdę gęsto.',
        f: 'Liście robiło się przez przyciskanie pędzla płasko do papieru. Wychodziły z tego małe, zielone chmurki. {name} przyciskała pędzel raz po raz i liczyła w myślach. Przy trzydziestym liściu drzewo wyglądało już naprawdę gęsto.',
      },
      {
        m: 'Do kuchni weszła kuzynka i położyła obok swoją kartkę. Na jej kartce był koń, z grzywą i cieniem pod kopytami. {name} popatrzył na konia, potem na swoje drzewo i cicho przesunął kartkę bliżej brzegu stołu. Nagle liście wydały się trochę zbyt proste.',
        f: 'Do kuchni weszła kuzynka i położyła obok swoją kartkę. Na jej kartce był koń, z grzywą i cieniem pod kopytami. {name} popatrzyła na konia, potem na swoje drzewo i cicho przesunęła kartkę bliżej brzegu stołu. Nagle liście wydały się trochę zbyt proste.',
      },
    ],
  },

  'odpornosc-na-porazke': {
    title: '{name} i Wieża, która Lubiła Upadać',
    paragraphs: [
      {
        m: 'Popołudnie było leniwe, a na stole w kuchni czekała gra planszowa. Pionki stały w rządku: czerwony, niebieski, zielony i żółty. {name} wybrał czerwony, bo czerwony zawsze wygrywał. Tata usiadł naprzeciwko i potasował karty.',
        f: 'Popołudnie było leniwe, a na stole w kuchni czekała gra planszowa. Pionki stały w rządku: czerwony, niebieski, zielony i żółty. {name} wybrała czerwony, bo czerwony zawsze wygrywał. Tata usiadł naprzeciwko i potasował karty.',
      },
      {
        m: 'Gra polegała na tym, żeby dojść do zamku na końcu planszy. Po drodze były mostki, dziury i jedno bardzo długie jezioro. {name} rzucał kostką dwiema rękami, na szczęście. Pierwsza szóstka wypadła od razu i pionek przeskoczył trzy pola naprzód.',
        f: 'Gra polegała na tym, żeby dojść do zamku na końcu planszy. Po drodze były mostki, dziury i jedno bardzo długie jezioro. {name} rzucała kostką dwiema rękami, na szczęście. Pierwsza szóstka wypadła od razu i pionek przeskoczył trzy pola naprzód.',
      },
      {
        m: 'W połowie planszy tata wyciągnął kartę z rysunkiem burzy. Karta mówiła, że wszyscy cofają się do ostatniego mostka. {name} popatrzył na swój czerwony pionek, który wracał na sam początek jeziora. W środku zrobiło się nagle bardzo ciasno.',
        f: 'W połowie planszy tata wyciągnął kartę z rysunkiem burzy. Karta mówiła, że wszyscy cofają się do ostatniego mostka. {name} popatrzyła na swój czerwony pionek, który wracał na sam początek jeziora. W środku zrobiło się nagle bardzo ciasno.',
      },
    ],
  },

  'klamstwa-konfabulacje': {
    title: '{name} i Fabryka Wielkich Opowieści',
    paragraphs: [
      {
        m: 'Wieczorem pod stołem powstała jaskinia z koca. W środku było ciemno, ciepło i trochę duszno, czyli idealnie. {name} zabrał tam latarkę i dwa pluszaki. Latarka rzucała na koc żółte, drżące kółko.',
        f: 'Wieczorem pod stołem powstała jaskinia z koca. W środku było ciemno, ciepło i trochę duszno, czyli idealnie. {name} zabrała tam latarkę i dwa pluszaki. Latarka rzucała na koc żółte, drżące kółko.',
      },
      {
        m: 'W jaskini opowiadało się historie. Tego wieczoru historia była o wielkim, zielonym smoku, który mieszkał na strychu przedszkola. Smok jadł tylko kanapki z serem i bał się deszczu. {name} opowiadał coraz ciszej, a pluszaki słuchały bez mrugnięcia.',
        f: 'W jaskini opowiadało się historie. Tego wieczoru historia była o wielkim, zielonym smoku, który mieszkał na strychu przedszkola. Smok jadł tylko kanapki z serem i bał się deszczu. {name} opowiadała coraz ciszej, a pluszaki słuchały bez mrugnięcia.',
      },
      {
        m: 'Do jaskini zajrzała mama i zapytała, skąd na dywanie w salonie wzięła się plama po soku. Pod kocem zrobiło się cicho. {name} poświecił latarką w bok, na ścianę z koca. Historia o smoku była łatwa. Ta o soku jakoś trudniejsza.',
        f: 'Do jaskini zajrzała mama i zapytała, skąd na dywanie w salonie wzięła się plama po soku. Pod kocem zrobiło się cicho. {name} poświeciła latarką w bok, na ścianę z koca. Historia o smoku była łatwa. Ta o soku jakoś trudniejsza.',
      },
    ],
  },

  'smierc-w-rodzinie': {
    title: '{name} i Ogród, w którym Zostają Wspomnienia',
    paragraphs: [
      {
        m: 'W ogrodzie za domem rosła stara jabłoń, a pod nią stała drewniana ławka. Wrześniowe słońce było już niskie i grzało tylko trochę. {name} siedział na ławce z pudełkiem po butach na kolanach. W trawie leżały jabłka, które spadły w nocy.',
        f: 'W ogrodzie za domem rosła stara jabłoń, a pod nią stała drewniana ławka. Wrześniowe słońce było już niskie i grzało tylko trochę. {name} siedziała na ławce z pudełkiem po butach na kolanach. W trawie leżały jabłka, które spadły w nocy.',
      },
      {
        m: 'W pudełku były same skarby z tego ogrodu. Kamyk z dziurką, suchy liść klonu i zdjęcie zrobione zeszłego lata. Na zdjęciu wszyscy mrużyli oczy od słońca. {name} wyjmował rzeczy powoli i układał je na ławce w rządku.',
        f: 'W pudełku były same skarby z tego ogrodu. Kamyk z dziurką, suchy liść klonu i zdjęcie zrobione zeszłego lata. Na zdjęciu wszyscy mrużyli oczy od słońca. {name} wyjmowała rzeczy powoli i układała je na ławce w rządku.',
      },
      {
        m: 'Z domu wyszła mama i usiadła obok, całkiem blisko. Przez chwilę oboje patrzyli na jabłoń i nikt nic nie mówił. {name} położył palec na zdjęciu, dokładnie tam, gdzie stała babcia. W ogrodzie było bardzo cicho, tak cicho, że słychać było pszczoły.',
        f: 'Z domu wyszła mama i usiadła obok, całkiem blisko. Przez chwilę obie patrzyły na jabłoń i nikt nic nie mówił. {name} położyła palec na zdjęciu, dokładnie tam, gdzie stała babcia. W ogrodzie było bardzo cicho, tak cicho, że słychać było pszczoły.',
      },
    ],
  },

  'choroba-w-rodzinie': {
    title: '{name} i Latarnia dla Kogoś Bliskiego',
    paragraphs: [
      {
        m: 'W kuchni na małym ogniu bulgotał rosół, a para osiadała na szybie. {name} stał na taborecie i rysował palcem na zaparowanym oknie. Powstało z tego słońce, dom i coś w rodzaju psa. Na blacie leżała marchewka, która nie zmieściła się do garnka.',
        f: 'W kuchni na małym ogniu bulgotał rosół, a para osiadała na szybie. {name} stała na taborecie i rysowała palcem na zaparowanym oknie. Powstało z tego słońce, dom i coś w rodzaju psa. Na blacie leżała marchewka, która nie zmieściła się do garnka.',
      },
      {
        m: 'Rosół gotował się od rana i był dla taty. Tata leżał w pokoju, przykryty kocem, i odpoczywał już drugi dzień. {name} zajrzał tam wcześniej na palcach i szybko wyszedł. W domu wszyscy chodzili teraz jakoś ciszej.',
        f: 'Rosół gotował się od rana i był dla taty. Tata leżał w pokoju, przykryty kocem, i odpoczywał już drugi dzień. {name} zajrzała tam wcześniej na palcach i szybko wyszła. W domu wszyscy chodzili teraz jakoś ciszej.',
      },
      {
        m: 'Na stole leżała kartka i pisaki. Mama powiedziała, że można narysować coś, co postawią przy łóżku. {name} wybrał żółty pisak i narysował duże, okrągłe słońce. Potem zatrzymał rękę, bo nie wiedział, jak narysować to, o co naprawdę chciał zapytać.',
        f: 'Na stole leżała kartka i pisaki. Mama powiedziała, że można narysować coś, co postawią przy łóżku. {name} wybrała żółty pisak i narysowała duże, okrągłe słońce. Potem zatrzymała rękę, bo nie wiedziała, jak narysować to, o co naprawdę chciała zapytać.',
      },
    ],
  },

  'choroba-dziecka': {
    title: '{name} i Tarcza z Miękkiego Koca',
    paragraphs: [
      {
        m: 'Łóżko było ustawione tak, żeby widać było okno. Za oknem rosła brzoza, a na jej gałęzi siadały codziennie te same dwie sroki. {name} leżał pod kocem w niebieskie gwiazdy i obserwował ptaki. Koc był miękki i pachniał domem.',
        f: 'Łóżko było ustawione tak, żeby widać było okno. Za oknem rosła brzoza, a na jej gałęzi siadały codziennie te same dwie sroki. {name} leżała pod kocem w niebieskie gwiazdy i obserwowała ptaki. Koc był miękki i pachniał domem.',
      },
      {
        m: 'Sroki miały już swoje imiona: Czarna i Prawie Czarna. Czarna zawsze siadała pierwsza i rozglądała się na boki. {name} liczył, ile razy podskoczy, zanim odleci. Rekord wynosił jedenaście podskoków.',
        f: 'Sroki miały już swoje imiona: Czarna i Prawie Czarna. Czarna zawsze siadała pierwsza i rozglądała się na boki. {name} liczyła, ile razy podskoczy, zanim odleci. Rekord wynosił jedenaście podskoków.',
      },
      {
        m: 'Do pokoju weszła pielęgniarka i uśmiechnęła się od progu. Powiedziała, że za chwilę będzie krótkie badanie i że mama zaraz przyjdzie. {name} podciągnął koc trochę wyżej i nie odrywał oczu od brzozy. Sroki siedziały spokojnie, jakby nic się nie działo.',
        f: 'Do pokoju weszła pielęgniarka i uśmiechnęła się od progu. Powiedziała, że za chwilę będzie krótkie badanie i że mama zaraz przyjdzie. {name} podciągnęła koc trochę wyżej i nie odrywała oczu od brzozy. Sroki siedziały spokojnie, jakby nic się nie działo.',
      },
    ],
  },

  'akceptacja-odmiennosci-wlasnej': {
    title: '{name} i Kamień, którego Nie Ma Drugiego',
    paragraphs: [
      {
        m: 'Na parapecie w pokoju stała cała kolekcja kamieni z wakacji. Było ich czternaście i każdy leżał na swoim miejscu. {name} przecierał je ściereczką po kolei, żeby lepiej błyszczały. Przez okno wpadało popołudniowe światło i kładło się na parapecie długim pasem.',
        f: 'Na parapecie w pokoju stała cała kolekcja kamieni z wakacji. Było ich czternaście i każdy leżał na swoim miejscu. {name} przecierała je ściereczką po kolei, żeby lepiej błyszczały. Przez okno wpadało popołudniowe światło i kładło się na parapecie długim pasem.',
      },
      {
        m: 'Najciekawszy był ten szary, z białą linią w poprzek. Nie pasował do żadnego innego i nie dało się go z niczym pomylić. {name} trzymał go najdłużej w dłoni, bo był gładki i chłodny. Ten kamień zawsze stał na samym środku.',
        f: 'Najciekawszy był ten szary, z białą linią w poprzek. Nie pasował do żadnego innego i nie dało się go z niczym pomylić. {name} trzymała go najdłużej w dłoni, bo był gładki i chłodny. Ten kamień zawsze stał na samym środku.',
      },
      {
        m: 'Zza ściany słychać było, jak dzieci z podwórka wołają do siebie po imieniu. Wołały głośno i wszystkie naraz. {name} odstawił kamień na parapet i przez chwilę słuchał. W przedszkolu ktoś powiedział dziś, że robi wszystko inaczej niż reszta.',
        f: 'Zza ściany słychać było, jak dzieci z podwórka wołają do siebie po imieniu. Wołały głośno i wszystkie naraz. {name} odstawiła kamień na parapet i przez chwilę słuchała. W przedszkolu ktoś powiedział dziś, że robi wszystko inaczej niż reszta.',
      },
    ],
  },

  'akceptacja-odmiennosci-rowiesnikow': {
    title: '{name} i Lornetka Wielu Światów',
    paragraphs: [
      {
        m: 'W parku, przy alejce z kasztanowcami, stała ławka z widokiem na staw. {name} siedział na niej z lornetką, która była trochę za duża na jego nos. Lornetkę pożyczył dziadek i kazał obchodzić się z nią ostrożnie. Przez szkła świat robił się nagle bardzo blisko.',
        f: 'W parku, przy alejce z kasztanowcami, stała ławka z widokiem na staw. {name} siedziała na niej z lornetką, która była trochę za duża na jej nos. Lornetkę pożyczył dziadek i kazał obchodzić się z nią ostrożnie. Przez szkła świat robił się nagle bardzo blisko.',
      },
      {
        m: 'W liściach siedziały ptaki, każdy zupełnie inny. Sikorka miała żółty brzuszek, kos był cały czarny, a wróbel brązowy i rozczochrany. {name} liczył gatunki i zapamiętywał kolory. Najtrudniej było znaleźć dzięcioła, który stukał gdzieś wysoko.',
        f: 'W liściach siedziały ptaki, każdy zupełnie inny. Sikorka miała żółty brzuszek, kos był cały czarny, a wróbel brązowy i rozczochrany. {name} liczyła gatunki i zapamiętywała kolory. Najtrudniej było znaleźć dzięcioła, który stukał gdzieś wysoko.',
      },
      {
        m: 'Alejką nadjechał chłopiec na wózku, a obok niego szła jego mama. {name} opuścił lornetkę i patrzył chwilę dłużej, niż wypada. W głowie zrobiło się pełno pytań, wszystkie naraz. Jedno z nich prawie wyskoczyło na głos.',
        f: 'Alejką nadjechał chłopiec na wózku, a obok niego szła jego mama. {name} opuściła lornetkę i patrzyła chwilę dłużej, niż wypada. W głowie zrobiło się pełno pytań, wszystkie naraz. Jedno z nich prawie wyskoczyło na głos.',
      },
    ],
  },

  'wykluczenie-rowiesnicze': {
    title: '{name} i Ognisko, przy którym Jest Miejsce',
    paragraphs: [
      {
        m: 'Po przedszkolu w kuchni czekało kakao z pianką. Kubek był ciepły w dłoniach, a pianka powoli znikała. {name} siedział na kanapie z podwiniętymi nogami i patrzył w okno. Na dworze wiatr przewracał liście po chodniku.',
        f: 'Po przedszkolu w kuchni czekało kakao z pianką. Kubek był ciepły w dłoniach, a pianka powoli znikała. {name} siedziała na kanapie z podwiniętymi nogami i patrzyła w okno. Na dworze wiatr przewracał liście po chodniku.',
      },
      {
        m: 'Obok, na kanapie, leżał pluszowy lis Kubuś. Kubuś miał wytartą łapę i jedno oko przyszyte nieco krzywo. {name} posadził go blisko, tuż przy kolanie. Lis słuchał zawsze i nigdy nie odchodził do innych.',
        f: 'Obok, na kanapie, leżał pluszowy lis Kubuś. Kubuś miał wytartą łapę i jedno oko przyszyte nieco krzywo. {name} posadziła go blisko, tuż przy kolanie. Lis słuchał zawsze i nigdy nie odchodził do innych.',
      },
      {
        m: 'Mama usiadła obok i zapytała, jak było w przedszkolu. {name} długo mieszał kakao łyżeczką, choć pianka już dawno zniknęła. Dziś przy stoliku z klockami zabrakło jednego krzesła. To znaczy, krzesło było, ale ktoś powiedział, że jest zajęte.',
        f: 'Mama usiadła obok i zapytała, jak było w przedszkolu. {name} długo mieszała kakao łyżeczką, choć pianka już dawno zniknęła. Dziś przy stoliku z klockami zabrakło jednego krzesła. To znaczy, krzesło było, ale ktoś powiedział, że jest zajęte.',
      },
    ],
  },

  'zrozumienie-celu-nauki': {
    title: '{name} i Klucz do Tysiąca Drzwi',
    paragraphs: [
      {
        m: 'W ogrodzie za domem, pod kamieniem przy grządce, mieszkały mrówki. {name} kucał obok z lupą i obserwował ich drogę. Mrówki szły równym szeregiem, jedna za drugą, i niosły coś białego. Trawa była jeszcze mokra po deszczu.',
        f: 'W ogrodzie za domem, pod kamieniem przy grządce, mieszkały mrówki. {name} kucała obok z lupą i obserwowała ich drogę. Mrówki szły równym szeregiem, jedna za drugą, i niosły coś białego. Trawa była jeszcze mokra po deszczu.',
      },
      {
        m: 'Przez lupę mrówka wyglądała jak małe zwierzę w pancerzu. Miała cieniutkie nogi i czułki, które ciągle się ruszały. {name} przesunął lupę wzdłuż całego szeregu, aż do szpary w ziemi. Tam mrówki znikały, jedna po drugiej.',
        f: 'Przez lupę mrówka wyglądała jak małe zwierzę w pancerzu. Miała cieniutkie nogi i czułki, które ciągle się ruszały. {name} przesunęła lupę wzdłuż całego szeregu, aż do szpary w ziemi. Tam mrówki znikały, jedna po drugiej.',
      },
      {
        m: 'Z domu zawołał tata, że pora na zadanie z czytania. Na stole czekał zeszyt i książka z zakładką na dwudziestej stronie. {name} popatrzył jeszcze raz na mrówki i wstał niechętnie. Mrówki były prawdziwe, a literki w zeszycie jakieś takie nie do końca.',
        f: 'Z domu zawołał tata, że pora na zadanie z czytania. Na stole czekał zeszyt i książka z zakładką na dwudziestej stronie. {name} popatrzyła jeszcze raz na mrówki i wstała niechętnie. Mrówki były prawdziwe, a literki w zeszycie jakieś takie nie do końca.',
      },
    ],
  },

  'moczenie-nocne': {
    title: '{name} i Nocna Straż Suchych Snów',
    paragraphs: [
      {
        m: 'Wieczorem pościel w rakiety była świeżo zmieniona i chłodna. Pachniała proszkiem i trochę wiatrem z balkonu. {name} wskoczył na łóżko i przetoczył się na sam środek. Nad łóżkiem świeciła girlanda w kształcie małych chmurek.',
        f: 'Wieczorem pościel w rakiety była świeżo zmieniona i chłodna. Pachniała proszkiem i trochę wiatrem z balkonu. {name} wskoczyła na łóżko i przetoczyła się na sam środek. Nad łóżkiem świeciła girlanda w kształcie małych chmurek.',
      },
      {
        m: 'Wieczorna zasada była prosta: najpierw łazienka, potem książka, na końcu światło. {name} znał ją na pamięć i pilnował kolejności lepiej niż dorośli. Książka była o kosmonaucie, który zgubił rękawicę. Rękawica znalazła się dopiero na ostatniej stronie.',
        f: 'Wieczorna zasada była prosta: najpierw łazienka, potem książka, na końcu światło. {name} znała ją na pamięć i pilnowała kolejności lepiej niż dorośli. Książka była o kosmonaucie, który zgubił rękawicę. Rękawica znalazła się dopiero na ostatniej stronie.',
      },
      {
        m: 'Mama zgasiła lampę i zamknęła drzwi do połowy. W pokoju zrobiło się granatowo i cicho. {name} podciągnął kołdrę pod brodę i pomyślał o poranku. Czasem rano pościel była sucha, a czasem nie i wtedy dzień zaczynał się dziwnie.',
        f: 'Mama zgasiła lampę i zamknęła drzwi do połowy. W pokoju zrobiło się granatowo i cicho. {name} podciągnęła kołdrę pod brodę i pomyślała o poranku. Czasem rano pościel była sucha, a czasem nie i wtedy dzień zaczynał się dziwnie.',
      },
    ],
  },

  'wizyta-w-szpitalu': {
    title: '{name} i Załoga Odważnej Torby',
    paragraphs: [
      {
        m: 'W przedpokoju stała otwarta torba na kółkach, w zielone paski. Obok leżał stos rzeczy: piżama, szczoteczka, skarpetki i książka z naklejkami. {name} siedział na dywanie i pakował wszystko po kolei. Torba połykała rzeczy jedna po drugiej.',
        f: 'W przedpokoju stała otwarta torba na kółkach, w zielone paski. Obok leżał stos rzeczy: piżama, szczoteczka, skarpetki i książka z naklejkami. {name} siedziała na dywanie i pakowała wszystko po kolei. Torba połykała rzeczy jedna po drugiej.',
      },
      {
        m: 'Najważniejszy był miś Antek, który jechał zawsze i wszędzie. Antek dostał miejsce na samej górze, tak żeby widział, co się dzieje. {name} sprawdził jeszcze, czy w bocznej kieszeni jest latarka. Latarka była, razem z zapasową baterią.',
        f: 'Najważniejszy był miś Antek, który jechał zawsze i wszędzie. Antek dostał miejsce na samej górze, tak żeby widział, co się dzieje. {name} sprawdziła jeszcze, czy w bocznej kieszeni jest latarka. Latarka była, razem z zapasową baterią.',
      },
      {
        m: 'Tata usiadł obok na podłodze i powiedział, że jutro rano jadą do szpitala. Powiedział też, że będzie tam przez cały czas. {name} zapiął suwak torby do końca i przez moment trzymał rękę na uchwycie. Szpital był jeszcze daleko, ale torba stała już przy drzwiach.',
        f: 'Tata usiadł obok na podłodze i powiedział, że jutro rano jadą do szpitala. Powiedział też, że będzie tam przez cały czas. {name} zapięła suwak torby do końca i przez moment trzymała rękę na uchwycie. Szpital był jeszcze daleko, ale torba stała już przy drzwiach.',
      },
    ],
  },
};
