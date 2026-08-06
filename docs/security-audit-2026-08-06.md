# Audyt bezpieczeństwa — 2026-08-06

## Status dokumentu

Ten dokument opisuje stan repozytorium i produkcji z 6 sierpnia 2026 r. Zastępuje wcześniejsze audyty bezpieczeństwa usunięte w tym samym commicie.

Zakres:

- frontend React Router i kod SSR,
- publiczne funkcje Convex oraz funkcje administracyjne,
- Clerk i autoryzacja zasobów,
- landing-order capability tokens,
- Stripe Checkout i webhooki,
- endpointy HTTP i middleware Vercel,
- PII, dane dzieci, analityka i obserwowalność,
- XSS, przekierowania, storage i nagłówki bezpieczeństwa,
- zależności produkcyjne i lokalne sekrety.

Metoda:

- ręczny przegląd kodu i przepływów danych,
- statyczna inwentaryzacja 74 publicznych funkcji Convex,
- `npm audit --omit=dev --json`,
- weryfikacja zainstalowanych wersji pakietów,
- odczyt nagłówków z `https://www.bajkoterapia.org/`,
- testy w prawdziwej przeglądarce z fałszywym capability tokenem,
- bezpieczna walidacja składania URL-i Stripe bez tworzenia płatności.

Nie wykonywano zmian w kodzie aplikacji ani destrukcyjnych testów produkcyjnych.

## Executive summary

Rdzeń autoryzacji jest sensownie zbudowany: 28/28 publicznych funkcji w `convex/admin/` wywołuje `assertAdmin`, zasoby zalogowanych użytkowników sprawdzają właściciela, landing orders wymagają 256-bitowego per-order tokenu, a pełny PDF jest bramkowany płatnością. Podpis Stripe jest weryfikowany przed modyfikacją danych.

Mimo tego przed zwiększeniem ruchu produkcyjnego trzeba zamknąć trzy problemy P0:

1. capability token z maila trafia do Google Analytics przed usunięciem go z URL-a;
2. anonimowy użytkownik może uruchamiać pełny, kosztowny pipeline LLM i obrazów bez limitu widocznego w kodzie aplikacji;
3. produkcja działa na podatnym React Router `7.13.1` w trybie Framework Mode + SSR.

Dodatkowe wysokie ryzyka dotyczą PII dzieci w logach i session replay, integralności płatności Stripe, publicznych relayów bez limitów, rozliczalności zgód RODO i braku automatycznej retencji danych.

## P0 — naprawić natychmiast

### P0.1 — Capability token zamówienia trafia do requestów Google Analytics

**Lokalizacje:**

- `convex/email.ts:62-75,146-158`
- `src/entry.client.tsx:15-17`
- `src/root.tsx:78-96`
- `src/hooks/useLandingOrderToken.ts:60-70`
- `src/lib/gtag.ts:67-70`

Maile dla landing orders zawierają URL `?t=<rawToken>`. Skrypty analityczne startują przed hydratacją aplikacji, natomiast token jest usuwany dopiero podczas renderowania strony zamówienia.

Test przeglądarkowy z fałszywym tokenem potwierdził próbę wysłania pełnego URL-a do `region1.google-analytics.com/g/collect`:

```text
dl=https://www.bajkoterapia.org/landing/book/fake/result?t=AUDIT_CAPABILITY_FAKE_...
```

Request został przechwycony i przerwany przed wysłaniem. Marker pojawił się również jako referrer kolejnego eventu Google Analytics; ten request także został przerwany. Pierwsze requesty zawierały stan consent mode `denied`, więc sama odmowa cookies nie usuwa tokenu z cookieless ping. Osobnego wycieku tokenu do skompresowanych payloadów PostHog nie potwierdzono w tym teście.

Capability token autoryzuje odczyt danych dziecka, postępu, eventów, podglądu, obrazów do głosowania, dedykacji oraz — po płatności — pełnego PDF.

**Skutek:** potwierdzono, że kod umieszcza token w outbound payloadzie GA. To, czy i ile historycznych tokenów faktycznie dotarło do dostawcy, wymaga sprawdzenia danych produkcyjnych; do tego czasu należy traktować je jako potencjalnie ujawnione.

**Naprawa:**

1. sprawdzić GA pod kątem URL-i zawierających `?t=` i usunąć te dane; PostHog sprawdzić osobno pod kątem pełnych URL-i i replay;
2. obrócić istniejące landing tokens;
3. wymieniać token z maila na sesję first-party przed załadowaniem analityki;
4. wyłączyć automatyczne pageview na `/landing/book/*`;
5. usuwać query string z `page_location`, `$current_url` i referrera;
6. nie inicjalizować narzędzi third-party przed oczyszczeniem URL-a.

### P0.2 — Publiczny intake uruchamia kosztowny pipeline bez limitu widocznego w aplikacji

**Lokalizacje:**

- `convex/bookPipeline.ts:782-872`
- `convex/rateLimitMutation.ts:61-88`
- `convex/lib/rateLimiter.ts:30-42`

`startLandingOrder` jest publiczną akcją bez tożsamości Clerk. Kod jawnie ignoruje `args.accessToken`, nie wywołuje istniejącego `checkAndRecordLandingStart`, wykonuje dwa guardy LLM, zapisuje zamówienie i uruchamia pełny pipeline A0-A11 z generacją obrazów — przed płatnością. Audyt nie obejmował zewnętrznych reguł Vercel Firewall ani limitów providerów, więc brak limitu stwierdzono na poziomie aplikacji.

Istniejący globalny limiter jest martwym kodem. Flow zalogowany nalicza jeden wpis limitu na całe zamówienie, mimo że zamówienie generuje wiele rzeczywistych wywołań modeli.

**Skutek:** aplikacja dopuszcza zdalny kosztowy DoS na OpenRouter/Gemini/Convex/storage. Założenie konta nie jest potrzebne; ewentualne kontrole infrastrukturalne poza repo wymagają osobnej weryfikacji.

**Naprawa:**

- Turnstile przed startem pipeline'u;
- atomowy limit per IP/device/account oraz globalny circuit breaker kosztowy;
- limitować faktyczne koszty/pipeline starts, nie tylko jedno wejście nazwane `llm_call`;
- użyć kolejki z ograniczoną współbieżnością;
- najbezpieczniej uruchamiać kosztowną część po płatności albo generować przed płatnością wyłącznie tani preview.

Globalny współdzielony kubełek nie może być jedyną kontrolą, bo jeden atakujący zablokuje wszystkich prawdziwych użytkowników.

### P0.3 — Podatne zależności runtime

`npm audit --omit=dev` zwrócił:

| Poziom   | Liczba |
| -------- | -----: |
| Critical |      1 |
| High     |     14 |
| Moderate |     20 |
| Low      |      6 |
| Razem    |     41 |

Zainstalowane wersje istotne dla produkcji:

- `react-router@7.13.1`
- `@react-router/node@7.13.1`
- `@convex-dev/auth@0.0.91`
- `convex@1.32.0`
- `@clerk/shared@3.47.5`
- `resend@6.12.2`

React Router `7.13.1` jest objęty między innymi:

- unauthenticated RCE przez deserializację turbo-stream w Framework Mode;
- kilkoma unauthenticated DoS;
- XSS w redirectach;
- open redirectami.

RCE wymaga dodatkowego prototype pollution, którego ten audyt nie wykazał. Aplikacja używa jednak trybu Framework Mode i SSR, a ta sama wersja ma również niezależne unauthenticated DoS. P0 oznacza tu obowiązek natychmiastowego patchowania podatnego komponentu, nie potwierdzony exploit RCE. Pierwsza poprawiona wersja RCE to `7.14.2`; aktualny kompatybilny tag v7 to `7.18.2`.

`@convex-dev/auth` nie jest importowany w `src/`, `convex/` ani `cli/`, ale wnosi krytycznie podatny `@auth/core`. Aplikacja używa Clerk, więc advisory Auth.js nie jest aktywną ścieżką logowania; paczkę należy usunąć zamiast utrzymywać zbędną powierzchnię supply-chain.

**Naprawa:**

1. podnieść cały zestaw React Router do `7.18.2` i uruchomić E2E;
2. usunąć nieużywany `@convex-dev/auth`;
3. podnieść Convex do aktualnej linii i usunąć podatne `ws`;
4. zaktualizować Clerk/`@clerk/shared`;
5. ponowić `npm audit --omit=dev` i udokumentować wyłącznie świadomie zaakceptowane wyjątki.

## P1 — wysokie ryzyko

### P1.1 — PII dzieci w logach LLM, Langfuse i session replay

**Lokalizacje:**

- `convex/lib/llmClient.ts:174-245`
- `convex/llmLogs.ts:6-57`
- `convex/schema.ts:19-38`
- `convex/lib/langfuse.ts:34-43`
- `src/lib/posthogConfig.ts:20-36`

Kod zapisuje pełny system prompt, user prompt i odpowiedź modelu. Trafiają one do `llmLogs`, a przy skonfigurowanych credentials również do Langfuse. Prompty zawierają imię dziecka, wiek, wygląd, problem emocjonalny, wolny opis problemu, treść książki i dedykację.

Retencja `llmLogs` jest ilościowa: 50 wpisów per `clerkUserId`, nie czasowa. Rodzic z małą liczbą zamówień może mieć logi bezterminowo.

PostHog ma włączone `autocapture` i session recording. `maskAllInputs` chroni wartości pól formularza, ale `maskTextSelector: '[data-private]'` nie chroni niczego, ponieważ w `src/` nie ma elementów z `data-private`. Na podstawie konfiguracji wyrenderowane imiona, adresy, historie i dane admina mogą wejść do nagrania; zawartości rzeczywistych replayów produkcyjnych nie badano.

Polityka prywatności nazywa analitykę anonimową i nie wymienia wszystkich realnych odbiorców danych dziecka.

**Naprawa:**

- wyłączyć replay na `/book`, `/landing/book` i `/admin`;
- nie przechowywać surowych promptów domyślnie;
- redagować/pseudonimizować PII przed obserwowalnością;
- dodać twardą retencję czasową;
- zaktualizować politykę prywatności i listę podprocesorów;
- zweryfikować DPA i regiony dla OpenRouter/model providers, Langfuse, PostHog, Resend, Vercel, Convex i Cloudflare.

### P1.2 — Webhook Stripe nie weryfikuje pełnej integralności płatności

**Lokalizacje:**

- `convex/stripe.ts:233-313`
- `convex/billing.ts:150-195`

Podpis Stripe jest poprawnie weryfikowany. Po weryfikacji handler ufa jednak `session.metadata.bookOrderId ?? client_reference_id` i nie porównuje:

- `session.id` z zapisanym `order.stripeSessionId`;
- `amount_total` z oczekiwaną ceną;
- `currency` z PLN;
- `livemode` ze środowiskiem;
- opłaconego Price ID/line item z formatem zamówienia.

Kody promocyjne są dozwolone. Jeśli na koncie istnieje kupon 100%, `payment_status === 'paid'` może oznaczać opłatę 0 zł i nadal odblokować książkę. Realność tej gałęzi zależy od konfiguracji Stripe poza repo.

Dodatkowo wszystkie błędy po weryfikacji podpisu są łapane i tylko logowane. Endpoint zwraca `200`, więc chwilowy błąd Convex może bezpowrotnie zgubić poprawną płatność. `markBookOrderPaid` jest idempotentne, więc retry jest bezpieczne.

Obsługiwany jest wyłącznie `checkout.session.completed`; brak obsługi płatności odroczonych, refundów i chargebacków.

**Naprawa:**

- wiązać webhook z zapisanym `stripeSessionId`;
- sprawdzać kwotę, walutę, mode/livemode i line item;
- przechowywać i deduplikować `event.id`;
- zwracać 500 przy błędach przejściowych;
- obsłużyć `checkout.session.async_payment_succeeded`, refundy i chargebacki;
- nie uruchamiać fulfillmentu fizycznego bez potwierdzenia finalnej płatności.

### P1.3 — Klient kontroluje `returnPath` Stripe

**Lokalizacje:** `convex/stripe.ts:53-105,129-216`

Publiczne akcje przyjmują `returnPath` i sklejają go przez `${appUrl}${returnPath}`. Test parsera URL potwierdził, że przy `APP_URL=https://www.bajkoterapia.org` bez końcowego slash wartość `@example.com` tworzy URL z hostem `example.com` i `www.bajkoterapia.org` w polu userinfo.

**Skutek:** jeżeli produkcyjny `APP_URL` ma taki kształt i Stripe zaakceptuje zbudowany URL, Checkout może po płatności przekierować klienta na stronę napastnika razem z `session_id`. Nie wykonywano testu end-to-end na Stripe.

**Naprawa:** usunąć `returnPath` z publicznego kontraktu albo wymagać ścieżki zaczynającej się pojedynczym `/`, budować URL przez `new URL()` i sprawdzać identyczny `origin` oraz allowlistę tras.

### P1.4 — Tracking landing orders łączy surowe IP z order ID

**Lokalizacje:**

- `middleware.ts:1-68`
- `src/root.tsx:142-172`
- `src/routes/api.track.ts:13-67`
- `convex/analyticsHttp.ts:7-55`
- `convex/schema.ts:51-69`

Listy pomijanych tras obejmują `/book`, ale nie `/landing/book`. Serwerowa analityka zapisuje więc ścieżkę zawierającą `bookOrderId` razem z pełnym IP, user-agentem, językiem i referrerem przed zgodą cookies.

`/api/track` jest publicznym, nieuwierzytelnionym relayem: dokłada sekret serwerowy i zapisuje dowolny payload w Convex. Brakuje kontroli Origin, limitu, deduplikacji i platformowego rate limitu.

**Naprawa:** pominąć obie ścieżki książki, usunąć identyfikatory zamówień z analityki, skracać/hashować IP zgodnie z ustaloną podstawą prawną, ograniczyć `/api/track` na firewallu i dodać atomowy limiter.

### P1.5 — Publiczne formularze mają omijalne limity

- `contact` limituje wyłącznie po podanym e-mailu, nie ma globalnego limitu, captchy ani pełnych limitów długości;
- `feedback` limituje po e-mailu, ale każdy sukces wysyła wiadomość Resendem;
- `leads` ma globalny limit i Turnstile, lecz CAPTCHA jest fail-open przy braku env;
- query sprawdzające limit oraz mutation zapisująca formularz są oddzielnymi transakcjami, więc równoległe requesty mogą przejść razem.

**Naprawa:** atomowy rate limiter, per-IP limit, globalny bezpiecznik, Turnstile/honeypot i maksymalne długości wszystkich pól.

### P1.6 — Dowód zgody RODO jest kontrolowany przez klienta

**Lokalizacje:** `convex/lib/consents.ts:18-91`

Klient przesyła `accepted`, `version` i pełny `clauseText`. Serwer sprawdza jedynie format i długość, po czym zapisuje tekst jako dowód tego, co użytkownik zobaczył.

**Naprawa:** klient wysyła tylko zgodę i identyfikator wersji. Serwer pobiera kanoniczny tekst i wersję z własnego, wersjonowanego rejestru.

### P1.7 — Brak automatycznej retencji i ścieżki realizacji praw użytkownika

Kod i polityka są niespójne:

- raw IP w `pageViews` ma wyłącznie ręczny `purgeOld` bez crona;
- pełne prompty i odpowiedzi LLM nie mają retencji czasowej;
- `accessTokenHash` służy do autoryzacji, ale równolegle `accessTokenRaw` jest celowo przechowywany w tym samym rekordzie, aby późniejsze maile mogły odtworzyć capability link;
- nie znaleziono kompletnej ścieżki eksportu/usunięcia `bookOrders`, ilustracji, leadów, kontaktów i feedbacku;
- polityka obiecuje trwałe usuwanie PDF, ale kod nie pokazuje automatycznego usuwania pełnych plików Convex/R2;
- prawo dostępu, kopii, usunięcia i cofnięcia zgody wymaga dziś procesu ręcznego poza aplikacją.

**Naprawa:** macierz retencji per typ danych, automatyczne crony, procedura DSAR, kasowanie artefaktów po relacji `orderId`, ewidencja wykonanych usunięć oraz szyfrowanie lub zastąpienie surowego tokenu rotowalnymi tokenami linków mailowych.

## P2 — hardening

### P2.1 — Brak nagłówków bezpieczeństwa

Produkcja ma HSTS, ale nie zwraca:

- `Content-Security-Policy`;
- `frame-ancestors` / `X-Frame-Options`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- `Permissions-Policy`.

`vercel.json` zawiera tylko rewrites. CSP wymaga wdrożenia najpierw w report-only, ponieważ aplikacja używa inline scripts, Clerk, Convex, Stripe, PostHog, GA i zewnętrznych fontów.

Eksperymentalne prototypy admina są osadzane w same-origin iframe bez `sandbox`; taki iframe nie izoluje skryptów od rodzica.

### P2.2 — Dług bezpieczeństwa w tokenach i tożsamości

- surowy landing token jest przechowywany w bazie oraz długo żyje w `localStorage`;
- XSS na originie oznacza kradzież wszystkich capability tokens zapisanych w przeglądarce;
- `assertOrderOwner` używa `identity.subject`, podczas gdy Convex rekomenduje `tokenIdentifier` jako klucz globalnie stabilny;
- przy jednym issuerze Clerk nie jest to obecnie IDOR, ale komplikuje zmianę providera lub środowiska.

### P2.3 — Niepełny audit trail operacji administracyjnych

Nie wszystkie działania zostawiają wpis możliwy do odtworzenia. Dotyczy to między innymi wysyłki maili, pobierania PDF klienta, anulowania/retry i generacji print-ready. Sam `adminAuditLog` nie ma kompletnego panelu odczytu ani retencji.

Logować należy metadane operacji, nie pełne PII lub treści maili.

### P2.4 — Drobne problemy walidacji

- `config.get` jest publiczny; dziś zwraca tylko `DEBUG_DB_LOGGING`, lecz przyszły klucz może nieświadomie zostać ujawniony;
- trzy funkcje w `convex/config.ts` nie mają validatorów `returns`;
- e-mail i część pól zamówienia nie mają spójnej normalizacji i limitów po stronie serwera;
- prompt-injection sanitizer wykrywa głównie angielskie frazy, mimo że produkt jest polskojęzyczny;
- ogólny `JsonLd` nie ucieka znaku `<`; obecne wywołania używają danych statycznych, więc nie znaleziono aktywnego XSS.

## Kontrole zweryfikowane jako poprawne

- 28/28 publicznych funkcji w `convex/admin/` wywołuje `assertAdmin`.
- Zalogowane zamówienia sprawdzają właściciela po stronie serwera.
- Landing token ma 256 bitów; autoryzacja porównuje hash SHA-256 stałoczasowo. Osobna surowa kopia jest przechowywana dla linków mailowych i została opisana wyżej jako osłabienie modelu.
- Brak hasha lub tokenu zamyka dostęp.
- Pełny PDF wymaga `paymentStatus === 'completed'` i właściciela/capability tokenu.
- Stripe webhook potwierdza autentyczność eventu podpisem przed zmianą stanu; nie oznacza to jeszcze pełnego związania eventu z ceną, sesją i zamówieniem.
- `/track` i print callback fail-closed przy braku sekretu.
- Klucze R2 nie są samodzielnym publicznym capability; pobrania dostają krótkotrwałe presigned URL-e.
- Dane użytkownika w mailach formularzy są escapowane przed wstawieniem do HTML.
- Nie znaleziono twardo wpisanych sekretów w kodzie.
- `.env`, `.env.local`, `.env.test` i `.env.staging` są ignorowane przez Git.
- Nie znaleziono aktywnego aplikacyjnego XSS przez `dangerouslySetInnerHTML`; obecne dane są statyczne/build-time.
- Testy legacy `/pl/*` z kodowanym `//` i backslashem wracały do strony głównej; nie potwierdzono exploita tej konkretnej trasy.

## Kolejność napraw

1. zatrzymać wyciek `?t=` i przeprowadzić rotację/incydent review;
2. zamknąć nieograniczone generowanie AI;
3. podnieść React Router i Convex, usunąć `@convex-dev/auth`, zaktualizować Clerk;
4. ograniczyć PII w GA/PostHog/Langfuse/`llmLogs`;
5. uszczelnić integralność Stripe oraz retry webhooków;
6. usunąć klientowski `returnPath`;
7. wdrożyć atomowe limity formularzy i `/api/track`;
8. przenieść treść zgód na serwer;
9. wdrożyć retencję, DSAR i zgodną politykę prywatności;
10. dodać CSP i pozostałe nagłówki.

## Kryteria zamknięcia P0

- URL z `?t=FAKE_MARKER` nie pojawia się w żadnym requestcie ani referrerze GA; osobny test potwierdza to samo dla PostHog i session replay;
- anonimowe wywołania `startLandingOrder` mają atomowy per-caller limit i globalny budget cap;
- pełny pipeline nie startuje przed przejściem ustalonej bramki kosztowej;
- React Router jest poza podatnymi zakresami i E2E przechodzi;
- `npm audit --omit=dev` nie zawiera critical/high bez jawnego, uzasadnionego wyjątku.

## Ograniczenia audytu

Z repozytorium nie da się potwierdzić:

- faktycznych env i firewall rules na produkcji;
- konfiguracji JWT template i metadata w Clerk;
- aktywnych kuponów, Payment Links i metod odroczonych w Stripe;
- retencji oraz regionu projektu Langfuse/PostHog;
- lifecycle pełnych i preview plików w Cloudflare R2;
- treści umów powierzenia danych z podprocesorami.

Nie odczytywano wartości lokalnych sekretów. Test analityki użył wyłącznie fałszywego markera, a requesty do narzędzi analitycznych zostały przerwane przez przeglądarkę testową.

## Źródła

- Convex — auth w funkcjach: https://docs.convex.dev/auth/functions-auth
- Convex — produkcja: https://docs.convex.dev/production
- React Router RCE: https://github.com/advisories/GHSA-49rj-9fvp-4h2h
- Auth.js email normalization: https://github.com/advisories/GHSA-7rqj-j65f-68wh
- AI SDK resource consumption: https://github.com/advisories/GHSA-866g-f22w-33x8
- `ws` memory exhaustion: https://github.com/advisories/GHSA-96hv-2xvq-fx4p
