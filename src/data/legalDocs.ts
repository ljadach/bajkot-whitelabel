/**
 * Legal documents — versioned source of truth for Regulamin + Polityka
 * Prywatności. The `version` strings are persisted on every consent record so
 * we can prove (years from now) exactly which wording the user accepted.
 *
 * When the wording changes: bump `version`, update `effectiveDate`, and edit
 * the relevant `body` constant. Existing consents stay tied to the old version.
 */

export const TERMS_VERSION = '2026-05-14';
export const PRIVACY_VERSION = '2026-05-14';

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
  effectiveDate: '2026-05-14',
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
        'Serwis wykorzystuje pliki cookies niezbędne do prawidłowego funkcjonowania procesu zakupowego (zapamiętywanie koszyka, obsługa sesji płatniczej).',
        'Po uzyskaniu zgody Użytkownika Serwis może korzystać z plików cookies analitycznych (Google Analytics, PostHog) do anonimowej analizy ruchu. Zgoda może być wycofana w każdej chwili przez ustawienia banneru cookies.',
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

export const CONSENT_CLAUSE_SPECIAL_DATA =
  'Wyrażam zgodę na przetwarzanie danych szczególnych kategorii mojego dziecka (informacje o wybranym problemie emocjonalnym) przez Trustee Interactive Sp. z o.o. wyłącznie w celu wygenerowania i dostarczenia personalizowanej bajki. Rozumiem, że zgodę mogę wycofać w dowolnym momencie.';
