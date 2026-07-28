# Security Audit — 2026-07-28

Branch: `feat/lp-v4-rollout` (audyt obejmuje cały codebase, nie tylko zmiany LP).
Zakres: publiczne funkcje Convex, endpointy HTTP i edge, Stripe, PII/RODO, powierzchnia
admina, limity nadużyć, zależności produkcyjne, nagłówki bezpieczeństwa.
Tryb: **audyt bez zmian w kodzie** — nic nie zostało naprawione w tym przebiegu.

Poprzednie: `docs/security-audit-2026-03-01.md`, `docs/security-audit-2026-05-12.md`.
Ten dokument raportuje **stan na dziś**, w tym regresje i nową powierzchnię, która
powstała po 12.05 (analytics z surowym IP, wysyłka maili, print-ready HTTP, consents).

## Executive summary

Rdzeń autoryzacji trzyma. Per-order tokeny landingowe (C2), paywall na pełny PDF (C1),
weryfikacja podpisu webhooka i bramkowanie admina (24/24 funkcje z `assertAdmin`) są
zrobione dobrze i zweryfikowane niezależnie przez dwa przebiegi. Nie ma backdoora
w `cli.ts` (wszystkie eksporty `internal*`), nie ma impersonacji sentineli, nie ma
publicznej ścieżki do promptów pipeline'u.

Ryzyko przesunęło się z „ktoś ukradnie dane zamówienia" na trzy inne osie:

1. **Koszt.** Publiczny intake nie ma ani gate'u, ani rate-limitu — jedna pętla
   generuje nieograniczoną liczbę płatnych generacji (świadoma decyzja z 12.05,
   ale `checkAndRecordLandingStart` jest dziś martwym kodem).
2. **Płatność.** Webhook nie wiąże sesji Stripe z zamówieniem i nie sprawdza kwoty,
   a Checkout ma włączone kody promocyjne — kupon 100% daje pełną książkę za 0 zł.
3. **Prywatność i zgodność.** Polityka prywatności nie wymienia realnych odbiorców
   danych dziecka, obiecuje kasowanie PDF-ów, których nikt nie kasuje, i nie ma
   żadnej ścieżki realizacji praw z art. 15/17. Do tego surowe IP rodzica ląduje
   w bazie razem z `bookOrderId` jego dziecka, bezterminowo i przed zgodą.

Metodyka: pięć niezależnych przebiegów (authz / HTTP / płatności / PII / admin+limity),
a następnie weryfikacja każdego cięższego zarzutu przez czytanie kodu. Ustalenia
oznaczone **[zweryfikowane]** czytałem osobiście; **[raport]** pochodzą z przebiegu
i mają podany `file:line`, ale nie były przeze mnie odtworzone linia po linii.

## Ustalenia

### Krytyczne

**K1 — Publiczny intake bez gate'u i bez rate-limitu** [zweryfikowane]
`convex/bookPipeline.ts:786-798` (`startLandingOrder`). `args.accessToken` jest
przyjmowany i jawnie porzucany (`void args.accessToken`), rate-limit nie jest wołany
w ogóle. Każde wywołanie pali 2 płatne calle LLM (`runIntakeGuards`) jeszcze przed
insertem, a potem cały łańcuch A0–A11 z generacją obrazów. Anonimowa pętla = nieograniczony
rachunek u Google. Flow autoryzowany ma limit 30/5 min per user (`:165`), landing nie ma
nic. `checkAndRecordLandingStart` (`convex/rateLimitMutation.ts:61`) i konfiguracja
`landing_start` (`convex/lib/rateLimiter.ts:35`) nie mają żadnego wywołania — martwy kod.
_Status:_ świadoma decyzja z 12.05 (revert C3: gate blokował legit ruch, limit 10/h dławił
realny). Otwarte w `TODO.md` #1. Uwaga: planowany powrót na globalnym kluczu
`__landing_global__` jest lekarstwem gorszym od choroby — jeden atakujący zdusiłby ruch
całego serwisu. Per-IP jest osiągalne: IP jest już przekazywane do `/track`.

**K2 — PII dzieci w `llmLogs` bez retencji czasowej, plus egress do Langfuse** [zweryfikowane]
`convex/llmLogs.ts:24-38`. Retencja jest **ilościowa, nie czasowa**: 50 ostatnich wpisów
per `clerkUserId`. Niuans, który zmienia obraz: wszystkie zamówienia landingowe dzielą
jeden `clerkUserId` = `'landing-user'`, więc ich logi rotują szybko; natomiast **rodzic
zalogowany z jednym zamówieniem nigdy nie przekroczy progu — jego prompty leżą bezterminowo**.
W promptach: imię dziecka, `problemDetail` (500 znaków wolnego tekstu o problemie
emocjonalnym — art. 9 RODO), wiek, płeć, wygląd, dalej pełna treść bajki i dedykacja.
Te same dane wychodzą do Langfuse (`convex/lib/llmClient.ts:190,213-218`). Domyślny
base URL to `https://cloud.langfuse.com` (region EU) — teza z `TODO.md` #2 o „prawdopodobnie
poza EU" jest niepotwierdzona; do sprawdzenia w env produkcji.
_Status:_ `TODO.md` #2, otwarte od dawna.

**K3 — Webhook nie wiąże sesji z zamówieniem i nie sprawdza kwoty** [zweryfikowane]
`convex/stripe.ts:247-257` → `convex/billing.ts:87-106`. Handler bierze
`session.metadata.bookOrderId ?? session.client_reference_id` i woła `markBookOrderPaid`
**bez** porównania z zapisanym `order.stripeSessionId` i **bez** sprawdzenia `amount_total`,
`currency`, `line_items`, `livemode`. Do tego `allow_promotion_codes: true` na obu flow
(`stripe.ts:86,170`), a jedyny warunek odblokowania to `payment_status === 'paid'`
(`:240`) — kupon 100% daje sesję opłaconą na 0 zł i pełną książkę za darmo. Druga
gałąź: `client_reference_id` jest ustawialny w URL-u dowolnego Payment Linka, więc
opłacenie innego (tańszego) linka z doklejonym `?client_reference_id=<orderId>`
odblokowuje zamówienie za cudzą cenę.
_Do rozstrzygnięcia poza repo:_ czy na koncie Stripe istnieją Payment Linki i czy
istnieje jakikolwiek kupon 100% — to przesądza, czy to dziura teoretyczna czy dzisiejsza.

### Wysokie

**W1 — Token landingowy wycieka do Google Analytics** [zweryfikowane]
Linki w mailach niosą surowy token jako `?t=` (`src/hooks/useLandingOrderToken.ts:64`).
Inline `gtag('config', …)` siedzi w `<head>` (`src/root.tsx:93`) i wysyła automatyczny
`page_view` z `document.location.href` **zanim** komponentowy efekt zdejmie parametr
z URL-a; `trackGaPageview` dodatkowo wysyła `page_location: window.location.href`
(`src/lib/gtag.ts:69`). Ten token jest jedyną autoryzacją do danych zamówienia
(`convex/lib/roles.ts:130-143`), więc trafia do raportów GA4 i logów Google.
To samo dotyczy starszego `?token=` (`src/hooks/useAccessToken.ts`).

**W2 — `/api/track` to otwarty relay do bazy** [zweryfikowane]
`src/routes/api.track.ts:13-67`. Publiczny, nieuwierzytelniony POST, do którego serwer
dokłada `ANALYTICS_SECRET` — czyli obchodzi cały shared-secret na Convex `/track`.
Bez auth, bez sprawdzenia Origin, bez rate-limitu i bez dedup. Atakujący kontroluje
`path`, `userAgent`, `referer`; kliencka lista pomijanych ścieżek jest wyłącznie
doradcza, więc da się wstrzykiwać fałszywe `/admin` i `/book`. Jeden request = jeden
wiersz w tabeli z czterema indeksami, a `purgeOld` jest ręczne.

**W3 — Landing book flow jest trackowany razem z ID zamówienia i surowym IP** [zweryfikowane]
`middleware.ts:4`. `SKIP_PREFIXES` zawiera `/book`, ale ścieżki landingowe to
`/landing/book/<orderId>/…` — prefiks nie matchuje, więc **nie są pomijane**. Ten sam
błąd po stronie beacona (`src/root.tsx`). Efekt: wiersz łączący surowy adres IP rodzica
z konkretnym `bookOrderId` konkretnego dziecka, zapisywany server-side, przed bannerem
cookies i bez jakiejkolwiek zgody.

**W4 — `pageViews`: surowe IP bez automatycznej retencji** [zweryfikowane]
`convex/schema.ts:54-69`, `convex/crons.ts`. Pełny, nieskrócony adres IP + `userAgent`

- `acceptLanguage` + `referer`. `analytics.purgeOld` istnieje, ale **nie ma go w cronie** —
  jedyny job to auto-resolve style votes. Polityka retencji jest w komentarzu, nie w kodzie.

**W5 — Polityka prywatności nie wymienia realnych odbiorców danych** [zweryfikowane]
`src/data/legalDocs.ts:120-127`. §4 listuje Stripe, kurierów, biuro rachunkowe
i „dostawców usług hostingowych". Faktycznie dane dziecka wychodzą do: **Google (Gemini)**
— imię i opis problemu w każdym prompcie, **Langfuse**, **Resend** (imię, temat bajki,
adres), **PostHog** i **Google Analytics/Ads**, oraz na **własny VPS typst-render + R2**
(pełny tekst bajki i dedykacja). Do tego §3 opisuje dane szczególne jako „wybór problemu
z listy", całkowicie pomijając wolne pole `problemDetail`. To wada samej zgody z art. 9
ust. 2 lit. a — została odebrana na węższy zakres niż faktyczny.

**W6 — Polityka i mail transakcyjny mówią klientowi sprzeczne rzeczy o retencji PDF** [zweryfikowane]
`src/data/legalDocs.ts:135` (§5: pliki PDF „po czym są trwale usuwane") kontra
`convex/lib/email.ts:376` („plik jest u nas zarchiwizowany na zawsze"). Kod potwierdza
wersję z maila: nic nie kasuje `pdfStorageId`, `previewPdfStorageId`, `r2FullKey`,
`r2PreviewKey`; 30-dniowy lifecycle ma wyłącznie prefiks `print/`.

**W7 — Brak jakiejkolwiek ścieżki realizacji praw podmiotu danych** [raport]
Zero funkcji kasujących `bookOrders`, `leads`, `contactSubmissions`, `feedbackSubmissions`,
`bookIllustrations` i zero eksportu danych. Polityka §6 obiecuje dostęp, kopię, usunięcie,
przenoszenie i cofnięcie zgody — żadne z tego nie ma odpowiednika w kodzie. Żądanie
z art. 17 wymaga dziś ręcznego grzebania w dashboardzie Convex.

**W8 — `submitFeedback`: nieograniczony flood maili** [raport]
`convex/feedback.ts:99` (wysyłka `:135`). Jedyny limit to 2/h kluczowane po **polu
`email` podanym przez klienta** — iteracja `a1@x.pl`, `a2@x.pl`… daje nieograniczoną
liczbę maili przez Resend na skrzynkę operacyjną i nieograniczony wzrost tabeli. Brak
captchy, honeypota i globalnego capa, mimo że `leads.ts` ma wszystkie trzy.

**W9 — Zależności produkcyjne: 43 podatności, 1 krytyczna** [zweryfikowane]
`npm audit --omit=dev`: 1 critical, 14 high, 22 moderate, 6 low. Regresja wobec 12.05,
gdzie H1 zamknięto. Dwa konkrety:

- **Krytyczna pochodzi z nieużywanej paczki.** `@auth/core` wchodzi przez
  `@convex-dev/auth`, które jest w `dependencies`, ale **nie jest importowane nigdzie**
  w `src/`, `convex/`, `cli/` — projekt używa Clerka (`convex/auth.config.ts`).
  Usunięcie zależności likwiduje jedyną krytyczną.
- **`react-router` 7.13.1 mieści się w zakresie podatnym** (6.0.0–8.2.0): m.in.
  nieuwierzytelnione RCE przez deserializację turbo-stream, XSS w prerenderowanych
  redirectach, open redirect na `//`. Aplikacja ma `ssr: true`, więc serwer RR jest
  realnie wystawiony. Fix jest w linii 8.x — to migracja majorowa, nie `npm audit fix`.

### Średnie

- **S1 — Brak nagłówków bezpieczeństwa** [zweryfikowane]. `vercel.json` zawiera wyłącznie
  `{"framework":"react-router"}`, middleware nie dotyka odpowiedzi, brak `public/_headers`.
  Brakuje CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy. M3 z 12.05 nadal otwarte. Clickjacking na flow
  zamówienia i nieograniczona eksfiltracja przy jakimkolwiek XSS.
- **S2 — `returnPath` kontrolowany przez klienta → open redirect** [raport].
  `convex/stripe.ts:83,103-104,167,187-188`. Sklejane bez walidacji w `success_url`
  i `cancel_url`; `returnPath: "@evil.com/x"` daje host `evil.com` z `bajkoterapia.org`
  w userinfo — autentyczny link `checkout.stripe.com` z naszym brandingiem, który
  przerzuca płacącego na cudzą stronę razem z `session_id`.
- **S3 — Brak obsługi refundów, chargebacków i płatności odroczonych** [raport].
  Obsługiwany jest wyłącznie `checkout.session.completed`. Po refundzie `paymentStatus`
  zostaje `completed` na zawsze — PDF dalej się pobiera, a przy `pdf_print` alert do
  fulfillmentu poszedł od razu. Odwrotnie: dla P24/BLIK (w PL standard) sesja przychodzi
  z `payment_status: 'unpaid'`, a `checkout.session.async_payment_succeeded` nie jest
  obsługiwany — klient płaci i nigdy nie dostaje książki.
- **S4 — Session replay nagrywa wyświetlane imię dziecka** [raport].
  `src/lib/posthogConfig.ts:23-26`: `maskAllInputs` chroni pola formularza, ale
  `maskTextSelector: '[data-private]'` nie maskuje niczego, bo atrybut nie jest nigdzie
  użyty. Wszystko, co strona **wyświetla** (imię na progress/result, tytuł bajki,
  dedykacja), trafia do nagrania. Zgoda działa, ale dotyczy „anonimowej analizy ruchu".
- **S5 — Treść zgody przyjmowana od klienta** [raport]. `convex/lib/consents.ts:84-92`:
  `clauseText` i `version` idą z frontendu, serwer sprawdza tylko regex i długość.
  Do rozliczalności z art. 7 ust. 1 potrzeba porównania z serwerowym rejestrem wersji.
  Osobno: `leads`, `contactSubmissions`, `feedbackSubmissions` nie mają w ogóle pola zgody.
- **S6 — Turnstile fail-open w bramce, a front captchy nie renderuje** [raport].
  `convex/leads.ts:36-37`: gdy `TURNSTILE_SECRET_KEY` i `LEADS_CAPTCHA_REQUIRED` są
  nieustawione, cały blok weryfikacji jest pomijany (sam weryfikator jest fail-closed).
  Grep po `src/` daje zero wystąpień Turnstile i zero wywołań `submitLead` — czyli albo
  captcha nie działa, albo ustawienie sekretu wywali formularz. M2 z 12.05 nadal otwarte.
- **S7 — Globalne kubełki rate-limitu jako self-DoS** [raport]. `__landing_global__`
  i `leads` 30/10 min są wspólne dla wszystkich — jeden atakujący blokuje prawdziwe
  zgłoszenia. Granularność powinna być per-IP.
- **S8 — Sanityzacja prompt-injection tylko po angielsku** [zweryfikowane, znalezione poza zleceniami].
  `convex/lib/security.ts`: wszystkie wzorce `INSTRUCTION_OVERRIDE` są angielskie
  („ignore previous instructions"), a produkt jest PL-only — „zignoruj poprzednie
  instrukcje" przechodzi nietknięte. Mitygacja: recenzent A3/A7 i podgląd rodzica
  przed dzieckiem, ale recenzent też jest LLM-em.
- **S9 — `submitContactForm` bez globalnego capa i captchy** [raport]. `convex/contact.ts:109`,
  ten sam wzorzec co feedback, ale bez wysyłki maila — koszt to zapychanie tabeli i
  składowanie cudzego PII. M1 z 12.05 nadal otwarte.
- **S10 — Email zamówienia niewalidowany i nienormalizowany** [raport].
  `convex/bookPipeline.ts:145,237,780`: `v.optional(v.string())` bez sprawdzenia formatu
  i bez `toLowerCase().trim()`, podczas gdy formularze robią to poprawnie. Skutki:
  gubione maile transakcyjne i brak deduplikacji przy obsłudze żądań RODO.

### Niskie

- **N1** `convex/billing.ts:71-85` — `attachStripeSessionId` bezwarunkowo ustawia
  `paymentStatus: 'pending'`; przy dwóch równoległych sesjach opłacone zamówienie może
  wrócić do `pending` (szkoda własna klienta, nie bypass).
- **N2** `convex/admin/bookBatch.ts:475,499`, `convex/admin/printPdf.ts:44,210` — niepełny
  audit trail. Najgorszy przypadek: `resolveDownloadUrl` (admin pobiera PDF dowolnego
  klienta) nie zostawia śladu. Do tego `adminAuditLog` nie ma **żadnego** query — tabela
  jest w praktyce write-only i nikt jej nigdy nie czyta.
- **N3** `convex/config.ts:33` — `config.get` bez auth, podczas gdy `list`/`set` mają
  `assertAdmin`. Dziś jedyny klucz to `DEBUG_DB_LOGGING`, więc problem jest strukturalny:
  bramka wypuści cokolwiek, co następne trafi do enuma.
- **N4** `convex/bookPipeline.ts:403-409` — `assertDedicationWindow` zamyka okno po
  `pdfStorageId`, którego ścieżka typst nigdy nie ustawia (zapisuje `r2FullKey`);
  dedykację da się podmienić po złożeniu i opłaceniu, a print-ready z admina ją wydrukuje.
- **N5** `convex/schema.ts:361` — `accessTokenRaw` (surowy token) leży w bazie obok danych,
  których strzeże; świadomy trade-off pod link `?t=` w mailu, ale osłabia model.
- **N6** `convex/bookComposer.ts:236-239` — preview degraduje się do pełnej książki przy
  sekwencji krótszej niż 7 stron; przy 16-stronicowym kanonie ścieżka praktycznie martwa.
- **N7** `convex/analyticsHttp.ts:15`, `convex/printPdfHttp.ts:16` — porównanie sekretów
  zwykłym `!==` zamiast `timingSafeEqual`, który repo ma i stosuje przy tokenach landingowych.
  Oba endpointy **fail-closed** przy braku env (503) — wzorca fail-open nie ma nigdzie.
- **N8** `convex/admin/email.ts:82-88`, `convex/admin/bookBatch.ts:106-109` — `adminAuditLog`
  jako drugie, dłużej żyjące miejsce z PII (adresy odbiorców, `childName`), bez retencji.
- **N9** `convex/bookIntakeGuard.ts:104-118` — moderacja intake fail-open przy awarii LLM
  (świadome, udokumentowane w komentarzu).
- **N10** Dryf dokumentacji: `CLAUDE.md` opisuje `ALLOWED_ORIGIN` jako „CORS origin
  (required in production)", a grep po repo daje zero wystąpień — kontrola nie istnieje.
- **N11** `crypto` w `dependencies` — zdeprecjonowany shim npm na moduł wbudowany Node,
  nieimportowany nigdzie. Zbędna powierzchnia supply-chain.

## Zweryfikowane jako poprawne

- **Per-order tokeny landingowe (C2 trzyma).** `convex/lib/roles.ts:130-143`: sha256,
  `timingSafeEqual`, fail-closed przy braku hasha, wymuszany na wszystkich 9 publicznych
  funkcjach landingowych (`accessToken` zawsze wymagany, nigdy optional) oraz na
  checkoutcie i presignie R2.
- **Paywall (C1 trzyma).** `paymentStatus === 'completed'` to jedyny unlock; `skipStripe`
  nie jest czytane nigdzie; wszystkie trzy ścieżki do pełnego PDF sprawdzają płatność
  serwerowo, a mail dostawczy ma własny re-check. Preview to osobny artefakt pod własnym
  kluczem R2, nie okrojona klientem pełna wersja.
- **Ownership flow autoryzowanego.** Wszystkie publiczne funkcje porównują z
  `identity.subject` przez `assertOrderOwner`; żadna nie przyjmuje `clerkUserId`/`email`
  jako argumentu ownership. Impersonacja sentineli `landing-user`/`cli-user` niemożliwa.
- **`convex/cli.ts` — zero funkcji publicznych.** Wszystkie 17 eksportów to `internal*`.
- **Powierzchnia admina.** 24/24 publiczne funkcje w `convex/admin/*` wołają `assertAdmin`
  jako pierwszą instrukcję. Mutacja promptów pipeline'u (wektor sterowania treścią książek
  dla dzieci) nie ma ścieżki publicznej. Front admina chowa trasę, ale każda funkcja pod
  spodem ma sprawdzenie serwerowe.
- **Webhook Stripe.** Podpis weryfikowany przed jakąkolwiek zmianą stanu; brak sekretu →
  rzuca; replay idempotentny (`markBookOrderPaid` wychodzi na `completed`).
- **Cena wyłącznie serwerowa.** `resolvePriceId(order.format)` z env, `quantity: 1` na
  sztywno; `format` niezmienny po utworzeniu — nie ma `db.patch` na to pole.
- **Ścieżka print.** Brak SSRF (`RENDER_SERVICE_URL` z env, źródło presignowane z
  `r2FullKey`, całość za `assertAdmin`); callback nie przekieruje `printR2Key` na cudzy
  plik, bo klucz jest przeliczany i porównywany.
- **Endpointy HTTP fail-closed.** `/track`, `/print-ready/callback`, `/stripe/webhook` —
  brak sekretu = 503/500, nie przepuszczenie. Żaden httpAction nie ustawia CORS,
  nie ma wildcardu ani odbicia Origin.
- **Bramka zgody na telemetrię.** PostHog startuje z `opt_out_capturing_by_default`,
  GA ma `consent default = denied` w SSR-owym HTML i `anonymize_ip`.
- **Payloady eventów PostHog nie niosą PII.** Przejrzane 40+ call-site'ów `trackEvent`;
  wyłącznie `flow`, `bookOrderId`, `format`, `topicSlug`, `location`, `step`, `durationMs`.
  Zastrzeżenie: `bookOrderId` jako super property pozwala powiązać sesję z zamówieniem.
- **Do Stripe nie wychodzą dane dziecka** — metadata to `bookOrderId`, `clerkUserId`,
  `format`, `landing`; jedyne PII to `customer_email`.
- **Maile escape'ują HTML**, adresaci są stali albo z bazy, brak wstrzyknięcia nagłówków.
- **Brak sekretów w repo** — tylko placeholdery w dokumentacji, pliki `.env*` zignorowane.
- **Brak XSS w `dangerouslySetInnerHTML`** — trzy wystąpienia, wszystkie na treści
  statycznej (JSON-LD ze stałych obiektów, snippet GA z build-time ID). `JsonLd` używany
  wyłącznie na stronach marketingowych, bez danych użytkownika.

## Czego nie da się rozstrzygnąć z repozytorium

1. **Stripe:** czy na koncie istnieją Payment Linki i czy istnieje kupon 100% —
   przesądza realność K3. Także: które metody płatności są włączone (P24/BLIK → S3 jest
   dzisiejsze, nie teoretyczne).
2. **Langfuse:** faktyczny `LANGFUSE_BASE_URL` na produkcji i retencja projektu.
3. **Cloudflare R2:** lifecycle bucketu dla kluczy pełnej książki i preview (w kodzie
   widać tylko 30 dni dla `print/`).
4. **Convex env:** czy `TURNSTILE_SECRET_KEY` / `LEADS_CAPTCHA_REQUIRED` są ustawione.
5. **Umowy powierzenia (DPA)** z Google, Langfuse, Resend, PostHog, Vercel, Cloudflare —
   to dokumenty, nie kod.

## Komendy weryfikacyjne

```bash
npm audit --omit=dev --json
grep -rn "@convex-dev/auth" --include="*.ts" --include="*.tsx" src/ convex/ cli/
grep -rn "export const .* = \(query\|mutation\|action\)(" convex/
grep -rn "assertAdmin\|assertOrderOwner\|assertLandingOrder" convex/
```
