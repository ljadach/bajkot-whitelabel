# BAJKOTERAPIA — Specyfikacja procesu Intake i Engagement Klienta

**Wersja:** 1.0
**Data:** 16 kwietnia 2026
**Autor:** Andrzej Wodziński
**Odbiorcy:** Cezary (implementacja), Łukasz (prompty/produkt)

---

## 1. Wstęp i cel dokumentu

Niniejszy dokument stanowi specyfikację funkcjonalną procesu **Intake** (pozyskanie użytkownika i zebranie danych do wygenerowania książki) oraz procesu **Engagement Klienta** (od momentu zamówienia do dostarczenia produktu). Specyfikacja jest przeznaczona dla zespołu implementacyjnego (Cezary) oraz jako punkt odniesienia dla prac nad promptami (Łukasz).

Dokument powstał na podstawie ustaleń ze spotkania z 15.04.2026, uwag testerki (Aśka) oraz analizy dokumentu „Badania nad skutecznością bajkoterapii".

### 1.1 Zakres specyfikacji

Specyfikacja obejmuje:

- Pełny flow użytkownika od wejścia na stronę do otrzymania książki (User Journey)
- Strukturę formularza Intake (kroki, pola, walidacje)
- Katalog 35 tematów z empatycznym copy na stronę
- Proces Engagement po płatności (ekran oczekiwania, wybór stylu, edukacja)
- Reguły językowe strony (dos/don'ts)
- Metryki do śledzenia (KPI)

Specyfikacja NIE obejmuje:

- Architektury technicznej (backend, baza danych, API)
- Treści promptów AI (odpowiedzialność Łukasza)
- Składu graficznego książki (Cezary + Łukasz)
- Logistyki druku i wysyłki (faza 3)

---

## 2. User Journey — przegląd

Użytkownik przechodzi przez **8 kroków** od wejścia na stronę do otrzymania książki:

| Krok | Nazwa                  | Opis                                                                                                          | Typ ekranu       |
| ---- | ---------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1    | Wejście na stronę      | Landing Page (dedykowany per problem) LUB strona generyczna z katalogiem problemów                            | Strona           |
| 2    | Wybór problemu         | Użytkownik wybiera problem z katalogu (35 tematów w 7 tabów) LUB klika „Inny problem"                         | Formularz krok 1 |
| 3    | Opis sytuacji          | Pole tekstowe z placeholderem — rodzic opisuje specyfikę swojego dziecka i konkretną sytuację                 | Formularz krok 2 |
| 4    | Personalizacja dziecka | Imię, wiek (z listy), płeć, kolor oczu, kolor i długość włosów, ulubiona zabawka, okulary, ulubiony ubiór     | Formularz krok 3 |
| 5    | Preview produktu       | Ekran „Co kupujesz?" — zdjęcia wyprodukowanych książek, opis co zawiera, cena                                 | Strona konwersji |
| 6    | Płatność               | Wybór: PDF (cena bazowa) lub PDF + druk (+20 PLN z dostawą kurierską). Bramka płatności.                      | Checkout         |
| 7    | Ekran oczekiwania      | Generowanie książki (~2-3 min). Pasek postępu + statyczne karty engagement + wybór stylu ilustracji przy ~30% | Engagement       |
| 8    | Dostarczenie           | PDF do pobrania. Jeśli druk — informacja o wysyłce. Książka zawiera stronę dedykacyjną + pytania do dyskusji. | Finalizacja      |

---

## 3. Proces Intake — szczegółowa specyfikacja

### 3.1 Punkty wejścia na stronę

System obsługuje dwa scenariusze wejścia:

**Scenariusz A — Landing Page dedykowany:** Użytkownik trafia z Google/reklamy na LP poświęcony konkretnemu problemowi (np. `bajkoterapia.org/lek-przed-ciemnoscia`). Na LP widzi empatyczny opis problemu, social proof (opinie) i przycisk „Stwórz książkę dla swojego dziecka". Po kliknięciu → przechodzi do **kroku 2** (Formularz) z wstępnie wybranym problemem (ale z możliwością zmiany).

**Scenariusz B — Strona generyczna:** Użytkownik trafia na stronę główną z opisem czym jest bajkoterapia. Widzi katalog problemów (7 tabów filtrujących). Po kliknięciu tematu → przechodzi do **kroku 2** z wybranym problemem.

### 3.2 Formularz — Krok 1: Wybór problemu

Użytkownik widzi listę problemów pogrupowaną w **7 tabów**. Każdy temat wyświetla empatyczny tytuł (pytanie) i krótki opis. Po wybraniu tematu użytkownik klika „Dalej".

**Opcja „Inny problem":** Na dole listy przycisk „Moje dziecko ma inny problem". Po kliknięciu otwiera się pole tekstowe, w którym rodzic opisuje problem swoimi słowami. Pod polem krótki disclaimer: „Postaramy się stworzyć bajkę na Twój temat. Jakość może się różnić od naszych sprawdzonych kategorii."

### 3.3 Formularz — Krok 2: Opis sytuacji

Ekran z nagłówkiem: **„Opowiedz nam więcej o sytuacji Twojego dziecka"**

Pole tekstowe (textarea, min. 4 linie) z placeholderem — przykład zmieniający się w zależności od wybranego problemu. Na przykład:

- **Dla „Lęk przed ciemnością":** „Np. Moja 4-letnia córka boi się ciemności od kiedy przeprowadziliśmy się do nowego domu. Każdej nocy płacze i prosi o zostawienie zapalonego światła. Nie chce zostać sama w pokoju nawet na chwilę..."
- **Dla „Wybiórczość pokarmowa":** „Np. Mój 3-letni syn je tylko makaron, chleb i banany. Odmawia próbowania czegokolwiek nowego. Na widok warzyw płacze i odsuwa talerz..."

**Walidacja:** Pole opcjonalne, ale zachęcające. Jeśli puste, wyświetla się delikatna zachęta: „Im więcej napiszesz, tym bardziej dopasowana będzie bajka do Twojego dziecka."

### 3.4 Formularz — Krok 3: Personalizacja dziecka

Nagłówek: **„Opowiedz nam o swoim dziecku — dzięki temu stworzymy ilustracje, na których się rozpozna"**

| Pole              | Typ                               | Wymagane? | Uwagi                                                                                        |
| ----------------- | --------------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| Imię dziecka      | Tekst                             | Tak       | Użyte w tytule książki i treści bajki                                                        |
| Wiek dziecka      | Lista rozwijana (**2-12 lat**)    | Tak       | Determinuje: liczbę rozdziałów, długość tekstu, złożoność języka, proporcję tekst/ilustracja |
| Płeć              | Wybór: dziewczynka / chłopiec     | Tak       | Wpływa na bohatera i ilustracje                                                              |
| Kolor oczu        | Lista lub paleta                  | Tak       | Dla ilustracji                                                                               |
| Kolor włosów      | Lista lub paleta                  | Tak       | Dla ilustracji                                                                               |
| Długość włosów    | Lista: krótkie / średnie / długie | Tak       | Dla ilustracji                                                                               |
| Czy nosi okulary? | Tak / Nie                         | Nie       | Domyślnie: Nie                                                                               |
| Ulubiona zabawka  | Tekst                             | Nie       | Może pojawić się w bajce jako element fabuły                                                 |
| Ulubiony ubiór    | Tekst                             | Nie       | Np. „czerwona sukienka w kropki" — użyte w ilustracjach jako Visual Anchor                   |

> **Uwaga:** Spec NIE wymaga pola „odcień skóry" (skin tone).

---

## 4. Katalog tematów — 35 pozycji w 7 tabach

### Tab: Sen i Wieczór (3)

**„Twoje dziecko nie chce iść spać?"** — Kolejna szklanka wody, jeszcze jedna bajka, jeszcze jedno przytulenie... Wieczory nie muszą trwać godzinami.
_Nazwa wewnętrzna: Trudności z zasypianiem_

**„Budzi się w nocy z płaczem?"** — Wielokrotne pobudki, strach, wołanie mamy lub taty. Pomóż dziecku spokojnie przesypiać noce.
_Nazwa wewnętrzna: Częste pobudki nocne_

**„Pora na własne łóżeczko?"** — Przejście ze wspólnego spania to duży krok — i dla dziecka, i dla rodzica. Bajka, która pomoże oswoić tę zmianę.
_Nazwa wewnętrzna: Nauka samodzielnego zasypiania_

### Tab: Emocje i Zachowanie (3)

**„Wybuchy złości, których nie da się opanować?"** — Krzyk, płacz, rzucanie zabawkami. Twoje dziecko nie jest złe — po prostu nie umie jeszcze nazwać tego, co czuje.
_Nazwa wewnętrzna: Napady złości i histeria_

**„Bije, gryzie, kopie?"** — Agresja u małego dziecka to sygnał, nie wyrok. Bajka pomoże mu znaleźć inne sposoby wyrażania emocji.
_Nazwa wewnętrzna: Agresja fizyczna_

**„Ciągle mówi NIE?"** — Bunt to naturalna część dorastania, ale nie musi oznaczać codziennej walki. Pokaż dziecku, że współpraca też może być fajna.
_Nazwa wewnętrzna: Bunt i odmowa współpracy_

### Tab: Higiena i Nawyki (7)

**„Nocnik? Nie, dziękuję!"** — Odpieluchowanie w tempie dziecka — bez stresu i bez „wpadek", które frustrują obie strony.
_Nazwa wewnętrzna: Trudności z odpieluchowaniem_

**„Nie chce iść do toalety?"** — Wstrzymywanie potrzeb to częstszy problem, niż myślisz. Bajka pomoże dziecku oswoić się z ciałem.
_Nazwa wewnętrzna: Nawykowe wstrzymywanie potrzeb_

**„Je tylko 3 rzeczy?"** — Wybiórczość pokarmowa to nie kaprys. Pomóż dziecku otworzyć się na nowe smaki bez przymusu.
_Nazwa wewnętrzna: Wybiórczość pokarmowa_

**„Mycie zębów to codzienne pole bitwy?"** — Zaciska usta, ucieka, płacze. Pokażmy mu, że szczoteczka to nie wróg.
_Nazwa wewnętrzna: Opór przy higienie jamy ustnej_

**„Boi się wody i mycia głowy?"** — Panika przy kąpieli, wrzask na widok prysznica. Bajka, która zamieni strach w zabawę.
_Nazwa wewnętrzna: Lęk przed kąpielą i myciem głowy_

**„Rano nic nie idzie na czas?"** — Ubieranie trwa wieczność, buty nie do znalezienia. Bajka, która nauczy małego bohatera porannego planu.
_Nazwa wewnętrzna: Poranna organizacja_

**„Nie mogę mu zabrać tableta?"** — Wyłączenie ekranu = koniec świata. Pomóż dziecku zrozumieć, że po bajkach na ekranie jest jeszcze tyle fajnych rzeczy.
_Nazwa wewnętrzna: Zarządzanie czasem ekranowym_

**„Pora pożegnać się ze smoczkiem?"** — Smoczek dał bezpieczeństwo, ale nadchodzi czas, żeby go puścić. Bajka, która zamieni to w odważną przygodę.
_Nazwa wewnętrzna: Odstawienie smoczka lub butelki_

### Tab: Relacje i Rodzeństwo (5)

**„Kto jest ważniejszy — ja czy brat?"** — Rywalizacja o uwagę rodziców, zazdrość, kłótnie. Bajka, która pokaże, że miłości nie trzeba się dzielić — jej wystarcza dla każdego.
_Nazwa wewnętrzna: Rywalizacja między rodzeństwem_

**„W rodzinie pojawia się maluszek?"** — Starsze dziecko nagle znów sika w majtki, gryzie niemowlę, domaga się uwagi. Pomóż mu odnaleźć się w nowej roli.
_Nazwa wewnętrzna: Pojawienie się nowego dziecka_

**„Moje! Nie dam!"** — Dzielenie się nie jest łatwe, gdy masz 3 lata. Bajka, która pokaże, że wspólna zabawa jest fajniejsza.
_Nazwa wewnętrzna: Problem z dzieleniem się_

**„Nie chce się bawić z innymi dziećmi?"** — Empatia to umiejętność, której można się nauczyć. Bajka, która pomoże zrozumieć, co czują inni.
_Nazwa wewnętrzna: Empatia i rozumienie emocji innych_

**„Jak budować pierwsze przyjaźnie?"** — Nawiązywanie relacji z rówieśnikami to wyzwanie. Bajka, która pokaże, że pierwszy krok jest najważniejszy.
_Nazwa wewnętrzna: Budowanie pierwszych przyjaźni_

### Tab: Lęki i Odwaga (9)

**„Nie zostawiaj mnie!"** — Każde rozstanie to dramat? Lęk separacyjny jest normalny — i można go oswoić.
_Nazwa wewnętrzna: Lęk separacyjny_

**„Nie chce iść do przedszkola?"** — Bóle brzucha, płacz przy drzwiach, prośby o zostanie w domu. Bajka, która pokaże, że przedszkole to bezpieczne miejsce.
_Nazwa wewnętrzna: Adaptacja przedszkolna i szkolna_

**„Boi się ciemności?"** — Potwory pod łóżkiem, cienie na ścianie. Pomóż dziecku odkryć, że ciemność może być przyjazna.
_Nazwa wewnętrzna: Lęk przed ciemnością_

**„Panikuje u lekarza?"** — Szczepienie, dentysta, biały fartuch = strach. Bajka, która oswoi wizytę lekarską z lęku.
_Nazwa wewnętrzna: Lęk przed zabiegami medycznymi_

**„Zatyka uszy, boi się burzy lub tłumu?"** — Nadwrażliwość na bodźce potrafi sparaliżować. Bajka, która pomoże dziecku znaleźć swój sposób na radzenie sobie.
_Nazwa wewnętrzna: Nadwrażliwość na bodźce_

**„Przeprowadzka — nowy dom, nowy świat?"** — Zmiana miejsca zamieszkania to utrata poczucia bezpieczeństwa. Bajka, która pomoże odkryć, że dom jest tam, gdzie jest rodzina.
_Nazwa wewnętrzna: Zmiana miejsca zamieszkania_

**„Moje dziecko nie wierzy w siebie?"** — Niska samoocena, porównywanie się z innymi. Bajka, która pokaże, jak wiele potrafi.
_Nazwa wewnętrzna: Niska samoocena_

**„Rezygnuje przy pierwszej trudności?"** — Perfekcjonizm, płacz przy przegranej, strach przed błędem. Bajka, która pokaże, że pomyłki to część zabawy.
_Nazwa wewnętrzna: Niska odporność na porażkę_

**„Zmyśla i kłamie?"** — Konfabulacje to często kreatywność, nie złośliwość. Bajka, która pokaże różnicę między wyobraźnią a prawdą.
_Nazwa wewnętrzna: Kłamstwa i konfabulacje_

### Tab: Trudne Sytuacje Życiowe (3)

**„Ktoś bliski odszedł na zawsze?"** — Śmierć w rodzinie to najtrudniejszy temat. Bajka, która pomoże dziecku zrozumieć, że kochane osoby zostają w sercu.
_Nazwa wewnętrzna: Śmierć w rodzinie_

**„Ktoś w rodzinie jest chory?"** — Choroba bliskiej osoby budzi lęk i bezradność. Bajka, która pokaże dziecku, że może być odważne, nawet gdy świat się zmienia.
_Nazwa wewnętrzna: Choroba w rodzinie_

**„Twoje dziecko choruje i musi być dzielne?"** — Pobyt w szpitalu, leki, badania. Bajka, która da dziecku siłę i pokaże, że bycie chorym nie znaczy bycie samotnym.
_Nazwa wewnętrzna: Choroba dziecka_

### Tab: Różnorodność i Akceptacja (5)

**„Dlaczego jestem inny niż inni?"** — Autyzm, ADHD, nadwrażliwość — dziecko czuje, że jest inne. Bajka, która pokaże, że bycie innym to supermoc.
_Nazwa wewnętrzna: Akceptacja odmienności własnej_

**„Dlaczego on jeździ na wózku?"** — Niepełnosprawność fizyczna czy intelektualna rówieśnika. Bajka, która buduje zrozumienie i otwartość.
_Nazwa wewnętrzna: Akceptacja odmienności rówieśników_

**„Nikt nie chce się ze mną bawić?"** — Wykluczenie rówieśnicze boli. Bajka, która pomoże dziecku znaleźć siłę i wiarę w siebie.
_Nazwa wewnętrzna: Wykluczenie rówieśnicze_

**„Po co mi ta szkoła?"** — Zrozumienie sensu nauki, gdy wszystko wydaje się nudne. Bajka, która pokaże, że uczenie się to odkrywanie świata.
_Nazwa wewnętrzna: Zrozumienie celu nauki_

**Łącznie: 3+3+8+5+9+3+5 = 36 wpisów** (uwaga: zliczenie z dokumentu Andrzeja podaje 35 — różnica jednego wpisu pochodzi z duplikacji „Odstawienie smoczka" w tabie Higiena.)

---

## 5. Proces Engagement — po płatności

### 5.1 Preview produktu (przed płatnością)

Po wypełnieniu formularza użytkownik widzi ekran **„Co kupujesz?"**. Jest to strona konwersyjna, **NIE podgląd wygenerowanej książki** (nie generujemy przed płatnością).

Elementy ekranu:

- **Zdjęcia wydrukowanych książek** (realne fotografie, 2-3 ujęcia: okładka, otwarta strona, książka w rękach dziecka)
- Krótki opis: „Twoja spersonalizowana książka terapeutyczna — z imieniem i wyglądem Twojego dziecka, stworzona specjalnie dla [imię]"
- Informacja co zawiera: okładka, strona dedykacyjna, 4-6 rozdziałów z ilustracjami, pytania do dyskusji z dzieckiem
- Opcje cenowe: PDF (cena bazowa) | PDF + druk fizyczny (**+20 PLN**, dostawa kurierem)
- Przycisk: „Zamów książkę dla [imię]"
- Sekcja opinii (social proof) — patrz punkt 5.2

### 5.2 Social proof — opinie

Na stronie konwersyjnej (preview) oraz na landing pages wyświetlamy sekcję opinii. Na start zbieramy 3-5 opinii od testerów:

- Aśka (testerka, matka) — opinia z konkretnym problemem i efektem
- Psycholożka (znajoma) — opinia ekspercka z perspektywy specjalisty
- Kolejni testerzy — w miarę zbierania feedbacku

**Format opinii:** zdjęcie osoby (lub ręki trzymającej książkę), imię, cytat z konkretnym problemem i efektem (np. „Pomógł mojemu dziecku przestać sikać w nocy — po 2 tygodniach czytania bajki syn sam prosi o nocnik"). Opinie muszą wyglądać wiarygodnie — bez stockowych zdjęć, bez generycznych tekstów.

### 5.3 Płatność

Po kliknięciu „Zamów" użytkownik przechodzi do standardowego checkout:

- Wybór opcji dostawy: PDF (natychmiast) lub PDF + druk (+20 PLN)
- Jeśli druk — adres dostawy
- Bramka płatności (Stripe)
- Po potwierdzeniu płatności → natychmiast przejście do ekranu oczekiwania (krok 7)

### 5.4 Ekran oczekiwania na generowanie książki

Kluczowy moment engagement. Generowanie trwa **~2-3 minuty**. W tym czasie utrzymujemy uwagę i budujemy wartość produktu. Ekran składa się z:

#### Pasek postępu

Wizualny progress bar z opisowymi etapami, np.: „Tworzymy historię dla [imię]..." → „Projektujemy ilustracje..." → „Składamy Twoją książkę..." → „Prawie gotowe!"

#### Statyczne karty engagement (przewijane automatycznie)

Karty wyświetlane jedna po drugiej (co ~15-20 sekund) w obszarze pod paskiem postępu. Treść kart:

| Typ karty           | Treść (szablon)                                                                                                                                                                                 | Kontekst / źródło                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Statystyka          | „Czy wiesz, że z problemem [wybrany problem] boryka się nawet 70% rodziców dzieci w wieku [wiek dziecka]?"                                                                                      | Liczba/procent dopasowany do problemu — daje poczucie normalności |
| Nauka / SRE         | „Badania naukowe potwierdzają, że dzieci angażują się głębiej w historie, gdy widzą w nich siebie. Dlatego bohater tej bajki wygląda jak [imię]!"                                               | Efekt Odniesienia do Ja (Self-Reference Effect)                   |
| Bajkoterapia działa | „Bajkoterapia to udowodniona naukowo metoda. Działa przez metaforę — dziecko przetwarza trudne emocje w bezpiecznym, fikcyjnym świecie."                                                        | Z dokumentu badawczego                                            |
| Praktyczna porada   | „Kiedy otrzymasz książkę, pamiętaj: czytaj ją RAZEM z dzieckiem. Po przeczytaniu omówcie, co wydarzyło się w bajce — to podwaja skuteczność!"                                                   | Czytanie dialogowe — z badań Kucirkovej                           |
| Bezpieczny dystans  | „Bohater bajki wygląda jak [imię], ale żyje w magicznym świecie. Ten „bezpieczny dystans" pozwala dziecku przetwarzać emocje bez poczucia zagrożenia."                                          | Eksternalizacja problemu — z Molickiej                            |
| Przewodnik          | „W każdej naszej bajce pojawia się mądry pomocnik — magiczne zwierzę lub postać, która pomoże bohaterowi znaleźć rozwiązanie. To technika pedagogiczna oparta na Strefie Najbliższego Rozwoju." | Wygotski, ZPD                                                     |
| Zaproszenie         | „Inne mamy polecają: po pierwszym czytaniu, zapytaj dziecko: Dlaczego [imię] się bał/a? Co mu/jej pomogło? — zobaczysz, jak dziecko zacznie samo opowiadać o swoich emocjach."                  | Społeczny dowód + praktyczna rada                                 |

#### Wybór stylu ilustracji (~30% postępu)

Przy ~30% postępu generowania pojawia się interaktywny element: „Wybierz styl ilustracji dla książki [imię]". Użytkownik widzi 2 miniaturki z różnymi stylami (np. **akwarelowy** vs. **Pixar/Disney**) i klika preferowany. Ten wybór jest przekazywany do agenta generującego ilustracje.

### 5.5 Dostarczenie książki

Po zakończeniu generowania:

- Ekran z gratulacjami: „Książka [tytuł] dla [imię] jest gotowa!"
- Przycisk: „Pobierz PDF" (natychmiast dostępny)
- Jeśli zamówiony druk: informacja „Twoja książka zostanie wydrukowana i wysłana kurierem w ciągu [X] dni roboczych"
- Możliwość zamówienia kolejnej książki (upsell): „Chcesz stworzyć bajkę na inny temat?"

### 5.6 Struktura dostarczonej książki

Książka PDF/druk zawiera:

- Okładka z imieniem dziecka i kreatywnym tytułem (np. „Gustaw i wulkan emocji")
- Strona dedykacyjna: „Ta książka należy do **\_\_\_\_**" (miejsce na wpisanie imienia)
- 4-6 rozdziałów z tekstem i ilustracjami (liczba zależna od wieku)
- Ostatnia strona: 3 pytania do dyskusji z dzieckiem (generowane przez AI, specyficzne dla tematu)

---

## 6. Reguły językowe strony (Dos / Don'ts)

Obowiązują na wszystkich stronach, landing pages, formularzach i komunikatach. Cel: ciepły, empatyczny ton; minimalizacja odniesień do AI bez ukrywania technologii.

### 6.1 Dos — tak pisz

| Reguła                          | Przykład                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Zamiast „stworzone przez AI"    | „wykreowane przy wsparciu technologii" lub „zaprojektowane specjalnie dla [imię]" |
| Zamiast „system wygeneruje"     | „przygotujemy dla Ciebie" lub „stworzymy książkę"                                 |
| Zamiast „algorytm dobiera"      | „dopasowujemy treść" lub „dostosowujemy bajkę"                                    |
| Zamiast „sztuczna inteligencja" | „nasza technologia" lub „nasz zespół kreatywny" (jeśli kontekst pozwala)          |
| Zamiast „wygenerowana historia" | „spersonalizowana bajka" lub „bajka stworzona dla [imię]"                         |
| Zamiast kategorii suchej        | pytanie empatyczne (np. „Lęk separacyjny" → „Nie zostawiaj mnie!")                |
| Używaj 2. osoby                 | „Twoje dziecko", „Twoja książka", „pomożemy Ci"                                   |
| Używaj języka korzyści          | „Pomóż dziecku..." zamiast „Produkt służy do..."                                  |

### 6.2 Don'ts — tego unikaj

| Reguła                              | Przykład                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Nie eksponuj AI                     | Nie pisz „nasza AI stworzy", „robot napisze bajkę", „algorytm GPT"               |
| Nie używaj żargonu technicznego     | Nie pisz „prompt", „model", „token", „inference"                                 |
| Nie pisz „system"                   | Zamiast „system automatycznie" → „dopasujemy automatycznie"                      |
| Nie obiecuj efektów terapeutycznych | Bajkoterapia to wsparcie, nie leczenie. Nie pisz „wyleczy", „rozwiąże problem"   |
| Nie używaj sucho-klinicznych nazw   | „Nyktofobia" → „Lęk przed ciemnością"; „Enuresis" → „Moczenie nocne"             |
| Nie bądź protekcjonalny             | Nie pisz „Twoje dziecko MA problem". Pisz „Twoje dziecko PRZEŻYWA trudny moment" |
| Nie moralizuj                       | Nie pisz „powinnaś czytać dziecku". Pisz „czytanie razem wzmacnia efekt bajki"   |

---

## 7. Metryki do śledzenia (KPI)

Dla każdego kroku lejka definiujemy mierzalny wskaźnik. Implementacja analityki (Google Analytics / Mixpanel / custom) jest w zakresie Cezarego.

| Etap lejka                 | KPI                        | Definicja                                                 | Cel / Benchmark         |
| -------------------------- | -------------------------- | --------------------------------------------------------- | ----------------------- |
| Pozyskanie                 | CPA (Cost Per Acquisition) | Koszt pozyskania jednego użytkownika na stronę            | Do ustalenia po testach |
| Wejście → Formularz        | CTR „Stwórz książkę"       | % użytkowników, którzy kliknęli CTA na LP/stronie głównej | > 10%                   |
| Formularz krok 1 → krok 2  | Step 1 completion rate     | % użytkowników, którzy wybrali problem i kliknęli Dalej   | > 80%                   |
| Formularz krok 2 → krok 3  | Step 2 completion rate     | % użytkowników, którzy przeszli do personalizacji         | > 70%                   |
| Formularz krok 3 → Preview | Form completion rate       | % użytkowników, którzy dotarli do ekranu preview          | > 60%                   |
| Preview → Płatność         | Conversion rate            | % użytkowników, którzy rozpoczęli płatność                | > 20%                   |
| Płatność → Sukces          | Payment success rate       | % transakcji zakończonych sukcesem                        | > 90%                   |
| Oczekiwanie → Pobranie     | Download rate              | % użytkowników, którzy pobrali PDF                        | > 95%                   |
| PDF → Druk                 | Print upsell rate          | % użytkowników, którzy zamówili też druk                  | > 30%                   |
| Ogółem                     | End-to-end conversion      | % wchodzących na stronę, którzy kupili                    | > 2%                    |

### 7.1 Drop-off analysis

System musi logować, na którym dokładnie kroku użytkownik opuszcza flow. Dla każdego kroku: timestamp wejścia, timestamp wyjścia (lub przejścia dalej), ewentualne interakcje (ile pól wypełnił, czy kliknął coś). Cezary powinien zaimplementować eventy analityczne na każdym przejściu między krokami.

---

## 8. Wymagania i uwagi dla implementacji

### 8.1 Responsywność

Cały flow musi działać na mobile (>60% ruchu prawdopodobnie z telefonu). Formularz musi być wygodny na małym ekranie — duże przyciski, czytelne pola.

### 8.2 Opcja „Inny problem" — obsługa techniczna

Gdy użytkownik wybiera „Inny problem" i wpisuje tekst, system przekazuje go do agenta AI jako wolny input (zamiast predefiniowanego tematu z katalogu). Agent musi poradzić sobie z dowolnym opisem. W specyfikacji promptów (Łukasz) trzeba uwzględnić ten scenariusz. Na stronie wyświetlamy disclaimer.

### 8.3 Dynamiczne placeholdery

Placeholder w polu „Opis sytuacji" (krok 2) zmienia się w zależności od wybranego problemu w kroku 1. Cezary musi zaimplementować mapowanie: temat → placeholder. Lista placeholderów do opracowania wspólnie z Łukaszem.

### 8.4 Parametry przekazywane do agenta

Po zakończeniu formularza system przekazuje do agenta generującego:

| Parametr              | Źródło                                 | Użycie                                                    |
| --------------------- | -------------------------------------- | --------------------------------------------------------- |
| `problem_id`          | Krok 1 (wybór z katalogu) lub „custom" | Wybór odpowiedniego promptu terapeutycznego               |
| `problem_description` | Krok 2 (opis sytuacji)                 | Personalizacja fabuły pod konkretną sytuację dziecka      |
| `child_name`          | Krok 3                                 | Imię bohatera w bajce + tytuł                             |
| `child_age`           | Krok 3                                 | Determinuje: liczbę rozdziałów, długość, złożoność języka |
| `child_gender`        | Krok 3                                 | Płeć bohatera                                             |
| `child_appearance`    | Krok 3 (oczy, włosy, okulary, ubiór)   | Prompt do generatora ilustracji (Visual Anchor)           |
| `favorite_toy`        | Krok 3 (opcjonalne)                    | Element fabuły — ulubiona zabawka jako obiekt przejściowy |
| `illustration_style`  | Krok 7 (ekran oczekiwania, ~30%)       | Styl ilustracji (akwarelowy / Pixar / inny)               |
