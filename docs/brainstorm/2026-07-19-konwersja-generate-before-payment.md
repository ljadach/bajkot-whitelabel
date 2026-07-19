# Konwersja: model „zobacz zanim zapłacisz"

**Data:** 2026-07-19 · **Do dyskusji z:** Łukasz · **Status:** brainstorm — nic z tego nie jest jeszcze wdrożone

Bajkoterapia działa dziś w modelu **try-before-you-buy**: rodzic wypełnia formularz, bajka
generuje się **za darmo i przed płatnością**, a dopiero na końcu — po obejrzeniu podglądu —
płaci za odblokowanie pobrania. Ten dokument opisuje, jak dokładnie wygląda obecny lejek
(na podstawie kodu, nie domysłów), gdzie tracimy ludzi i co możemy zrobić, żeby więcej
wygenerowanych bajek kończyło się płatnością.

**Aktualne ceny:** PDF **49 zł** · PDF + Druk **99 zł**.

---

## 1. Jak działa obecny funnel

Dwa wejścia (strona tematyczna SEO — mamy ich 39 — albo katalog po zalogowaniu), potem
wszystko zbiega się w ten sam przebieg: formularz → generacja → paywall → płatność.

```mermaid
flowchart TD
    subgraph WEJSCIE["🚪 Wejście"]
        A1["Strona tematyczna SEO<br/>(39 tematów, np. lęk przed ciemnością)"]
        A2["Strona główna / Katalog tematów<br/>(wymaga logowania)"]
    end

    subgraph FORMULARZ["📝 Formularz (5 ekranów)"]
        B1["Krok 1: Potwierdzenie tematu"]
        B2["Krok 2: Opis sytuacji dziecka<br/>(pole tekstowe, opcjonalne)"]
        B3["Krok 3: Dane dziecka<br/>imię · wiek · płeć · wygląd · zabawka"]
        B4["Ekran „Co otrzymasz?"<br/>karuzela przykładowej książki + wybór formatu<br/>PDF 49 zł / PDF+Druk 99 zł + opinie"]
        B5["Checkout: e-mail + 2 zgody RODO<br/>(+ adres, jeśli druk)<br/>przycisk: „Generuj bajkę" — BEZ płatności"]
    end

    subgraph GENERACJA["⏳ Generacja (~15 minut, ZA DARMO)"]
        C1["Ekran postępu<br/>pasek + rotujące karty edukacyjne"]
        C2["Wybór stylu ilustracji A/B<br/>(w trakcie, po ~30% postępu)"]
        C3["Dedykacja od rodzica<br/>(30 s po wyborze stylu, można pominąć)"]
        C4["Bajka gotowa —<br/>automatyczne przejście na ekran wyniku"]
    end

    subgraph PAYWALL["💰 Paywall (ekran wyniku)"]
        D1["Podgląd: 7 pierwszych stron PDF<br/>(flipbook z tytułem i imieniem dziecka)"]
        D2["CTA: „Odblokuj PDF (49 zł)"<br/>→ Stripe Checkout"]
    end

    subgraph PO_PLATNOSCI["🎉 Po płatności"]
        E1["Pełne pobranie PDF"]
        E2["E-mail: potwierdzenie zakupu"]
        E3["Druk: alert do fulfillmentu,<br/>wysyłka kurierem 3-5 dni"]
        E4["Upsell: „Stwórz kolejną bajkę""]
    end

    A1 --> B1
    A2 --> B1
    B1 --> B2 --> B3 --> B4 --> B5
    B5 --> C1
    C1 --> C2 --> C3 --> C4
    C4 --> D1 --> D2
    D2 -->|"płatność OK"| E1
    E1 --> E2 & E4
    E2 -.-> E3
    D2 -.->|"anulował płatność"| D1

    style PAYWALL fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style GENERACJA fill:#f0f9ff,stroke:#0284c7,stroke-width:2px
```

### Co rodzic dostaje za darmo (przed zapłaceniem ani złotówki)

| Element                | Szczegóły                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| Pełna generacja bajki  | Cała książka powstaje przed płatnością (tekst + wszystkie ilustracje)      |
| Wybór stylu ilustracji | 2 prawdziwe ilustracje z bohaterem-dzieckiem do wyboru w trakcie generacji |
| Podgląd 7 stron        | Flipbook na ekranie wyniku: okładka + pierwsze strony z imieniem dziecka   |
| Tytuł bajki            | Wygenerowany, spersonalizowany tytuł widoczny nad podglądem                |
| Dedykacja              | Rodzic wpisuje własną dedykację jeszcze przed paywallem                    |

### Zabezpieczenia przed porzuceniem w trakcie generacji (już działają)

- Jeśli rodzic nie wybierze stylu w 15 minut → system wybiera automatycznie styl A i jedzie dalej.
- Jeśli nie zdecyduje o dedykacji w 5 minut → auto-pominięcie.
- Czyli: **każda rozpoczęta generacja kończy się gotową bajką**, nawet gdy rodzic zamknie kartę.

### Co już mierzymy (analityka jest w dobrym stanie)

Cały lejek jest opomiarowany w PostHog + GA4: wybór tematu, każdy krok formularza
(z czasem spędzonym na kroku), obejrzenie ekranu „Co otrzymasz?", checkout, start generacji,
obejrzenie paywalla, kliknięcie „Odblokuj", anulowanie płatności, zakup, pobranie PDF.
Dodatkowo GA4 dostaje event **`book_generated`** („wygenerował, nie zapłacił") — więc
**konwersję wygenerowane → opłacone możemy policzyć już dziś**, bez żadnych zmian w kodzie.

---

## 2. Punkty tarcia i odpadu (na bazie kodu)

### 🔴 T1. E-mail „bajka gotowa" wysyła PEŁNY PDF przed płatnością

> **To jest najważniejsze znalezisko tego dokumentu.** W momencie ukończenia generacji system
> wysyła na e-mail rodzica wiadomość „📖 Bajka dla X czeka na pobranie" z **działającym linkiem
> do pełnego PDF-a** (ważnym 24 h) — niezależnie od tego, czy rodzic zapłacił.

E-mail jest wymagany w checkoucie, więc dotyczy to **każdego zamówienia**. Rodzic, który
porzucił kartę w trakcie generacji (albo świadomie nie kliknął „Odblokuj"), dostaje całą
książkę za darmo do skrzynki. Treść maila („dni od zakupu", „Dziękujemy...") pochodzi
najwyraźniej z czasów, gdy płatność była przed generacją — po zmianie modelu nikt go nie
przestawił. **Paywall na stronie jest szczelny, ale boczne drzwi stoją otworem.**

### T2. Długi formularz przed jakąkolwiek gratyfikacją

5 ekranów zanim cokolwiek się wydarzy: temat → sytuacja → dane dziecka (do 9 pól) →
„Co otrzymasz?" → checkout (e-mail + 2 obowiązkowe zgody RODO + adres przy druku).
Zgoda na przetwarzanie danych „szczególnej kategorii" (problemy dziecka) jest prawnie
konieczna, ale dwa checkboxy + e-mail to realny próg tuż przed startem.

### T3. ~15 minut oczekiwania bez jasnej obietnicy

Copy mówi „to zajmie tylko chwilę", a hint formatu — „gotowa do czytania w 15 minut".
Na ekranie postępu **nie ma szacowanego czasu** ani komunikatu „możesz zamknąć stronę,
damy znać mailem". Rodzic z telefonem w ręku o 21:30 nie wie, czy czekać. Karty
edukacyjne w trakcie czekania są dobre, ale to jedyny mechanizm utrzymania uwagi.

### T4. Powrót do porzuconej generacji prowadzi... przez dziurawy e-mail

Jedyna ścieżka powrotu dla rodzica, który zamknął kartę, to e-mail z T1 — który dziś
oddaje książkę za darmo, zamiast prowadzić na paywall z podglądem. Nie ma żadnej
sekwencji przypomnień (T+24 h, T+72 h) dla wygenerowanych-nieopłaconych.

### T5. Paywall nie sprzedaje — tylko blokuje

Ekran odblokowania to: podgląd + nagłówek + jedno zdanie + przycisk z ceną. Brakuje:
gwarancji zwrotu 14 dni (jest w stopce e-maila, nie ma jej na paywallu!), listy tego,
co konkretnie odblokowuje płatność (pełne ~26+ stron, przewodnik dla rodzica, 5 pytań
do rozmowy), kotwicy cenowej i opinii. Cała siła perswazji jest na ekranie „Co
otrzymasz?" — czyli **przed** generacją, a nie w momencie decyzji o zapłacie.

### T6. Anulowana płatność Stripe = powrót bez słowa

Rodzic, który wszedł w Stripe i się wycofał, wraca na ten sam ekran paywalla bez żadnej
reakcji interfejsu (zdarzenie jest mierzone, ale UI milczy). To moment najwyższej
intencji zakupowej w całym lejku — i nic z nim nie robimy.

### T7. Drobne niespójności komunikacji

- Checkout obiecuje „podgląd **3 stron**", paywall pokazuje **7 stron**.
- Notka przy druku mówi „o adres poprosimy mailem", a formularz zbiera adres od razu.
- Ceny są wpisane na sztywno w kilku miejscach (cennik, opinie klientów z kwotami
  „29 zł"/„49 zł", teksty przycisków) — po zmianie na 49/99 zł trzeba je zsynchronizować
  wszędzie, inaczej rodzic zobaczy dwie różne ceny w jednym lejku.

---

## 3. Propozycje poprawy konwersji

Wszystkie kręcą się wokół wzmocnienia modelu „zobacz zanim zapłacisz": skoro dajemy
produkt przed płatnością, to (a) boczne drzwi muszą być zamknięte, (b) moment „chcę to
mieć" musi być maksymalnie doładowany emocjonalnie, (c) każdy, kto wygenerował i nie
zapłacił, musi mieć zaplanowaną ścieżkę powrotu.

Skala: **Effort** S = godziny, M = 1-3 dni, L = tydzień+. **Impact** = oczekiwany wpływ na konwersję wygenerowane → opłacone.

### P1. Naprawa e-maila „bajka gotowa" → e-mail z podglądem i CTA odblokowania

**Co:** Zamiast pełnego linku do PDF — e-mail „Bajka dla Zosi jest gotowa — zobacz
pierwsze strony" prowadzący na ekran paywalla (podgląd 7 stron + przycisk odblokowania).
Pełny link zostaje wyłącznie w mailu po płatności.

**Dlaczego:** Bez tego cała reszta nie ma sensu — dziś każdy niedoszły klient dostaje
produkt za darmo do skrzynki. To nie optymalizacja, to **uszczelnienie modelu biznesowego**.
Bonus: ten e-mail staje się naturalnym pierwszym krokiem sekwencji przypomnień (P3).

**Effort: S** · **Impact: wysoki** (warunek konieczny modelu)

### P2. Doładowanie ekranu paywalla

**Co:** Na ekranie odblokowania dodać: (1) gwarancję zwrotu 14 dni z ikoną, (2) listę
„co odblokowujesz" — pełne ~26 stron, przewodnik dla rodzica, 5 pytań do rozmowy,
możliwość druku w domu, (3) kotwicę cenową („49 zł — mniej niż jedna konsultacja
u psychologa, a czytacie codziennie"), (4) jedną opinię rodzica.

**Dlaczego:** Rodzic podejmuje decyzję o pieniądzach dokładnie na tym ekranie, a dziś
jest on najuboższy perswazyjnie w całym lejku. Gwarancja zwrotu zdejmuje ryzyko
(a już jej udzielamy — tylko piszemy o tym w stopce maila). Czysta robota copy +
układ, zero zmian w logice.

**Effort: S** · **Impact: wysoki**

### P3. Sekwencja przypomnień dla wygenerowanych-nieopłaconych

**Co:** Automatyczne e-maile do zamówień z gotową bajką i brakiem płatności:

- **T+2 h:** „Bajka dla Zosi wciąż czeka" + okładka bajki w treści maila + link do podglądu,
- **T+24 h:** akcent na gwarancję i opinie,
- **T+72 h:** kod rabatowy (np. −20%; Stripe ma już włączoną obsługę kodów promocyjnych,
  więc technicznie to tylko utworzenie kodu i wpisanie go do maila).

**Dlaczego:** Klasyka odzyskiwania porzuconych koszyków — a nasz „koszyk" jest wyjątkowo
mocny, bo zawiera gotowy, spersonalizowany produkt z imieniem dziecka na okładce. Mamy
e-mail (wymagany), mamy zgodę, mamy infrastrukturę wysyłki — brakuje tylko harmonogramu.

**Effort: M** · **Impact: wysoki**

### P4. „Możesz zamknąć stronę" + realny czas na ekranie oczekiwania

**Co:** Na ekranie postępu: „Tworzenie bajki trwa zwykle ok. 15 minut. Możesz zamknąć
tę stronę — wyślemy e-mail, gdy bajka będzie gotowa." (Po wdrożeniu P1 ten e-mail
prowadzi na paywall, więc nie oddajemy nic za darmo.)

**Dlaczego:** Niepewność („ile to potrwa?") jest gorsza niż samo czekanie. Jawna
obietnica maila zdejmuje presję i zamienia porzucenie karty z „utraconego klienta"
w „klienta w sekwencji e-mailowej". Dziś copy wręcz kłamie („to zajmie tylko chwilę").

**Effort: S** · **Impact: średni**

### P5. Fragment bajki na żywo w trakcie czekania

**Co:** Gdy tekst bajki jest już napisany (w trakcie generacji ilustracji), pokazać na
ekranie postępu pierwszy akapit: „Pierwsze zdania bajki dla Zosi już są ✨". Backend już
dziś umie wyciągnąć fragment pierwszej sceny (robi to dla paywalla) — chodzi o pokazanie
go wcześniej.

**Dlaczego:** Efekt posiadania zaczyna działać, zanim rodzic zobaczy paywall — czytał
już „swoją" bajkę, jego dziecko jest bohaterem. Im więcej zainwestowanej uwagi przed
paywallem, tym trudniej odejść. To też najlepszy moment emocjonalny całego produktu
(pierwszy raz widzi imię dziecka w opowieści).

**Effort: M** · **Impact: średni-wysoki**

### P6. Imię dziecka na okładce już na ekranie „Co otrzymasz?"

**Co:** W karuzeli przykładowej książki (ekran przed checkoutem) nałożyć imię dziecka
z formularza na przykładową okładkę — „Zosia i wulkan emocji" zamiast anonimowego sampla.
Czysto frontendowa nakładka tekstu na istniejący obrazek.

**Dlaczego:** Personalizacja przed jakimkolwiek kosztem (nawet przed generacją) podnosi
przejście przez checkout — rodzic ogląda już „książkę swojego dziecka", a nie produkt
z półki. Tania wersja instant gratification.

**Effort: S/M** · **Impact: średni**

### P7. Odchudzenie kroku „Dane dziecka"

**Co:** Zostawić na wierzchu tylko: imię, wiek, płeć. Wygląd (oczy, włosy, okulary,
strój, zabawka) schować w rozwijane „✨ Dopracuj wygląd bohatera (opcjonalne)" z sensownymi
domyślnymi wartościami. Krok „sytuacja" wyraźniej oznaczyć jako opcjonalny.

**Dlaczego:** Mierzymy czas na każdym kroku formularza, więc hipotezę „krok 3 to
zjadacz konwersji" można zweryfikować danymi **przed** wdrożeniem. Mniej pól = mniej
momentów na „wrócę do tego później". Pola opcjonalne wypełni ten, komu zależy — czyli
ten, kto i tak kupi.

**Effort: M** · **Impact: średni** (weryfikowalny danymi z PostHog przed decyzją)

### P8. Reakcja na anulowaną płatność

**Co:** Gdy rodzic wraca ze Stripe po anulowaniu: pasek „Twoja bajka wciąż na Ciebie
czeka — masz 14 dni gwarancji zwrotu" zamiast identycznego ekranu bez słowa. Opcjonalnie
po 2. anulowaniu: „Coś nie zagrało z płatnością? Napisz do nas".

**Dlaczego:** To ludzie o najwyższej intencji w całym lejku (kliknęli „Odblokuj"!).
Zdarzenie już jest mierzone — brakuje tylko reakcji interfejsu na nie.

**Effort: S** · **Impact: niski-średni**

### P9. Upgrade do druku na paywallu

**Co:** Rodzic, który zamówił sam PDF, widzi na paywallu obok „Odblokuj PDF (49 zł)"
drugą opcję: „PDF + wydrukowana książka (99 zł)" — z możliwością przełączenia formatu
tuż przed płatnością.

**Dlaczego:** Decyzja o formacie zapadała przed generacją, „w ciemno". Po obejrzeniu
7 stron z własnym dzieckiem na ilustracjach chęć posiadania fizycznej książki jest
naturalnie wyższa — to najlepszy moment na podniesienie wartości koszyka, nie konwersji.
Wymaga zmiany formatu zamówienia po stronie backendu + zebrania adresu po płatności.

**Effort: M** · **Impact: średni** (podnosi AOV, nie liczbę transakcji)

### P10. Porządek w komunikacji cen i obietnic

**Co:** Jedno źródło prawdy dla cen 49/99 zł (dziś kwoty siedzą w kilku plikach, w tym
w cytowanych opiniach klientów), „3 strony" → „7 stron" w checkoucie, poprawka notki
o adresie przy druku.

**Dlaczego:** Rozjazd cen w obrębie jednego lejka (inna kwota na cenniku, inna na
przycisku) to zabójca zaufania w produkcie dla rodziców, który sprzedaje „spokój".
Higiena, nie feature.

**Effort: S** · **Impact: niski** (ale obowiązkowy przy zmianie cen)

---

## 4. Priorytetyzacja

| #   | Propozycja                                | Effort | Impact     | Uwagi                                       |
| --- | ----------------------------------------- | ------ | ---------- | ------------------------------------------- |
| P1  | Naprawa e-maila „bajka gotowa"            | S      | 🔴 wysoki  | Warunek modelu — boczne drzwi do zamknięcia |
| P2  | Doładowanie paywalla (gwarancja, kotwica) | S      | 🔴 wysoki  | Samo copy, zero ryzyka                      |
| P3  | Sekwencja przypomnień (2 h / 24 h / 72 h) | M      | 🔴 wysoki  | Wymaga P1; kody rabatowe gotowe w Stripe    |
| P4  | „Możesz zamknąć stronę" + realny czas     | S      | 🟡 średni  | Wymaga P1                                   |
| P5  | Fragment bajki podczas czekania           | M      | 🟡 średni+ | Mechanizm już istnieje dla paywalla         |
| P6  | Imię dziecka na okładce przed checkoutem  | S/M    | 🟡 średni  | Czysty frontend                             |
| P7  | Odchudzenie formularza                    | M      | 🟡 średni  | Najpierw sprawdzić dane z PostHog           |
| P9  | Upgrade do druku na paywallu              | M      | 🟡 średni  | Podnosi AOV, nie konwersję                  |
| P8  | Reakcja na anulowaną płatność             | S      | 🟢 niski+  |                                             |
| P10 | Porządek w cenach i obietnicach           | S      | 🟢 niski   | Obowiązkowe przy zmianie cen na 49/99       |

### Rekomendowana kolejność — pierwsze 3 kroki

> **Krok 1 — P1 (+ P10 przy okazji):** zamknąć wyciek pełnego PDF-a w e-mailu i wyrównać
> ceny. Dopóki to wisi, optymalizowanie paywalla to lanie wody do dziurawego wiadra.
>
> **Krok 2 — P2 + P4:** doładować paywall (gwarancja, „co odblokowujesz", kotwica cenowa)
> i uczciwie zakomunikować czas oczekiwania z obietnicą e-maila. Dwie zmiany czysto
> tekstowo-układowe, możliwe w jeden dzień.
>
> **Krok 3 — P3:** uruchomić sekwencję przypomnień. Od tego momentu każda wygenerowana
> a nieopłacona bajka ma zaplanowane trzy szanse powrotu zamiast zera.

Przed i po każdym kroku patrzymy na jedną liczbę: **`book_generated` → `purchase` w GA4**
(konwersja wygenerowane → opłacone). Ona już się liczy — mamy darmową grupę kontrolną
w danych historycznych.

---

## 5. Otwarte pytania do decyzji (z Łukaszem)

1. **Ilu ludzi już dostało pełny PDF za darmo mailem?** Da się oszacować z danych
   (wygenerowane bajki z e-mailem, bez płatności). Czy chcemy do nich wrócić z osobnym
   mailem sprzedażowym („podobała się bajka? zamów druk / kolejną"), czy odpuszczamy?
2. **Rabat w 3. przypomnieniu** — dawać w ogóle? Jaki poziom (−20%? −10 zł?)? Ryzyko:
   uczymy rodziców, że warto poczekać 3 dni. Alternatywa: zamiast rabatu — bonus
   (np. druga bajka −50%).
3. **7 stron podglądu — za dużo, za mało?** Przy książce ~26+ stron pokazujemy ~25%.
   Czy testujemy 5 vs 7 vs 9? (Zmiana jest tania — to parametr składania podglądu.)
4. **Moment pokazania ceny:** dziś cena jest widoczna od ekranu „Co otrzymasz?" (przed
   generacją). Zostawiamy (transparentność = zaufanie) czy testujemy wariant „cena
   dopiero na paywallu"? Moja intuicja: zostawić — rodzic zaskoczony ceną na końcu
   poczuje się złapany w pułapkę, a to grupa wyjątkowo wrażliwa na zaufanie.
5. **Adres do druku:** zbierać przed generacją (jak dziś) czy po płatności? Po płatności
   = krótszy formularz i mniejsza bariera, ale dodatkowy krok do obsłużenia mailowo.
6. **Gwarancja zwrotu 14 dni** — potwierdzamy ją oficjalnie jako element oferty na
   paywallu i cenniku? (Dziś istnieje tylko w stopce e-maila.) Jaki był dotychczas
   realny poziom zwrotów?

---

## Aneks: gdzie to siedzi w kodzie (dla wdrażających)

| Temat                                         | Miejsce                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Ekrany formularza (wizard/preview/checkout)   | `src/components/book/order-flow/` (`OrderWizard`, `OrderPreview`, `OrderCheckout`)                                              |
| Paywall + podgląd 7 stron                     | `src/components/book/BookResult.tsx` (`BookPreviewScreen`)                                                                      |
| E-mail „bajka gotowa" (wyciek T1)             | `convex/email.ts` (`sendBookReady`) + `convex/lib/email.ts`, wywoływany z `convex/bookPipelineHelpers.ts` (`markOrderComplete`) |
| Bramka płatności / kody promocyjne            | `convex/stripe.ts` (`allow_promotion_codes: true` już włączone)                                                                 |
| Gating pobrania (płatność)                    | `convex/bookPipeline.ts` (`getDownloadUrl`, `getOrderPreview`, `isPaid`)                                                        |
| Auto-styl po 15 min / auto-dedykacja po 5 min | `convex/bookPipelineHelpers.ts` (`autoResolveStyleVotes`), `convex/bookPipeline.ts` (`autoSkipStaleDedication`)                 |
| Ekran oczekiwania + karty edukacyjne          | `src/components/book/ProgressJourney.tsx`, `BookProgressShell.tsx`                                                              |
| Analityka lejka                               | `src/lib/gtag.ts` (`book_generated`, `purchase`), `trackEvent(...)` w komponentach                                              |
| Ceny (do synchronizacji przy 49/99)           | `src/lib/pricing.ts`, `src/locales/pl/book.json`, `src/data/cennik.ts`                                                          |
