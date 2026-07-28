/**
 * v4 landing-page copy overrides (spec-lp-v4-rollout.md, F2) — hero headline
 * in the "problem? promise." format plus four pain scenes and a relief line.
 * Merged over Topic at render time; mycie-zebow lives directly in topics.ts
 * as the pilot. Review before production.
 */

export interface TopicV4Content {
  headline: string;
  headlineAccent: string;
  intro: string;
  painScenes: [string, string, string, string];
  painRelief: string;
}

/** Keyed by topic slug. */
export const TOPIC_V4_CONTENT: Record<string, TopicV4Content> = {
  'adaptacja-przedszkolna': {
    headline: 'Twoje dziecko nie chce iść do przedszkola?',
    headlineAccent: 'Jutro rano zamiast łez — pierwszy krok za bramkę.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — sprawia, że przedszkole staje się znajome, zanim jeszcze przekroczy próg.',
    painScenes: [
      '„Boli mnie brzuszek” — codziennie o siódmej rano.',
      'Kurczowo trzymana ręka przy szatni. Pożegnanie ciągnie się dwadzieścia minut.',
      'Odchodzisz i słyszysz płacz przez zamknięte drzwi. Potem nosisz go w głowie do południa.',
      'Wieczorem pytasz, jak było. „Fajnie”. A rano wszystko od nowa.',
    ],
    painRelief:
      'To nie Twoja wina i nie znaczy, że dziecko już zawsze będzie tak znosić rozstania. Jest coś, co możecie zrobić jeszcze dziś wieczorem — zanim jutro znowu staniecie przy tej bramce.',
  },

  'bicie-innych': {
    headline: 'Twoje dziecko bije inne dzieci?',
    headlineAccent: 'Jutro na placu zabaw zamiast ciosu — słowo.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje mu, co zrobić ze złością, zanim ta trafi w kogoś obok.',
    painScenes: [
      'Telefon z przedszkola. Znowu.',
      'Plac zabaw: sekunda i już jest popchnięcie. Nie zdążysz nawet wstać z ławki.',
      'W domu o zabraną zabawkę — uderzenie w rodzeństwo, zanim padnie jedno słowo.',
      'Mówisz „nie bijemy” po raz setny. Kiwa głową. Za pięć minut to samo.',
    ],
    painRelief:
      'Twoje dziecko nie jest złe i nie wychowujesz go źle. Ono po prostu nie ma jeszcze słów na to, co czuje w ciele — a te słowa możesz mu dać, zaczynając od dzisiejszego wieczoru.',
  },

  'bunt-odmowa-wspolpracy': {
    headline: 'Na każdą prośbę słyszysz „nie”?',
    headlineAccent: 'Jutro rano zamiast walki o buty — wspólna wyprawa.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje mu, że „razem” bywa ciekawsze niż „po mojemu”.',
    painScenes: [
      '„Nie!” — jeszcze zanim skończysz zdanie.',
      'Dwadzieścia minut walki o buty. Wychodzicie spóźnieni i oboje wściekli.',
      'Mówisz „ubieraj się” — dziecko robi dokładnie odwrotnie i patrzy Ci prosto w oczy.',
      'Wieczorem myślisz: dzisiaj znowu skończyło się na krzyku. A przecież nie tak to sobie wyobrażałeś.',
    ],
    painRelief:
      'To nie znaczy, że tracisz autorytet — dwulatek broni swojej odrębności, nie walczy z Tobą. Przez ten etap da się przejść łagodniej i możecie zacząć jeszcze dziś.',
  },

  'czeste-pobudki-nocne': {
    headline: 'Dziecko budzi się kilka razy w nocy?',
    headlineAccent: 'Dziś w nocy zamiast trzeciego wstawania — spokojny powrót do snu.',
    intro: 'Bajka, w której Twoje dziecko jest bohaterem — uczy je, że noc da się przespać samemu.',
    painScenes: [
      'Druga w nocy. Płacz. Wstajesz po raz trzeci.',
      'Ledwo zaśniesz — i znowu to samo wołanie z drugiego pokoju.',
      'Kładziesz je z powrotem. Zasypia przy Tobie. Odsuwasz się — otwiera oczy.',
      'Rano idziesz do pracy na czterech godzinach snu poszatkowanych na kawałki.',
    ],
    painRelief:
      'Dziecko nie robi tego na złość, a Ty niczego nie zepsułeś nocnym noszeniem. Nocny lęk da się oswoić — i można zacząć jeszcze przed dzisiejszym zaśnięciem.',
  },

  'nadwrazliwosc-sensoryczna': {
    headline: 'Twoje dziecko zatyka uszy i ucieka od hałasu?',
    headlineAccent: 'Następne wyjście z domu może wyglądać zupełnie inaczej.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pomaga mu zrozumieć własne zmysły i mieć na nie sposób.',
    painScenes: [
      'Supermarket. Dłonie na uszach, płacz przy kasie, wychodzicie bez zakupów.',
      'Metka w koszulce. Szew w skarpetce. Poranek zaczyna się od krzyku.',
      'Śmiech innych dzieci na urodzinach — a Twoje chowa się w kącie za kurtkami.',
      'Ktoś rzuca: „przecież nic się nie dzieje, nie przesadzaj”.',
    ],
    painRelief:
      'Twoje dziecko nie przesadza — jego układ nerwowy naprawdę słyszy i czuje mocniej. Można mu dać na to język i sposób, jeszcze zanim wybierzecie się gdzieś następnym razem.',
  },

  'napady-zlosci': {
    headline: 'Napady złości wybuchają z niczego?',
    headlineAccent: 'Następnym razem zamiast huraganu — sposób na jego zatrzymanie.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — daje mu imię i sposób na złość, która dziś nim rządzi.',
    painScenes: [
      'Kolejka do kasy. Dziecko na podłodze, ludzie odwracają głowy.',
      'Powód: nie ten kubek. Krzyk trwa czterdzieści minut.',
      'Urodziny kolegi kończą się wyjściem po dziesięciu minutach.',
      'Po wszystkim przytula się i mówi „przepraszam”. Samo nie wie, co się stało.',
    ],
    painRelief:
      'Wybuchy nie są dowodem na to, że czegoś zaniedbujesz — mały mózg dopiero uczy się hamować. Możesz mu w tym pomóc, zaczynając od dzisiejszego wieczoru.',
  },

  niesmialosci: {
    headline: 'Twoje dziecko stoi z boku, gdy inne się bawią?',
    headlineAccent: 'Może zrobić pierwszy krok — i wcale nie musi przestać być sobą.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje mu, że jedno zdanie wystarczy, by dołączyć do zabawy.',
    painScenes: [
      'Plac zabaw. Wszyscy biegają, Twoje trzyma Cię za rękę i patrzy.',
      'Pani w przedszkolu mówi: „bardzo grzeczne, tylko trochę na uboczu”.',
      'Ktoś zagaduje — dziecko chowa twarz w Twojej kurtce.',
      'W domu opowiada, jak fajnie byłoby bawić się z Julką. Jutro znowu nie podejdzie.',
    ],
    painRelief:
      'Nieśmiałość to nie wada do naprawienia — to temperament, który potrzebuje małych zwycięstw. Pierwsze z nich możecie przeżyć razem jeszcze dziś, w bezpiecznym miejscu: w książce.',
  },

  odpieluchowanie: {
    headline: 'Nocnik stoi nieużywany, a wy stoicie w miejscu?',
    headlineAccent: 'Ten mały mebel może przestać być wrogiem.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — robi z nocnika kolejny krok dorastania, a nie przymus.',
    painScenes: [
      'Naklejki, tabelka, nagrody. Zadziałało na dwa dni.',
      '„Nie chcę!” — i ucieczka z gołą pupą przez cały korytarz.',
      'Siedzi trzydzieści sekund, wstaje, a mokro robi się dwie minuty później.',
      'Ktoś pyta: „jak to, jeszcze w pieluszce?”. I znowu to ukłucie.',
    ],
    painRelief:
      'Nie jesteście spóźnieni — gotowość przychodzi u każdego dziecka w swoim czasie, a presja tylko ją oddala. Da się to rozegrać inaczej, zaczynając od dzisiejszej bajki na dobranoc.',
  },

  'rozwod-rodzicow': {
    headline: 'Rozstajecie się i nie wiesz, jak powiedzieć to dziecku?',
    headlineAccent: 'Dziś wieczorem możesz mu przekazać to, co najważniejsze.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — mówi mu, że nie jest niczemu winne i że kochają je oboje rodzice.',
    painScenes: [
      'Pyta, czy tata zostanie dziś na noc. Nie wiesz, co odpowiedzieć.',
      'Bywa smutne bez powodu, a chwilę później wybucha złością o drobiazg.',
      'Słyszysz przypadkiem, jak mówi do misia: „bo ja byłem niegrzeczny”.',
      'Zaczynasz rozmowę, po trzech zdaniach brakuje słów i oboje milkniecie.',
    ],
    painRelief:
      'Dzieci często biorą winę na siebie — właśnie dlatego potrzebują usłyszeć wprost, że tak nie jest. Nie musisz mieć na to idealnych zdań: można je podać delikatnie, w historii czytanej wieczorem.',
  },

  'rywalizacja-rodzenstwo': {
    headline: 'Rodzeństwo kłóci się od rana do wieczora?',
    headlineAccent: 'W tym domu da się usłyszeć coś innego niż „to moje!”.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje, że uwagi i miłości nie trzeba sobie wyrywać.',
    painScenes: [
      'Bójka o pilota. Potem o miejsce na kanapie. Potem o to, kto pierwszy wszedł do łazienki.',
      'Starsze uderza młodsze. Młodsze prowokuje, żeby starsze uderzyło.',
      'Rozdzielasz je dziesiąty raz tego dnia i nie wiesz już, kto zaczął.',
      'Wieczorem jedno pyta cicho: „kogo kochasz bardziej?”.',
    ],
    painRelief:
      'Zazdrość między rodzeństwem nie znaczy, że dzielisz uwagę niesprawiedliwie — dziecko po prostu boi się, że jej zabraknie. Tę obawę da się rozbroić, zaczynając od dzisiejszego wieczoru.',
  },

  'samodzielne-zasypianie': {
    headline: 'Twoje dziecko nie chce spać w swoim łóżku?',
    headlineAccent: 'Dziś w nocy jego pokój może przestać być najgorszym miejscem na świecie.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — zamienia własne łóżko w miejsce, do którego samo chce wracać.',
    painScenes: [
      'Zasypia przy Tobie. Wstajesz — otwiera oczy.',
      'Druga w nocy: małe kroki na korytarzu i „mogę do was?”.',
      'Budzisz się na dziesięciu centymetrach materaca, ze stopą dziecka na plecach.',
      'Próbowaliście metody stopniowej, lampki, nagród. Trzy dni i koniec.',
    ],
    painRelief:
      'To nie porażka wychowawcza — dziecku potrzebne jest poczucie, że jego pokój jest bezpieczny, a nie kolejna technika. To poczucie można zacząć budować już dziś wieczorem.',
  },

  'trudnosci-z-zasypianiem': {
    headline: 'Wieczór zamienia się w godzinną walkę o sen?',
    headlineAccent: 'Dziś zasypianie może zająć tyle, co jedna bajka.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — prowadzi je z rozbieganego dnia prosto w sen.',
    painScenes: [
      '„Chce mi się pić”. Potem siusiu. Potem jeszcze jedno przytulenie.',
      'Wpół do dziesiątej, a w łóżku ktoś śpiewa i skacze.',
      'Siedzisz przy łóżku i boisz się poruszyć, bo podłoga skrzypnie.',
      'Wychodzisz z pokoju o dwudziestej drugiej. Twój wieczór właśnie się skończył.',
    ],
    painRelief:
      'Trudność z zasypianiem to zwykle nadmiar bodźców, nie zła wola — mózg dziecka potrzebuje wyraźnego sygnału „koniec dnia”. Taki sygnał możecie mieć już od dzisiejszego wieczoru.',
  },

  'wybiorczos-pokarmowa': {
    headline: 'Twoje dziecko je tylko kilka rzeczy?',
    headlineAccent: 'Nowy smak da się poznać najpierw w bajce — bez awantury przy stole.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — oswaja nowe smaki, zanim te trafią na talerz.',
    painScenes: [
      '„Nie lubię” — zanim spróbuje, czasem zanim spojrzy.',
      'Gotujesz godzinę. Talerz wraca pełny.',
      'Trzy dopuszczone potrawy. Od pół roku te same.',
      'Ktoś przy stole rzuca: „u nas by zjadło, jakby zgłodniało”.',
    ],
    painRelief:
      'Wybiórczość to najczęściej sprawa tekstur i lęku przed nieznanym, a nie kaprys czy błąd w gotowaniu. Ciekawość da się obudzić poza stołem — na przykład wieczorem, nad książką.',
  },

  'wstrzymywanie-potrzeb': {
    headline: 'Twoje dziecko wstrzymuje siusiu i kupę?',
    headlineAccent: 'Toaleta może przestać być miejscem, którego się boi.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pomaga mu na nowo zaufać własnemu ciału.',
    painScenes: [
      'Skrzyżowane nogi, czerwona twarz i uparte „nie muszę”.',
      'Trzeci dzień bez kupy. Liczysz dni i martwisz się coraz bardziej.',
      'Wieczorem ból brzucha i płacz, bo teraz już naprawdę boli.',
      'W łazience prosisz, tłumaczysz, w końcu podnosisz głos. Nikt na tym nie wygrywa.',
    ],
    painRelief:
      'To nie upór ani lenistwo — najczęściej pamięć jednego bolesnego razu. Ten strach da się rozmontować spokojnie, zaczynając od dzisiejszej bajki.',
  },

  'lek-przed-kapiela': {
    headline: 'Kąpiel kończy się krzykiem?',
    headlineAccent: 'Dziś wieczorem wanna może być miejscem przygody.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — zamienia mycie głowy w podwodną wyprawę.',
    painScenes: [
      'Ucieczka na sam dźwięk napuszczanej wanny.',
      'Pierwsza kropla na twarzy — i już jest płacz.',
      'Mycie głowy: trzydzieści sekund, które oboje wspominacie z ulgą.',
      'Wychodzicie z łazienki mokrzy, zmęczeni i bez umytych włosów.',
    ],
    painRelief:
      'Ten strach zwykle bierze się z jednego nieprzyjemnego razu albo z wrażliwości na wodę na twarzy — nie z rozpieszczenia. Można go oswoić delikatnie, jeszcze przed dzisiejszą kąpielą.',
  },

  'poranna-organizacja': {
    headline: 'Rano nic nie idzie na czas?',
    headlineAccent: 'Jutrzejszy poranek może mieć swój porządek — bez popędzania.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — układa poranek w kroki, które samo zapamięta.',
    painScenes: [
      'Jedna skarpetka założona. Druga zniknęła razem z dzieckiem.',
      'Śniadanie stygnie. Ktoś w tym czasie buduje wieżę z klocków.',
      'Powtarzasz „ubieraj się” siedem razy w piętnaście minut.',
      'Wychodzicie spóźnieni, w kurtce zarzuconej w biegu, oboje spięci na resztę poranka.',
    ],
    painRelief:
      'To nie złośliwość — czterolatek dopiero uczy się trzymać w głowie kolejność kroków. Tę kolejność można mu podać w formie, którą naprawdę zapamięta, a zacząć już dziś wieczorem.',
  },

  'czas-ekranowy': {
    headline: 'Twoje dziecko nie chce odłożyć tableta?',
    headlineAccent: 'Dziś po wyłączeniu ekranu może zacząć się coś ciekawszego.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — przypomina mu, ile dzieje się poza ekranem.',
    painScenes: [
      '„Jeszcze pięć minut” — po raz czwarty w ciągu godziny.',
      'Wyłączasz bajkę. Płacz taki, jakby stała się prawdziwa krzywda.',
      'Klocki, kredki i rower stoją nietknięte. „Nudzi mi się”.',
      'Dajesz tablet, żeby ugotować obiad. Potem masz z tego powodu wyrzuty.',
    ],
    painRelief:
      'Ekran wygrywa, bo działa na mózg mocniej niż klocki — to chemia, nie brak charakteru u dziecka ani konsekwencji u Ciebie. Resztę świata da się rozświetlić na nowo, zaczynając dziś.',
  },

  'odstawienie-smoczka': {
    headline: 'Smoczek wciąż jest warunkiem zaśnięcia?',
    headlineAccent: 'Pożegnanie może być dumnym krokiem, nie stratą.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — zamienia rozstanie ze smoczkiem w prawdziwe pożegnanie.',
    painScenes: [
      'Wieczór. Smoczek zaginął. Pół domu na kolanach z latarką.',
      'Stres w przedszkolu — i od razu ręka szuka smoczka w kieszeni.',
      'Chowasz go „na próbę”. Wracasz po dwóch godzinach płaczu.',
      'Ktoś zauważa: „taki duży i jeszcze ze smoczkiem?”.',
    ],
    painRelief:
      'Smoczek to dla dziecka sposób na uspokojenie się, a nie zły nawyk — dlatego samo zabranie go nie działa. Pożegnanie da się przygotować tak, żeby dziecko chciało w nim uczestniczyć, i można zacząć dziś.',
  },

  'nowe-rodzenstwo': {
    headline: 'Starsze dziecko przestaje sobie radzić, odkąd jest maluszek?',
    headlineAccent: 'Może odzyskać swoje miejsce — nie tracąc Twojej uwagi.',
    intro: 'Bajka, w której Twoje dziecko jest bohaterem — pokazuje mu, kim teraz jest w rodzinie.',
    painScenes: [
      'Znowu chce butelkę i mówi cienkim głosem, jak niemowlę.',
      'Przytula maluszka — i przy okazji szczypie.',
      'Karmisz młodsze, starsze woła z drugiego pokoju co trzydzieści sekund.',
      'Słyszysz: „to może go oddamy?”. I nie wiesz, czy śmiać się, czy płakać.',
    ],
    painRelief:
      'Zazdrość starszaka nie oznacza, że go zaniedbujesz — dla niego świat naprawdę się przemeblował. Można mu pomóc odnaleźć się w nim na nowo, zaczynając od dzisiejszego wieczoru.',
  },

  'dzielenie-sie': {
    headline: 'Na każdą zabawkę słyszysz „moje!”?',
    headlineAccent: 'Wspólna zabawa może przestać kończyć się płaczem.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje, że oddanie zabawki to nie utrata.',
    painScenes: [
      'Urodziny u kuzyna. Twoje dziecko siedzi na stosie zabawek i nikogo nie dopuszcza.',
      'Ktoś sięga po jeden klocek. Krzyk słychać w całym mieszkaniu.',
      'Pani w przedszkolu mówi, że wyrywa zabawki innym.',
      'Tłumaczysz o dzieleniu się. Kiwa głową i mocniej przyciska misia.',
    ],
    painRelief:
      '„Moje” u trzylatka to nie egoizm, tylko świeżo odkryte poczucie własności — dlatego pouczanie nie pomaga. Dziecko musi przeżyć, że dawanie nie oznacza straty, a przeżyć to może już dziś, w bajce.',
  },

  'empatia-rozumienie-emocji': {
    headline: 'Twoje dziecko nie zauważa, że komuś jest przykro?',
    headlineAccent: 'Cudze emocje da się czytać — i można się tego nauczyć.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pozwala mu wejść w cudzą skórę i poczuć, jak to jest.',
    painScenes: [
      'Kolega przewraca się na podwórku. Twoje dziecko się śmieje.',
      'Rodzeństwo płacze obok. Ono bawi się dalej, jakby nic się nie działo.',
      'Mówisz „babci było smutno”. Odpowiedź: „no i co?”.',
      'Zabierasz je z placu zabaw i myślisz o tym, co pomyśleli inni rodzice.',
    ],
    painRelief:
      'Brak reakcji na cudze łzy w tym wieku nie jest znakiem, że dziecko jest nieczułe — empatia dojrzewa stopniowo i da się ją ćwiczyć. Pierwszy trening możecie zrobić dziś wieczorem, przy jednej książce.',
  },

  'pierwsze-przyjaznie': {
    headline: 'Twoje dziecko chce się bawić, ale nie wie, jak zacząć?',
    headlineAccent: 'Pierwsze zdanie do drugiego dziecka da się przećwiczyć wcześniej.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — daje mu gotowe słowa na „cześć, pobawimy się?”.',
    painScenes: [
      'Stoi metr od grupy i czeka, aż ktoś go zauważy.',
      'Pyta wieczorem: „czy Antek będzie moim kolegą?”.',
      'Podchodzi, milknie w pół kroku, wraca do Ciebie.',
      'Pani mówi, że bawi się sam i „jakoś nie wchodzi w grupę”.',
    ],
    painRelief:
      'Zawieranie znajomości to konkretna umiejętność, nie cecha charakteru — trzeba ją poćwiczyć, tak jak wiązanie butów. Ćwiczenie może zacząć się dziś wieczorem, bez świadków i bez ryzyka.',
  },

  'lek-separacyjny': {
    headline: 'Każde rozstanie kończy się dramatem?',
    headlineAccent: 'Dziecko może nosić Cię w sobie także wtedy, gdy Cię nie widzi.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje mu, że więź trwa również na odległość.',
    painScenes: [
      'Idziesz do łazienki. Płacz pod drzwiami.',
      'Wychodzisz do pracy — dziecko trzyma nogawkę i nie puszcza.',
      'Babcia zostaje na godzinę. Telefon do Ciebie po dwudziestu minutach.',
      'Wracasz, a ono przez resztę wieczoru nie odstępuje Cię na krok.',
    ],
    painRelief:
      'Ten lęk to znak silnej więzi, a nie dowód, że dziecko jest „za bardzo” przy Tobie. Pewność, że wrócisz, da się w nim zbudować spokojnie — zaczynając od dziś.',
  },

  'lek-przed-ciemnoscia': {
    headline: 'Twoje dziecko boi się ciemności?',
    headlineAccent: 'Dziś wieczorem w jego pokoju mogą zamieszkać przyjaciele, nie potwory.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — zamienia ciemny pokój w krainę, którą zna na pamięć.',
    painScenes: [
      'Gasisz światło. „Coś tam jest”.',
      'Trzeci raz po szklankę wody — byle tylko nie zostać samemu.',
      'W szafie wisi kurtka. Dla dziecka: ktoś, kto stoi i patrzy.',
      'Zasypia dopiero przy zapalonej lampie w korytarzu i uchylonych drzwiach.',
    ],
    painRelief:
      'Wyobraźnia czterolatka wypełnia ciemność tym, czego nie widać — to etap rozwoju, nie lękliwość charakteru. Tę samą wyobraźnię można przestawić na dobrą stronę, jeszcze dziś przed snem.',
  },

  'lek-przed-lekarzem': {
    headline: 'Twoje dziecko panikuje w gabinecie lekarskim?',
    headlineAccent: 'Następną wizytę można przeżyć najpierw w wyobraźni.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — przeprowadza je przez wizytę krok po kroku, zanim ta się wydarzy.',
    painScenes: [
      'Biały fartuch w drzwiach. Płacz zaczyna się przed „dzień dobry”.',
      'Dentysta prosi o otwarcie buzi. Zaciśnięte usta i odwrócona głowa.',
      'Szczepienie: trzymasz dziecko, ono krzyczy, a Ty czujesz się jak zdrajca.',
      'Wychodzicie z przychodni i oboje potrzebujecie chwili, żeby ochłonąć.',
    ],
    painRelief:
      'Dziecko boi się nie tyle bólu, co nieznanego i tego, że nie ma nad niczym kontroli. Kawałek tej kontroli można mu oddać wcześniej, w bezpiecznej historii czytanej w domu.',
  },

  przeprowadzka: {
    headline: 'Przeprowadzacie się, a dziecko pyta, kiedy wrócicie do domu?',
    headlineAccent: 'Nowe mieszkanie może stać się domem szybciej, niż myślisz.',
    intro: 'Bajka, w której Twoje dziecko jest bohaterem — pomaga mu odnaleźć dom w nowym miejscu.',
    painScenes: [
      '„Kiedy wracamy do naszego prawdziwego domu?”.',
      'Nie chce spać w nowym pokoju. Pierwsza noc na materacu obok Was.',
      'Codziennie opowiada o Franku z dawnego przedszkola.',
      'Zaczyna zachowywać się jak dziecko o rok młodsze — i nie wiesz, czy to przejdzie.',
    ],
    painRelief:
      'Dziecku zniknęło wszystko, co znało — to naturalne, że szuka starego świata. Poczucie domu da się przenieść razem z meblami, a zacząć można jeszcze dziś wieczorem.',
  },

  'niska-samoocena': {
    headline: 'Twoje dziecko mówi „nie umiem”, zanim spróbuje?',
    headlineAccent: 'Może zobaczyć siebie jako kogoś, kto potrafi.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje mu jego własną, prawdziwą siłę.',
    painScenes: [
      '„Nie umiem” — jeszcze przed pierwszą próbą.',
      'Patrzy na rysunek kolegi i chowa swój pod stół.',
      'Mówi o sobie „jestem głupi”. Spokojnie, jakby podawało fakt.',
      'Chwalisz. Odpowiada: „mówisz tak, bo musisz”.',
    ],
    painRelief:
      'To nie znaczy, że za mało chwalisz — dziecko nie uwierzy w słowa, których samo nie przeżyło. Własne zwycięstwo może przeżyć w historii, a tę historię możesz mu dać już dziś.',
  },

  'odpornosc-na-porazke': {
    headline: 'Twoje dziecko rezygnuje przy pierwszej trudności?',
    headlineAccent: 'Pomyłka może przestać oznaczać koniec zabawy.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje, że druga próba to część przygody.',
    painScenes: [
      'Przegrywa w grze — pionki lądują na podłodze.',
      'Jedna krzywa kreska i kartka jest już zgnieciona.',
      'Spada z rowerka. „Już nigdy nie będę jeździć”.',
      'Mówisz „spróbuj jeszcze raz”. Słyszysz: „nie, bo mi i tak nie wyjdzie”.',
    ],
    painRelief:
      'Za tą reakcją zwykle stoi wstyd, nie lenistwo — dziecko boi się, że pomyłka mówi coś o nim samym. Ten lęk da się rozluźnić w bezpiecznej historii, zaczynając od dzisiejszego wieczoru.',
  },

  'klamstwa-konfabulacje': {
    headline: 'Twoje dziecko zmyśla i mija się z prawdą?',
    headlineAccent: 'Prawda może być dla niego bezpieczniejsza niż wymyślona wersja.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje różnicę między fajną fantazją a potrzebną prawdą.',
    painScenes: [
      '„W przedszkolu był dziś smok”. Opowiada z pełnym przekonaniem.',
      '„Umyłem zęby” — a szczoteczka sucha.',
      'Rozbita szklanka. „To nie ja”. W pokoju nie było nikogo innego.',
      'Pytasz wprost, a ono brnie dalej. I nie wiesz, czy reagować, czy odpuścić.',
    ],
    painRelief:
      'U małego dziecka granica między wyobraźnią a prawdą jest cienka, a kłamstwo bywa po prostu ucieczką przed karą. Da się to poukładać bez śledztwa — zaczynając od jednej wieczornej historii.',
  },

  'smierc-w-rodzinie': {
    headline: 'Ktoś bliski odszedł, a Ty nie wiesz, jak o tym powiedzieć?',
    headlineAccent: 'Można to powiedzieć czule — i nie musisz robić tego sam.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — delikatnie nazywa stratę i pomaga zatrzymać miłość, która została.',
    painScenes: [
      '„Kiedy babcia wróci?” — pytanie wracające co kilka dni.',
      'Bawi się jak zwykle, a pół godziny później płacze bez wyraźnego powodu.',
      'Chcesz zacząć rozmowę, ale własne łzy przychodzą pierwsze.',
      'Wieczorem pyta cicho, czy Ty też kiedyś odejdziesz.',
    ],
    painRelief:
      'Nie musisz mieć gotowych słów ani udawać, że jest Ci lżej, niż jest. Dzieci przeżywają stratę falami i potrzebują przede wszystkim pewności, że miłość zostaje — a tę pewność można podać w cichej, wieczornej historii.',
  },

  'choroba-w-rodzinie': {
    headline: 'Ktoś bliski choruje, a dziecko wyczuwa, że coś się dzieje?',
    headlineAccent: 'Da się mu to wytłumaczyć bez straszenia i bez udawania.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — nazywa to, co czuje, i przywraca mu poczucie bezpieczeństwa.',
    painScenes: [
      'Pyta, dlaczego tata teraz tak dużo śpi.',
      'Podsłuchało rozmowę o szpitalu i od tamtej pory milczy przy kolacji.',
      'Raz opiekuje się wszystkimi jak dorosły, raz wybucha o drobiazg.',
      'Nie wiesz, ile powiedzieć: za dużo przestraszy, za mało będzie nieprawdą.',
    ],
    painRelief:
      'Dziecko i tak czuje napięcie w domu — cisza go nie chroni, zostawia je tylko samo z domysłami. Można mu dać słowa na miarę jego wieku, spokojnie, przy wieczornym czytaniu.',
  },

  'choroba-dziecka': {
    headline: 'Twoje dziecko choruje i musi być dzielne?',
    headlineAccent: 'Może przejść przez to jako bohater, nie jako pacjent.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — oddaje mu siłę tam, gdzie choroba odbiera kontrolę.',
    painScenes: [
      'Pyta: „dlaczego ja?”. I czeka na odpowiedź, patrząc prosto na Ciebie.',
      'Kolejne badanie. Zna już zapach korytarza i imię pielęgniarki.',
      'Tęskni za swoim pokojem, przedszkolem, zwyczajnym dniem.',
      'Bywa rozdrażnione, potem przeprasza. A Ty nosisz w sobie strach, którego mu nie pokazujesz.',
    ],
    painRelief:
      'Choroba zabiera dziecku poczucie wpływu i to często boli je bardziej niż samo leczenie. Kawałek tego wpływu można mu oddać w historii, w której to ono jest głównym bohaterem — już dziś.',
  },

  'akceptacja-odmiennosci-wlasnej': {
    headline: 'Twoje dziecko czuje, że nie pasuje do reszty?',
    headlineAccent: 'To, co je wyróżnia, może przestać być powodem do wstydu.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje mu, że jego inność jest wartością.',
    painScenes: [
      'Mówi wprost: „chciałbym być taki jak inni”.',
      'Robi wszystko w swoim rytmie i ciągle słyszy, że „znowu nie tak”.',
      'Wraca z przedszkola z czyimś komentarzem, który powtórzy Ci dopiero po tygodniu.',
      'Zaczyna ukrywać to, co lubi najbardziej, żeby nie zwracać na siebie uwagi.',
    ],
    painRelief:
      'Inność sama w sobie nie boli — boli brak słów na nią i cudze spojrzenia. Te słowa można dziecku dać, najlepiej wtedy, gdy słyszy je o sobie: w bajce czytanej wieczorem.',
  },

  'akceptacja-odmiennosci-rowiesnikow': {
    headline: 'Twoje dziecko głośno pyta, dlaczego ktoś jest inny?',
    headlineAccent: 'Tę ciekawość da się zamienić w otwartość, nie w milczenie.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje, jak ciekawie różni bywają ludzie.',
    painScenes: [
      '„Dlaczego ten pan jeździ na wózku?” — na cały autobus.',
      'Pokazuje palcem. Ty czerwienisz się i szepczesz „nie wypada”.',
      'Odsuwa się od dziecka, które mówi inaczej niż reszta grupy.',
      'Pyta wieczorem jeszcze raz, a Ty nie wiesz, od czego zacząć odpowiedź.',
    ],
    painRelief:
      'Dzieci nie rodzą się z uprzedzeniami — uczą się reakcji od nas, także tej zawstydzonej ciszy. Zamiast uciszać, można pokazać im różnorodność od dobrej strony, zaczynając od dzisiejszego wieczoru.',
  },

  'wykluczenie-rowiesnicze': {
    headline: 'Twoje dziecko słyszy, że nikt nie chce się z nim bawić?',
    headlineAccent: 'Jego wartość nie musi zależeć od tego, kto go dziś zaprosił.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — przypomina mu, ile jest warte, niezależnie od grupy.',
    painScenes: [
      'Wraca z przedszkola i mówi: „Zosia powiedziała, że mnie nie lubi”.',
      'Zaproszenia na urodziny dostali wszyscy oprócz niego.',
      'Widzisz przez płot, jak stoi samo, a reszta biega w kółko.',
      'Pyta: „czy ja jestem gorszy?”. A Ty czekasz z odpowiedzią sekundę za długo.',
    ],
    painRelief:
      'Wykluczenie prawie nigdy nie jest winą dziecka — to dynamika grupy, którą ono i tak bierze do siebie. Poczucie własnej wartości można mu oddać, zaczynając od historii, w której jest kimś ważnym: już dziś.',
  },

  'zrozumienie-celu-nauki': {
    headline: 'Twoje dziecko pyta, po co mu ta cała nauka?',
    headlineAccent: 'Ciekawość, którą miało jako maluch, da się rozpalić na nowo.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — pokazuje, że wiedza otwiera drzwi, a nie zabiera wieczór.',
    painScenes: [
      '„Szkoła jest nudna. Po co mi to?”.',
      'Zadanie na dziesięć minut zajmuje półtorej godziny.',
      'Lektura wygląda jak odsiadka: wzrok w oknie, palec na tej samej linijce.',
      'Pamiętasz, jak w wieku czterech lat pytało o wszystko. Teraz nie pyta o nic.',
    ],
    painRelief:
      'Zgaszona ciekawość nie oznacza lenistwa ani rodzicielskiego zaniedbania. Da się ją obudzić od strony, którą dziecko lubi najbardziej — od historii. Można zacząć dziś wieczorem.',
  },

  'moczenie-nocne': {
    headline: 'Twoje dziecko moczy się w nocy i bardzo się tego wstydzi?',
    headlineAccent: 'Można zdjąć z niego wstyd, zanim ciało dogoni resztę.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — mówi mu, że mokra noc niczego mu nie odbiera.',
    painScenes: [
      'Rano cichy głos zza drzwi i spuszczony wzrok: „znowu się stało”.',
      'Kolejne pranie przed siódmą. Materac schnie przy kaloryferze.',
      'Nie chce jechać na nocowanie do kolegi. Wymyśla powód, w który oboje nie wierzycie.',
      'Nie wiesz, czy o tym rozmawiać, czy udawać, że nie ma sprawy.',
    ],
    painRelief:
      'To nie lenistwo ani krok w tył — pęcherz i układ nerwowy dojrzewają w swoim tempie, a wstyd i presja tylko przedłużają sprawę. Dziecku najbardziej pomaga zdjęcie z niego winy, a to możecie zrobić już dziś wieczorem.',
  },

  'wizyta-w-szpitalu': {
    headline: 'Twoje dziecko czeka pobyt w szpitalu?',
    headlineAccent: 'Tę drogę można przejść wcześniej — w bezpiecznym miejscu.',
    intro:
      'Bajka, w której Twoje dziecko jest bohaterem — prowadzi je przez szpital krok po kroku, zanim tam trafi.',
    painScenes: [
      'Termin w kalendarzu. Odliczasz dni i sam śpisz coraz gorzej.',
      '„Czy będziesz ze mną?” — pyta o to codziennie.',
      'Pyta o igły. Odpowiadasz ostrożnie, żeby nie przestraszyć i nie skłamać.',
      'Wyczuwa Twoje napięcie szybciej, niż zdążysz je ukryć.',
    ],
    painRelief:
      'Najtrudniejsze w szpitalu nie są badania, tylko nieznane: obce miejsce i brak wiedzy, co się wydarzy. Tę wiedzę można dziecku dać wcześniej, spokojnie, w domu — jeszcze dziś wieczorem.',
  },
};
