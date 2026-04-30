# Poprawki — feedback z 2026-04-29

Format: każda poprawka w oryginalnym brzmieniu + (jeśli niejasna) maks. 2 pytania doprecyzowujące.

---

## 1. Bezpieczeństwo

### 1.1 Dodać zabezpieczenia na "prompt and code injection"

**Oryginał:** Dodać zabezpieczenia na "prompt and code injection"

**Pytania:**

1. Czy chodzi o sanitizację inputu od rodzica (imię dziecka, dedykacja, opis problemu) zanim trafi do LLM-a — czy o coś szerszego (np. walidacja outputu LLM-a, RBAC na admin, itp.)?
2. Jaki konkretny scenariusz ataku Cię najbardziej martwi — rodzic-troll wstrzykujący instrukcje do bajki, czy ekstrakcja system promptów, czy coś innego?

---

## 2. Strona główna (HP)

### 2.1 Usunąć ze strony głównej "zaloguj"

**Oryginał:** Usunac ze strony głównej "zalogu"

**Jasne** — wywalić link "Zaloguj" z headera/hero na `/`.

### 2.2 Zdjęcie na stronę główną — "ręka mamy z książką"

**Oryginał:** Wstawic zdjecie na strone główna zamiast teog co jest "ręka mamy z książką"

**Pytania:**

1. Masz konkretny plik / źródło tego zdjęcia (Drive, Figma, link), czy mam je wygenerować / dobrać stockowe?
2. Które zdjęcie zastępujemy — hero image, czy któryś z kafelków niżej?

### 2.3 Powtórzyć menu na każdym landingu ze strony głównej

**Oryginał:** Powtórzyć menu na każdym landingu ze strony głównej

**Jasne** — `<TopicNav>` ma mieć ten sam zestaw linków co header z HP (logo, nawigacja, CTA).

### 2.4 Nowy editorial na HP

**Oryginał:** Nowy editorial na HP (podobny do landing pageóœ)

**Pytania:**

1. "Editorial" = layout typu topic-landing (hero → pain → science → CTA), czy konkretny copy/sekcja którą chcesz dorzucić?
2. Mamy zachować obecny topic grid + 4 zasady terapeutyczne + FAQ, czy całość HP przerabiamy na editorial?

### 2.5 Usunąć "inny problem" z całej strony w tym z katalogu

**Oryginał:** Usunąć "inny problem" z całej strony w tym z katalogu

**Jasne** — wywalić kafelek/opcję "inny problem" z HP, katalogu i wszystkich miejsc gdzie się pojawia (m.in. wizard).

### 2.6 Po wejściu do katalogu nie przenosi na górę landing page

**Oryginał:** Po wejsciu do katalogu i kliknieciu nie przenosi na góre landing page tylko po środku

**Jasne** — kliknięcie kafelka w katalogu → scroll-to-top na docelowym landingu (nie zachowywać scroll position).

### 2.7 Kafelki z problemami randomly się zmieniają

**Oryginał:** Kafelki z problemami w katalogu randomly sie zmieniaja, a powinny byc na stale w tym samym miejscu

**Jasne** — usunąć randomizację kolejności kafelków, kolejność deterministyczna (zgodna z `topics.ts`).

---

## 3. Pricing

### 3.1 Dodać stronę pricing

**Oryginał:** Dodać stronę pricing

**Pytania:**

1. Jakie tiery/ceny — jedna cena za bajkę, paczki (3/5/10), subskrypcja? Masz już gotowy cennik czy go ustalamy?
2. Ma być osobna route (`/pricing`) z linkiem w nawigacji, czy sekcja na HP?

---

## 4. Kreator (formularz zamawiania bajki)

### 4.1 "Gotowa do czytania w 15 minut" → "Bajka gotowa do czytania w 15 minut"

**Oryginał:** Gotowa do czytania w 15 minut -> Bajka gotowa do czytania w 15 minut

**Jasne** — zamiana stringu w copy.

### 4.2 Zwinąć "Stwórz bajkę" gdy scroll dojdzie do #kreator

**Oryginał:** Gdy dojdzie do zakładki #kreator to ma zwinąć "Stwórz bajkę" w prawnym górnym rogu

**Jasne** — sticky CTA "Stwórz bajkę" w prawym górnym rogu znika (lub się zwija) gdy sekcja `#kreator` wchodzi do viewportu (IntersectionObserver).

### 4.3 Wywalić nagłówek-tekst i zdjęcia w kolejnych krokach kreatora

**Oryginał:** Wywalić nagłówek - tekst i zdjecia w kolejnych krokach kreatora żeby został sam kreator

**Pytania:**

1. Wywalamy z **wszystkich** kroków (Dziecko, Temat, Wygląd, Przewodnik, Finalizacja), czy tylko z kroków 2+ (zostawiając krok 1 z hero)?
2. "Sam kreator" = pole formularza + przyciski nawigacyjne, czy zostawiamy też mini-progres (np. "Krok 2 z 5")?

### 4.4 Komunikat błędu poza viewportem

**Oryginał:** Komunikat błędu musi być widoczny w vieporcie, w tej chwili jwst powyżej

**Jasne** — przy błędzie walidacji scroll-into-view do komunikatu (lub renderować błąd w pobliżu przycisku Dalej).

### 4.5 Strzałki przerzucają zbyt daleko

**Oryginał:** Strzałki przerzucają zbyt daleko a nie krok wstecz

**Pytania:**

1. "Strzałki" = przyciski Wstecz/Dalej w kreatorze, czy strzałki klawiatury (←/→), czy carousel/slider w którymś kroku?
2. Co konkretnie się dzieje — przeskakuje 2 kroki zamiast 1, czy wraca na samą górę formularza zamiast do poprzedniego kroku?

### 4.6 W formularzu w nagłówku temat powielony

**Oryginał:** W formularzu w nagłówku żeby było temat powielony, zeby wiedziec gdzie się jest

**Jasne** — w nagłówku kreatora wyświetlać aktualnie wybrany temat (np. "Temat: Lęk separacyjny") na każdym kroku.

### 4.7 Krok 3 (płatność) na koniec + preview pierwszych 3 stron

**Oryginał:** Krok 3 (płatnośc) przerzucamy na koniec (preview dodajemy pierwszych 3 stron książki)

**Pytania:**

1. Czy preview ma być **wygenerowany** (tj. wcześniej już bajka leci przez pipeline) czy **mock/template**? Jeśli wygenerowany — czy to znaczy generujemy bajkę za darmo, a płatność jest gate przed pełnym PDF?
2. Co ma być w preview — 3 strony rzeczywistej bajki tego dziecka, czy 3 przykładowe strony "tak będzie wyglądać Twoja bajka"?

---

## 5. Checkout / płatności / dystrybucja

### 5.1 Brakuje preview i płatności na końcu (Stripe)

**Oryginał:** Brakuje Preview i płatnośc na końcu (Stripe).

**Powiązane z 4.7** — patrz pytania tam.

### 5.2 Info o wydruku przed płatnością

**Oryginał:** Brakuje na checkoucie info ze jesli chce wydruk to wysylam formularz / maila.

**Pytania:**

1. Wydruk realizujemy ręcznie (formularz/mail do nas), czy mamy jakiegoś dostawcę druku (np. printu.pl, drukomat) zintegrowanego?
2. Adres dostawy zbieramy w tym samym formularzu co bajkę, w osobnym kroku po płatności, czy mailowo?

### 5.3 Opcja "chcę wydruk" za przyciskiem "Pobierz PDF"

**Oryginał:** Za guzikiem pobierz PDF powinna byc opcja chce wydruku

**Jasne** — na stronie wyniku, obok/pod przyciskiem "Pobierz PDF", drugi CTA "Chcę wersję drukowaną" (otwiera formularz / kontakt — patrz 5.2).

### 5.4 W drugim boxie: PDF od ręki, wydruk 3-5 dni roboczych

**Oryginał:** W drukim boxie ponizej na stronie plate PDF od ręki a wydruk 3-5 dni robocze

**Pytania:**

1. "Drugi box" = który dokładnie? Sekcja na pricing, na stronie wyniku, w kreatorze przed płatnością?
2. Czy chcesz dokładnie ten string ("PDF od ręki, wydruk 3-5 dni roboczych") czy tylko sens (czas dostawy)?

### 5.5 PDF wysyłany na maila

**Oryginał:** PDF musimy też wysyłac na maila

**Pytania:**

1. Wysyłamy automatycznie po wygenerowaniu (zamiast / oprócz strony download), czy jako opcja "wyślij mi też na maila"?
2. Mailing przez Resend/SendGrid/Postmark — masz preferencję, czy wybieramy najprostsze?

---

## 6. Pipeline / treść bajki

### 6.1 Dedykacja nie pojawia się w książce

**Oryginał:** Dedykacja nie pojawia się w książce

**Jasne** — bug. Dedykacja zbierana w `DedicationForm.tsx` ale nie ląduje na pierwszej stronie PDF. Sprawdzić `bookComposer.ts` i flow zapisu `dedication` w `bookOrders`.

### 6.2 Wywalić podpisy na obrazkach w PDF

**Oryginał:** Wywalic podpisy naa obrazkach ktore sie generuja do pdfa

**Pytania:**

1. "Podpisy" = caption pod ilustracją w PDF, czy watermark/tekst na samej ilustracji (z generatora obrazu), czy oba?
2. Wywalamy ze wszystkich ilustracji w bajce, czy też z okładki?

### 6.3 Smok Bąbelek — bajka zbyt blisko przykładu

**Oryginał:** Czeeto ksiaza czerpie z przykładu i wszedzie prawie jest Smok Bąbelek. Albo dodajemy wiecej przykładów albo kolejny prompt zeby nie korzystał z przykładów literalnie

**Pytania:**

1. Wolisz: (a) dorzucić 5-10 dodatkowych przykładów do A2 (Story Architect) i randomizować który leci do promptu, czy (b) dodać explicit instrukcję w systemie "nie używaj imion ani postaci z przykładów, traktuj je tylko jako wzorzec struktury"? (Albo oba.)
2. "Smok Bąbelek" pojawia się w jakim kroku — w outline od A2, czy dopiero w prozie z A3? (Determinuje gdzie wzmocnić prompt.)

### 6.4 Brakuje pytań na końcu książki dla rodzica

**Oryginał:** Brakuje pytań na końcu książki dla rodzica żeby zadał dziecku

**Pytania:**

1. To ma być nowy stage pipeline'u (np. A8 = "Parent Discussion Questions") czy dorzucić do istniejącego A4 (Psych Review) jako dodatkowy field?
2. Ile pytań — 3, 5, 7? Tematycznie powiązane z konkretnym problemem dziecka, czy ogólne?

### 6.5 Odmiana imienia "Gustaw" w dedykacji

**Oryginał:** Stworzone z miłością dla Gustaw -> nie odmienia w ksiązce

**Jasne** — bug językowy. Imię dziecka musi być w celowniku ("dla Gustawa") w sekcji dedykacji. Patrz też 6.6 i 6.7.

### 6.6 Imiona nie odmieniają się w tekstach formularza

**Oryginał:** Imiona nie odmieniaja sie w tekstach w formularzu

**Pytania:**

1. W których konkretnie miejscach formularza widziałeś brak odmiany — masz screen / krok? (Żebym wiedział czy to wszystkie templated stringi czy tylko niektóre.)
2. Idziemy z bibliotekę odmiany (np. `polish-conjugator`, `odmiana-pl`) czy ręczne mapowanie najczęstszych imion + fallback "dla [Imię]"?

### 6.7 "Czy wiesz że..." musi mieć odmianę imienia

**Oryginał:** CZy wiesz że musi mieć odmiane imienia dziecka

**Jasne** — powiązane z 6.5 i 6.6: wszystkie wystąpienia imienia w bajce muszą być w odpowiednim przypadku (mianownik/dopełniacz/celownik/biernik). Realizacja przez prompt + post-processing albo bibliotekę odmiany.

---

## 7. UX progressu / generowania

### 7.1 Komunikaty progress bez "podtekstów technicznych"

**Oryginał:** Trwa magia jest ok, ale podteksty typu "profilowanie dziecka / projekt / etc.

**Pytania:**

1. Wywalamy całkiem "podpisy" pod-stage (zostawiamy sam tekst "Trwa magia..." + animacja), czy zamieniamy na bardziej user-friendly (np. "profilowanie dziecka" → "poznajemy Twoje dziecko")?
2. Czy chcesz to też w event timeline (admin/debug) czy tylko w widoku rodzica?

### 7.2 "Dodaj dedykację" pojawia się po 30s od wyboru obrazka

**Oryginał:** Dodaj dedykację powinno się pojawić po ok 30 sekundach od wyboru obrazka. (w miedzyczasie te same informacje co wczesniej)

**Jasne** — po style vote: 30s opóźnienia z tym samym progress journey co wcześniej, dopiero potem `phase = 'dedication'` → render `DedicationForm`. Zmienić w `BookProgressShell` / vote handler.

---

## 8. Ilustracje landingów

### 8.1 Wygenerować nowe zdjęcia ilustracje na każdy landing

**Oryginał:** Wygenerować nowe zdjęcia na ilustrację do kazdego Landing Page

**Pytania:**

1. Generujemy przez nasz pipeline (Gemini image gen) czy zlecamy ręcznie / stock? Mamy 15 topiców → 15 ilustracji.
2. Format/wymiary i styl wizualny (ten sam co w bajkach, czy bardziej "marketingowy")? Masz brief / moodboard?

---

## 9. Low priority

### 9.1 Rozwinąć "Metoda oparta na badaniach"

**Oryginał:** Rozwinąć "Metoda oparta na badaniach" żeby był jakis tekst

**Pytania:**

1. Jakie konkretne badania / źródła chcesz zacytować — masz listę, czy mam zaproponować (bibliotherapy, narrative therapy, attachment theory)?
2. Długość — krótki akapit (~3 zdania), czy pełna sekcja editorial z linkami do papers?
