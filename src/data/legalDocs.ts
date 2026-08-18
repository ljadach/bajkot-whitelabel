/**
 * Legal documents — versioned source of truth for Regulamin + Polityka
 * Prywatności. The `version` strings are persisted on every consent record so
 * we can prove (years from now) exactly which wording the user accepted.
 *
 * When the wording changes: bump `version`, update `effectiveDate`, and edit
 * the relevant `body` constant. Existing consents stay tied to the old version.
 */

export const TERMS_VERSION = '2026-05-14';
/**
 * Bumped 2026-08-15 for the Meta pixel + Conversions API: recipients,
 * advertising cookies, and transfers outside the EEA. Consents recorded
 * before that date stay tied to `2026-05-14`, which is the point of
 * versioning these strings.
 */
export const PRIVACY_VERSION = '2026-08-15';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDoc {
  version: string;
  effectiveDate: string; // ISO 8601 date
  title: string;
  intro?: string;
  sections: LegalSection[];
}

export const TERMS_DOC: LegalDoc = {
  version: TERMS_VERSION,
  effectiveDate: '2026-05-14',
  title: 'Regulamin serwisu Bajkoterapia.org',
  sections: [
    {
      heading: '1. Postanowienia ogólne',
      paragraphs: [
        'Niniejszy regulamin określa zasady korzystania z serwisu internetowego bajkoterapia.org oraz warunki sprzedaży produktów cyfrowych i fizycznych.',
        'Sprzedawcą i Administratorem serwisu jest Trustee Interactive Sp. z o.o. z siedzibą w Warszawie (01-552), przy pl. Inwalidów 10, wpisana do rejestru przedsiębiorców Krajowego Rejestru Sądowego pod numerem KRS: 0000354350, NIP: 5252477796, REGON: 142368336. Kontakt e-mail: info@bajkoterapia.org.',
        'Przed rozpoczęciem korzystania z Serwisu, Kupujący ma obowiązek zapoznać się z niniejszym Regulaminem.',
      ],
    },
    {
      heading: '2. Definicje',
      paragraphs: [
        'Serwis — strona internetowa dostępna pod adresem bajkoterapia.org.',
        'Kupujący — osoba fizyczna, osoba prawna lub jednostka organizacyjna dokonująca zakupów w Serwisie.',
        'Produkt Cyfrowy — personalizowana bajka w formacie PDF wygenerowana na podstawie danych przekazanych przez Kupującego.',
        'Produkt Fizyczny — wydrukowana wersja personalizowanej bajki.',
      ],
    },
    {
      heading: '3. Składanie zamówień i płatności',
      paragraphs: [
        'Serwis umożliwia zakup Produktów bez konieczności zakładania konta (rejestracji).',
        'Warunkiem złożenia zamówienia jest podanie adresu e-mail, a w przypadku Produktu Fizycznego – również adresu dostawy i numeru telefonu.',
        'Kupujący ma obowiązek podania prawdziwych danych, w tym danych niezbędnych do personalizacji bajki.',
        'Ceny w Serwisie są cenami brutto (zawierają podatek VAT).',
        'Płatności realizowane są za pośrednictwem operatora Stripe. Realizacja zamówienia rozpoczyna się po zaksięgowaniu wpłaty.',
      ],
    },
    {
      heading: '4. Realizacja i dostawa',
      paragraphs: [
        'Produkty Cyfrowe (PDF) wysyłane są na podany adres e-mail bezpośrednio po wygenerowaniu.',
        'Produkty Fizyczne (Druk) — czas realizacji (druk i wysyłka) wynosi od 3 do 5 dni roboczych.',
        'Dostawa Produktów Fizycznych realizowana jest za pośrednictwem firm kurierskich.',
      ],
    },
    {
      heading: '5. Prawo odstąpienia od umowy (Wyłączenia)',
      paragraphs: [
        'Zgodnie z art. 38 pkt 3 Ustawy o prawach konsumenta, prawo odstąpienia od umowy zawartej na odległość nie przysługuje Kupującemu w odniesieniu do umów, w których przedmiotem świadczenia jest rzecz nieprefabrykowana, wyprodukowana według specyfikacji konsumenta lub służąca zaspokojeniu jego zindywidualizowanych potrzeb (dotyczy personalizowanych Produktów Fizycznych).',
        'Zgodnie z art. 38 pkt 13 Ustawy o prawach konsumenta, prawo odstąpienia od umowy o dostarczanie treści cyfrowych, które nie są zapisane na nośniku materialnym (Produkt Cyfrowy — PDF), nie przysługuje, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną, uprzednią zgodą konsumenta przed upływem terminu do odstąpienia od umowy i po poinformowaniu go o utracie tego prawa.',
      ],
    },
    {
      heading: '6. Reklamacje',
      paragraphs: [
        'Sprzedawca ma obowiązek dostarczyć Produkt wolny od wad.',
        'Reklamacje dotyczące wad Produktów lub błędów w działaniu Serwisu należy zgłaszać na adres e-mail: info@bajkoterapia.org.',
        'Zgłoszenie reklamacyjne powinno zawierać: dane Kupującego, opis wady, datę jej stwierdzenia oraz żądanie.',
        'Sprzedawca ustosunkuje się do reklamacji w terminie 14 dni od jej otrzymania.',
      ],
    },
    {
      heading: '7. Postanowienia końcowe',
      paragraphs: [
        'W sprawach nieuregulowanych mają zastosowanie przepisy prawa polskiego, w szczególności Kodeksu cywilnego oraz Ustawy o prawach konsumenta.',
        'Sprzedawca zastrzega sobie prawo do wprowadzania zmian w Regulaminie. O zmianach Kupujący będą informowani w Serwisie.',
      ],
    },
  ],
};

export const PRIVACY_DOC: LegalDoc = {
  version: PRIVACY_VERSION,
  effectiveDate: '2026-08-15',
  title: 'Polityka Prywatności serwisu Bajkoterapia.org',
  sections: [
    {
      heading: '1. Administrator Danych Osobowych',
      paragraphs: [
        'Administratorem danych osobowych zbieranych za pośrednictwem serwisu bajkoterapia.org jest Trustee Interactive Sp. z o.o. z siedzibą w Warszawie (01-552), przy pl. Inwalidów 10, KRS: 0000354350, NIP: 5252477796, REGON: 142368336. Kontakt e-mail: info@bajkoterapia.org.',
      ],
    },
    {
      heading: '2. Cele i podstawy przetwarzania',
      paragraphs: [
        'Realizacja umowy (wysyłka PDF) — adres e-mail, dane personalizacyjne (imię, wiek, płeć, cechy wyglądu). Podstawa: art. 6 ust. 1 lit. b RODO (wykonanie umowy).',
        'Dostawa fizyczna (Druk) — adres fizyczny, numer telefonu. Podstawa: art. 6 ust. 1 lit. b RODO (wykonanie umowy).',
        'Personalizacja terapeutyczna — informacje o wybranym problemie dziecka (dane szczególnej kategorii). Podstawa: art. 9 ust. 2 lit. a RODO (wyraźna zgoda opiekuna prawnego).',
        'Płatności — dane transakcyjne, adres e-mail. Podstawa: art. 6 ust. 1 lit. b oraz art. 6 ust. 1 lit. c RODO (obowiązki rachunkowe).',
        'Kontakt i reklamacje — adres e-mail, historia korespondencji. Podstawa: art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes).',
      ],
    },
    {
      heading: '3. Przetwarzanie Danych Szczególnych (Dane Dzieci)',
      paragraphs: [
        'Serwis przetwarza dane dotyczące dzieci (wiek, płeć, imię, wygląd) oraz dane mogące ujawniać informacje o ich stanie emocjonalnym/zdrowotnym (wybór problemu z listy).',
        'Dane te podawane są dobrowolnie przez rodzica lub opiekuna prawnego wyłącznie w celu wykonania zindywidualizowanej usługi (stworzenie bajki).',
        'Rozpoczęcie generowania bajki wymaga zaznaczenia odrębnej zgody na przetwarzanie danych szczególnych kategorii.',
      ],
    },
    {
      heading: '4. Odbiorcy Danych',
      paragraphs: [
        'Dane osobowe mogą być przekazywane wyłącznie podmiotom wspierającym działanie serwisu:',
        'Stripe — operator płatności.',
        'Firmy kurierskie — w celu dostarczenia Produktu Fizycznego.',
        'Biuro rachunkowe — w celach rozliczeniowych.',
        'Dostawcy usług hostingowych i narzędzi IT niezbędnych do wygenerowania pliku PDF.',
        'PostHog — analityka produktowa. Dane przetwarzane są na serwerach w Unii Europejskiej. Wyłącznie po wyrażeniu zgody na pliki cookie analityczne i marketingowe.',
        'Google Ireland Limited — Google Analytics 4 oraz Google Ads. Wyłącznie po wyrażeniu zgody na pliki cookie analityczne i marketingowe.',
        'Meta Platforms Ireland Limited (4 Grand Canal Square, Grand Canal Harbour, Dublin 2, Irlandia) — piksel Meta oraz Conversions API, wykorzystywane do prowadzenia i mierzenia skuteczności reklam w serwisach Facebook i Instagram. Wyłącznie po wyrażeniu zgody na pliki cookie analityczne i marketingowe. Szczegóły w sekcji 8.',
      ],
    },
    {
      heading: '5. Okres przechowywania',
      paragraphs: [
        'Dane związane z umową sprzedaży przetwarzane są przez okres niezbędny do jej realizacji, a następnie do czasu upływu terminu przedawnienia roszczeń.',
        'Dokumenty rozliczeniowe przechowywane są przez 5 lat od końca roku kalendarzowego, w którym upłynął termin płatności podatku.',
        'Wygenerowane pliki PDF przechowywane są na serwerze przez okres niezbędny do umożliwienia Kupującemu ich pobrania, po czym są trwale usuwane.',
      ],
    },
    {
      heading: '6. Prawa Użytkownika',
      paragraphs: [
        'Kupującemu przysługuje prawo do:',
        'Dostępu do swoich danych oraz otrzymania ich kopii.',
        'Sprostowania (poprawiania) danych.',
        'Usunięcia danych (prawo do bycia zapomnianym).',
        'Ograniczenia przetwarzania danych.',
        'Przenoszenia danych.',
        'Wniesienia sprzeciwu wobec przetwarzania.',
        'Cofnięcia zgody na przetwarzanie danych (co może uniemożliwić realizację usługi personalizacji).',
        'Wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).',
      ],
    },
    {
      heading: '7. Pliki Cookies',
      paragraphs: [
        'Serwis wykorzystuje pliki cookies niezbędne do prawidłowego funkcjonowania procesu zakupowego (zapamiętywanie koszyka, obsługa sesji płatniczej). Są one stosowane niezależnie od zgody, ponieważ bez nich usługa nie może zostać wykonana.',
        'Po uzyskaniu zgody Użytkownika Serwis korzysta z plików cookies analitycznych i marketingowych. Jedno ustawienie w banerze obejmuje obie kategorie: analitykę ruchu (Google Analytics 4, PostHog) oraz narzędzia reklamowe (piksel Meta, Google Ads), w tym remarketing, czyli kierowanie reklam do osób, które wcześniej odwiedziły Serwis.',
        'Do czasu wyrażenia zgody narzędzia reklamowe i analityczne pozostają wyłączone, a odpowiadające im pliki cookies nie są zapisywane na urządzeniu Użytkownika.',
        'Zgoda jest dobrowolna i może zostać wycofana w każdej chwili przez ustawienia banera cookies. Wycofanie zgody nie wpływa na zgodność z prawem przetwarzania dokonanego przed jej wycofaniem i nie ogranicza możliwości korzystania z Serwisu ani zakupu Produktu.',
      ],
    },
    {
      heading: '8. Narzędzia reklamowe Meta (Facebook, Instagram)',
      paragraphs: [
        'Za zgodą Użytkownika Serwis korzysta z piksela Meta oraz interfejsu Conversions API, dostarczanych przez Meta Platforms Ireland Limited. Celem jest mierzenie skuteczności reklam oraz remarketing — prezentowanie reklam Serwisu osobom, które wcześniej odwiedziły stronę, lecz nie dokończyły zamówienia.',
        'Przekazywane są: adres IP, informacje o przeglądarce i urządzeniu, adres odwiedzanej podstrony oraz identyfikatory plików cookies Meta (_fbp, _fbc), a także zdarzenia opisujące etap ścieżki zakupowej (wyświetlenie strony tematu, rozpoczęcie zamówienia, wyświetlenie podglądu, przejście do płatności, zakup) wraz z wartością zamówienia.',
        'Uczciwie zaznaczamy, czego nie da się uniknąć: wraz z każdym zdarzeniem Meta otrzymuje adres odwiedzanej podstrony, a w przypadku stron tematycznych adres ten wskazuje, jakiego zagadnienia dotyczyła wizyta. Jest to nieodłączna cecha działania pikseli reklamowych. Właśnie dlatego narzędzie uruchamiane jest wyłącznie po wyrażeniu przez Użytkownika zgody i pozostaje całkowicie nieaktywne w razie jej braku lub wycofania.',
        'Poza tym ograniczamy zakres przekazywanych danych do niezbędnego minimum. Zdarzenia wysyłane do Meta opisują wyłącznie etap ścieżki zakupowej oraz wartość zamówienia. Nie przekazujemy identyfikatora problemu ani kategorii tematycznej jako odrębnych parametrów zdarzeń, nie budujemy też grup odbiorców reklam w oparciu o wybrany problem terapeutyczny. Nie przekazujemy żadnych danych wprowadzonych w formularzu zamówienia: imienia dziecka, jego wieku, płci, cech wyglądu, dedykacji ani treści wygenerowanej bajki.',
        'Informacja o dokonanym zakupie przekazywana jest dodatkowo z naszego serwera (Conversions API). W tym przypadku adres e-mail Kupującego przekazywany jest wyłącznie w postaci nieodwracalnego skrótu kryptograficznego SHA-256 — Meta nie otrzymuje adresu e-mail w postaci jawnej. Zdarzenie to nie zawiera adresu podstrony tematycznej, a wyłącznie adres domeny.',
        'W zakresie zbierania danych za pośrednictwem piksela i przesyłania ich do Meta, Trustee Interactive Sp. z o.o. oraz Meta Platforms Ireland Limited są współadministratorami w rozumieniu art. 26 RODO. Za dalsze przetwarzanie tych danych we własnych celach odpowiada wyłącznie Meta, na zasadach opisanych w jej polityce prywatności (https://www.facebook.com/privacy/policy).',
        'Podstawą przetwarzania jest zgoda — art. 6 ust. 1 lit. a RODO. Poza wycofaniem zgody w banerze cookies Użytkownik może również ograniczyć personalizację reklam bezpośrednio w ustawieniach swojego konta Meta.',
      ],
    },
    {
      heading: '9. Przekazywanie danych poza Europejski Obszar Gospodarczy',
      paragraphs: [
        'Dane związane z realizacją umowy (personalizacja, generowanie bajki, płatności) przetwarzane są w Unii Europejskiej lub przez podmioty zapewniające odpowiedni poziom ochrony.',
        'Narzędzia analityczne i reklamowe wskazane w sekcjach 4, 7 i 8 mogą wiązać się z przekazaniem danych do Stanów Zjednoczonych — do spółek Meta Platforms, Inc. oraz Google LLC. Odbywa się to na podstawie decyzji wykonawczej Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony danych (EU-U.S. Data Privacy Framework), a w zakresie nieobjętym tą decyzją — na podstawie standardowych klauzul umownych zatwierdzonych przez Komisję Europejską.',
        'Przekazanie to następuje wyłącznie po wyrażeniu przez Użytkownika zgody na pliki cookies analityczne i marketingowe. Brak zgody oznacza, że żadne dane nie są przekazywane do tych podmiotów.',
        'PostHog przetwarza dane na serwerach w Unii Europejskiej i przekazanie poza EOG nie następuje.',
      ],
    },
  ],
};

/**
 * Concise clause text that ends up in a consent log row. We store this
 * verbatim so an audit years from now can show exactly what the user accepted,
 * even if the page wording drifts.
 */
export const CONSENT_CLAUSE_TERMS =
  'Akceptuję Regulamin serwisu oraz zapoznałem się z Polityką Prywatności.';

// Must stay byte-identical to `checkout.consentSpecialData` in
// src/locales/pl/book.json — this is the string persisted as `clauseText` in
// the order's consent log, so a divergence would record wording the parent
// never saw. Shortened 2026-08-17; the privacy document itself did not change,
// hence PRIVACY_VERSION stays put.
export const CONSENT_CLAUSE_SPECIAL_DATA =
  'Wyrażam zgodę na przetwarzanie danych szczególnych kategorii mojego dziecka (wybrany problem emocjonalny) przez Trustee Interactive Sp. z o.o. wyłącznie w celu stworzenia i dostarczenia bajki. Zgodę mogę wycofać w każdej chwili.';
