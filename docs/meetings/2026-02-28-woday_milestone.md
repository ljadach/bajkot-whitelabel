# Milestone: 8 marca 2026 — Minimal Lovable Product

Ustalenia ze spotkania Cezary + Lukasz, 28.02.2026.

## Nadrzedna zasada

**Relewancja tresci jest warunkiem koniecznym.** Wszystko inne to otoczka. Jesli tresc lekcji nie bedzie zajebiście dobra, produkt jest bezwartosciowy. Zarzadzamy scope'em, nie jakoscia.

## Co MUSI byc na 8 marca

### 1. Wyzsza jakosc generowanych lekcji (PRIORYTET #1)

- Otworzyc generowanie na internet (Google Search) — promptowac model, zeby budowal merytoryke z wiedzy stabilnej + najnowszych nowin z sieci
- Style guide juz podlaczony (krotkie zdania, krotkie paragrafy)
- Przetestowac na **4 zdefiniowanych personach** przez automat losujacy intake (tryb debug z hydraulikiem)
- Cel: 8/10 — ciekawe, wciagajace, niepowtarzajace sie
- Rozwazenie drozsszego modelu do generowania tresci

### 2. Poprawiony intake — suwaki oceny pojec

Nowy krok po zakonczeniu czatu intake'owego:

- AI generuje **~9 pojec** dopasowanych do profilu uzytkownika (na podstawie intake'u)
- Uzytkownik ocenia kazde na **skali 5-stopniowej** (Likert: -2 do +2, czyli "nie znam" → "bardzo dobrze znam")
- **Warunkowo**: wyswietlac tylko tam, gdzie doda wartosc (nie dla kompletnych poczatkujacych)
- Mozliwosc skipowania (nie wymuszac odpowiedzi)
- Efekt: tani 2-sekundowy sposob rozdzielenia uzytkownikow na ~14 roznych poziomow

### 3. Poprawione cwiczenia

- Cwiczenia sie powtarzaly u mniej zaawansowanych uzytkownikow (zgloszony bug w issues)
- Cwiczenia daja element interaktywny — wazniejsze niz wideo

### 4. Ekran prompta/skilla

- Zostawic ekran z promptem jak jest
- Dodac maly "trapdoor" link na dole: mozliwosc wklejenia skilla zamiast prompta
- Cel: zaawansowani uzytkownicy widza, ze produkt zna pojecie Skills — buduje wiarygodnosc

### 5. Merge PR #33

- Otwiera droge do dalszych prac
- Lukasz wysle jako unconditional (bez dodatkowej feature flagi)
- Cezary merguje rano nastepnego dnia

### 6. Cleanup feature flagow

- Szuflady (pomoce naukowe: kontrapositor, wyrocznia Feynmana, notatki) — wlaczalne/wylaczalne z konta admina
- Usunac dodatkowa flage PostHog — zrobic sitewide
- Szuflady sa persystentne (zmiana z wczesniejszej wersji)

## Co NIE wchodzi na 8 marca

| Feature | Status | Komentarz |
|---|---|---|
| Stripe / platnosci | Odlozone | Free early beta, naklejka "free beta" na landing |
| Wideo w lekcjach | Odlozone | Sprawdzic stan ok. srody — jesli czas pozwoli. Jakosc niestabilna ("zdarzalo sie dobrze, zdarzalo sie zle") |
| Historia kursow / wiele kursow | Odlozone | Przygotowac strukture danych (data model) pod kursy, ale flow generowania kolejnych kursow po terminie |
| Ilustracje komiksowe (nano-banana) | Optional | Nice to have, jesli zostanie czas |
| Enterprise / kustomizacja | Nie | Nie na ten etap |
| Team Cant | Nie | Wersja solo |
| Zaawansowany adaptywny intake (pytania w trakcie lekcji) | Odlozone | Dobry pomysl, ale kłoci sie z deadline'em |
| Spolka | Odlozone | Lukasz nie zalozy do 8 marca |

## Kluczowe ustalenia

### Nazewnictwo (wazne dla data modelu)

- **Kurs** = calosciowy zestaw (np. 6 modulow)
- **Modul** = jedna jednostka tematyczna (ma 3 lekcje + mozliwosc dorobiania)
- **Lekcja** = pojedyncza jednostka nauki (rozdzial)

### Strategia testowania jakosci

1. Zdefiniowac 4 typowe persony (metoda ekspercka lub przez Gemini)
2. Zaprogramowac je do automatu losujacego intake
3. Wygenerowac kursy dla kazdej persony
4. Ocenic: czy 8/10 ciekawe, wciagajace, niepowtarzajace sie, oparte na aktualnej wiedzy

### Suwaki vs binarny wybor

- Odrzucono: binarny "znam / nie znam" (za malo informacji)
- Przyjeto: skala 5-stopniowa z mozliwoscia wahania sie
- Dodatkowy sygnal: czlowiek nie musi jednoznacznie deklarowac — samo wahanie jest informacja

### Internet w generowaniu tresci

- Hipoteza: wlaczenie Google Search w prompcie da wynik "not bad, 8/10"
- Argument: 80% uzytkownikow nie zna nawet rzeczy sprzed roku — aktualnosc to bonus, nie wymog
- Hardcore power userzy (1%) i tak sobie sami e-tutora napisza

### Podejscie do kodu pisanego przez AI

- Obaj wypuszczaja na produkcje kod, ktorego do konca nie widzieli
- Akceptowalne ryzyko: brak klientow = brak strat
- Plan B: jak cos wybuchnie, Claude rozczyta, udokumentuje i zrefaktoryzuje

## Plan pracy na weekend 1-2 marca

**Cezary:**
- Sobota: kodowanie (pogoda: slonecznie)
- Niedziela: wolne (pogoda: deszcz)
- Priorytet: merge PR, wlaczenie Google Search w generowaniu, test jakosci lekcji

**Lukasz:**
- Wysle PR z szufladami jako unconditional (bez feature flagi)
- Wyslij materialy w ciagu dnia

## Kontekst zewnetrzny

- **Konkurs edukacyjny** — termin 8 marca, opis inicjatywy (kilkadziesiat linijek), bez specjalnych wymagan technicznych
- **Helios** — potencjalne szkolenie za 40k PLN (decyzja pon-sro), 2 grupy x 10 osob
- Przemek Staniszewski i temat GEO (SEO dla AI) — zaparkowany, wymaga dluzszej dyskusji
