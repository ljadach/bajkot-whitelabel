# Audyt niezawodności i promptów — 2026-08-10

**Źródła:** dwa niezależne przeglądy Codex (GPT-5.x, read-only, effort=high) z 10.08.2026 —
(1) logowanie błędów + architektura error handlingu/retries w całym `convex/`,
(2) 13 produkcyjnych promptów z DB + spójność kontraktów między stage'ami + dobór modeli —
oraz ręczna weryfikacja najcięższych twierdzeń w kodzie (Atropa). Surowe raporty:
scratchpad sesji (`codex-error-review-output.txt`, `codex-review-output.log`).

**Bezpośredni kontekst:** incydent z 10.08 — dwa zamówienia (w tym klientka z 00:03)
zawieszone na A5, bo sonnet-4.6 z włączonym thinkingiem rozciągnął generację do ~7 min
i limit akcji Convex (10 min) zabił proces bez śladu. Naprawione (commity `13467bb`,
`d324d5d`): timeout per attempt, deadline 8,5 min, `reasoning: false` dla A5,
`cli retry --force`. Ten audyt to systematyczne wyłapanie **reszty tej samej klasy
problemów** zanim wybuchną.

**Jak czytać:**

- Kolejność implementacji: CRITICAL → HIGH → wybrane MEDIUM. W ramach sekcji punkty
  są posortowane wg dźwigni (impact/koszt).
- Statusy weryfikacji: ✅ = potwierdzone ręcznie w kodzie przed wpisaniem tutaj;
  ⚠️ = za raportem Codexa, wyrywkowo wiarygodne, ale sprawdź `Gdzie:` przed implementacją.
- Checkbox `- [ ]` przy tytule = do odhaczania w trakcie wdrażania. Numery (C1, H3...)
  są stabilne — używaj ich w commitach i devlogu.
- Nakłada się częściowo z `docs/security-audit-2026-07-28.md` (płatności, PII) —
  tam, gdzie się stykają, jest odsyłacz zamiast duplikatu.

**Wspólna diagnoza obu raportów:** pipeline obiecuje więcej, niż egzekwuje.
Prompty deklarują gwarancje (recenzja psychologiczna, wizualne QA, spójność postaci),
których runtime nie wymusza; błędy IO znikają w konsoli; gate'y bezpieczeństwa failują
open. Kierunek naprawy: **durable state + walidacja kontraktów + fail-closed na
ścieżkach bezpieczeństwa**.

---

## CRITICAL

### C1. Recenzja psychologiczna (A4) failuje open — gate bezpieczeństwa jest teatrem

- [ ]

**Weryfikacja:** ✅ (obie części potwierdzone w kodzie)
**Gdzie:** `convex/bookAgents.ts:616` (proceed-anyway), `convex/lib/bookAgentUtils.ts:25`
(applyCorrections), prompt `bookPsychReviewer` w DB.

**Problem — dwie niezależne awarie tego samego gate'u:**

1. Po 3 nieudanych recenzjach kod robi dosłownie
   `// Max retries — proceed anyway (demo behavior)` i puszcza odrzuconą bajkę do A5.
   Prompt A4 deklaruje „Story MUST NOT be delivered" i „escalation to human review" —
   runtime robi coś przeciwnego.
2. `PASS_WITH_CORRECTIONS` nie nakłada żadnych poprawek: prompt każe modelowi zwracać
   `beat` / `original_pl` / `corrected_pl`, a `applyCorrections` czyta
   `page` / `originalPl` / `correctedPl`. Żadnego normalizera nie ma (jedyne wystąpienie
   `original_pl` w kodzie to tekst samego promptu). Wszystkie korekty lecą w próżnię,
   `continue` po cichu.

**Scenariusz:** A4 wykrywa zawstydzającą scenę w bajce o moczeniu nocnym, zwraca FAIL
trzy razy → bajka idzie do ilustracji i klienta bez żadnej poprawki i bez śladu dla
operatora (tylko console.warn).

**Fix:**

- Po wyczerpaniu prób: status `paused` (istnieje w maszynie stanów) + event
  `A4 escalation` + powiadomienie admina (mail przez istniejący `sendAdminPrintAlert`
  pattern albo nowy alert). NIE `failed` — bajka może być do uratowania ręcznie.
- Jeden kanoniczny schemat korekt (decyzja: camelCase, bo taki jest kod) + poprawka
  promptu w DB **i** fallbacku równocześnie. Normalizer przyjmujący oba warianty na
  okres przejściowy.
- Walidacja: `original_pl` musi być exact substring wskazanego beatu — inaczej FAIL
  zamiast PASS_WITH_CORRECTIONS (model nie może „poprawiać" tekstu, którego nie ma).
- Dodatkowe reguły z raportu do promptu A4 (przy okazji edycji): struktura beatów
  zależna od wieku (4a tylko 6–8, 4b tylko 9+ — dziś prompt wymusza strukturę 3–5 na
  wszystkich), sprawdzanie disclosure przemocy/samookaleczeń/porad medycznych,
  zasada niepewności (wątpliwość → blokada, nie zgadywanie poprawki).

**Done gdy:** test na dev: (1) wymuszony 3×FAIL parkuje zamówienie w `paused`
z eventem i alertem; (2) korekta z A4 realnie zmienia tekst draftu (assert na treści);
(3) korekta z nieistniejącym `original_pl` daje FAIL.

---

### C2. Stripe webhook potrafi bezpowrotnie zgubić opłacone zamówienie

- [ ]

**Weryfikacja:** ✅
**Gdzie:** `convex/stripe.ts:252-309` (catch → console → return null),
`convex/stripeHttp.ts:12-17` (ack 200), `convex/billing.ts:150-164`
(markBookOrderPaid zwraca sukces przy braku zamówienia).

**Problem:** po weryfikacji podpisu cała logika biznesowa siedzi w catchu, który
loguje wyłącznie do konsoli i zwraca normalnie → HTTP 200 → Stripe przestaje
retry'ować. Komentarz w kodzie zakłada, że błędy po weryfikacji są „permanentne" —
ale transient failure mutacji (deployment skew, chwilowy błąd infrastruktury Convex,
walidacja) też tam wpada. Nie ma żadnego trwałego zapisu surowego eventu.

**Scenariusz:** klient płaci 49 zł, `markBookOrderPaid` rzuca raz (np. deploy w toku),
zwracamy 200, Stripe uznaje za dostarczone. Zamówienie na zawsze `pending`, klient
bez PDF-a i bez maila, operator bez jakiegokolwiek rekordu do odtworzenia.

**Fix (wzorzec webhook inbox):**

- Nowa tabela `stripeWebhookEvents`: `eventId` (unique, indeks), `type`, `payload`
  (string), `status: received|processed|failed`, `attempts`, `lastError`, `receivedAt`.
- Handler po weryfikacji podpisu robi TYLKO insert (mutation, atomowy) i zwraca 200.
  Duplikat `eventId` → no-op (idempotencja na retry Stripe'a).
- Przetwarzanie w scheduled akcji: czyta `received`, wykonuje obecną logikę,
  `processed`/`failed` + błąd. Cron wznawia `failed` z licznikiem prób.
- Admin: widok/query nieprzetworzonych eventów starszych niż 1h.

**Done gdy:** test na dev ze Stripe CLI: (1) webhook z wymuszonym błędem mutacji
ląduje w tabeli jako `failed` i zostaje przetworzony przy retry; (2) duplikat eventu
nie podwaja skutków; (3) happy path bez regresji (AdminStripe sandbox).

**Odsyłacz:** integralność płatności flagowana już w `security-audit-2026-07-28.md` —
ten fix zamyka także tamten wątek utrwalania eventów.

---

### C3. A7 (generacja ilustracji) — następna cicha śmierć w kolejce

- [ ]

**Weryfikacja:** ✅ (arytmetyka potwierdzona w kodzie: sekwencyjna pętla
`bookAgents.ts:999-1054`, 3×60 s prób + backoff 429 30/60/90 s w
`geminiImageGen.ts:47-64`)
**Gdzie:** `convex/bookAgents.ts` (illustrate), `convex/lib/geminiImageGen.ts`.

**Problem:** 12–15 obrazków generowanych sekwencyjnie w JEDNEJ akcji. Kilka wolnych
obrazków albo seria 429 → przekroczenie limitu 10 min → akcja ubita bez catcha,
zamówienie wisi w `illustrating` z częściowymi artefaktami. Identyczna klasa jak
incydent A5 z 10.08, tylko z większą powierzchnią (najdłuższy etap pipeline'u).
Brak kursora/lease — nie wiadomo, dokąd doszło.

**Scenariusz:** Google ma degradację, obrazki 9/12 gotowe, dziesiąty dostaje
3×429. Akcja umiera na ~600 s. Klient: wieczny spinner. Operator: brak błędu,
brak eventu, `retry --force` od zera regeneruje wszystko (duplikaty — patrz H7).

**Fix:**

- Jedna scheduled akcja = jeden obrazek (albo mała paczka z twardym budżetem czasu).
  Po skończeniu obrazka mutation zapisuje wynik i **atomowo** planuje następny
  (scheduling z mutacji jest atomowy — z akcji nie).
- Stan per-asset w `bookIllustrations` (albo osobnej tabeli):
  `pending|generating|done|failed` + `attempts` + `illustrationId` jako klucz logiczny.
- Wznowienie = weź pierwszy `pending`/przeterminowany `generating`, nie „od zera".

**Done gdy:** test na dev: zamówienie z wymuszonym błędem na 3. obrazku dokańcza
resztę po retry pojedynczego asseta; sztuczne opóźnienie nie zabija całości; czasy
per obrazek widoczne w eventach.

---

### C4. Nieudane obrazki cicho stają się białym 1×1 PNG — wadliwa książka „z sukcesem"

- [ ]

**Weryfikacja:** ✅ (`storeImageOrPlaceholder` / `storeMinimalPlaceholder`,
`convex/bookAgents.ts:917-939`)
**Gdzie:** `convex/bookAgents.ts:917-939`, konsumenci: A9 composer, A10 final QA
(`bookAgents.ts:1391-1412` liczy wiersze, nie treść).

**Problem:** wyczerpane próby generacji obrazka → `null` → zapisujemy 67-bajtowy
biały PNG jako pełnoprawną ilustrację. Brak klucza API, safety block, seria 429 —
wszystko wygląda jak sukces. A10 sprawdza `count >= expected`, więc QA przechodzi.
Klient dostaje PDF z pustymi stronami.

**Scenariusz:** wygasa `GOOGLE_GENERATIVE_AI_API_KEY`. Wszystkie zamówienia tego dnia
kończą się „completed" z białymi stronami. Nikt się nie dowiaduje, dopóki klient nie
napisze maila.

**Fix:**

- `generateImage` zwraca wynik dyskryminowany `{ok, bytes?, category, attempts}`
  zamiast `Uint8Array | null`; kategorie: `safety|rate_limit|timeout|config|other`.
- Produkcyjna ścieżka NIE zapisuje placeholdera. Brak obrazka wymaganego = asset
  `failed` → stage failed / `paused` do review (spójnie z C3 per-asset).
- Placeholder zostaje wyłącznie za jawną flagą testową (CLI/batch dev).
- A10: oprócz liczby wierszy sprawdza rozmiar blobów (>10 KB) — tani sanity check
  na 1×1 PNG, zanim powstanie prawdziwe wizualne QA (M9).

**Done gdy:** test na dev: zamówienie z ubitym kluczem Gemini kończy w stanie
błędu z czytelnym `category`, nie w `completed`; batch testowy z flagą dalej działa.

---

## HIGH

### H1. Zerwany kontrakt A1 → A7/A8: przewodnik i anchor znikają z promptów obrazkowych

- [ ]

**Weryfikacja:** ✅ (`bookAgents.ts:989-993, 1140-1142` czytają
`profile.descriptionEn` / `profile.guideCharacter?.descriptionEn` /
`profile.visualAnchor` z `|| ''`; A1 produkuje zagnieżdżone
`child_character.description_en` — brak normalizera)
**Gdzie:** `convex/bookAgents.ts` (A7 preambuła, A8 placeholdery),
`convex/lib/bookTypes.ts:95` (stary typ), prompt `bookChildProfiler`.

**Problem:** A1 emituje nested snake_case, A7/A8 czytają flat camelCase → preambuła
przewodnika w promptach obrazkowych i „expected characters" w Visual QA są **pustymi
stringami**. Ratuje nas tylko to, że A5 dostaje surowy JSON profilu, więc opisy scen
zawierają postaci — dlatego książki wyglądają dobrze mimo dziury. Ale Visual QA
porównuje ilustracje z pustym wzorcem (ślepy sędzia), a spójność przewodnika między
scenami wisi na przypadku.

**Dodatkowo (ten sam prompt):** A1 czyta nieistniejące ścieżki wejścia
(`problem.detail`, `guide_seed.favorite_toy` — faktyczny artefakt A0 ma płaskie
`problemDetail`, `favoriteToy`) → personalizacja słabsza, niż myślimy.

**Fix:**

- Zdefiniować `CharacterProfileV2` (zod) i **znormalizować raz, przy zapisie artefaktu
  A1** (analogicznie do `normalizeIllustrationPlan`). Konsumenci bez zmian.
- Poprawić ścieżki wejściowe w promptcie A1 (DB + fallback).
- Regression test: profil z dev-zamówienia → assert, że `guideCharacter.descriptionEn`
  i `visualAnchor` niepuste po normalizacji i trafiają do promptu A7.

**Done gdy:** log promptu A7 na dev zawiera opis przewodnika i anchor; A8 dostaje
niepuste expected-fields.

---

### H2. Maile transakcyjne ignorują wynik wysyłki — klient bez maila, operator bez śladu

- [ ]

**Weryfikacja:** ✅ (sendEmail zwraca `{ok:false}`; wywołania w `convex/email.ts:77-87,
160-171, 204-216` nie czytają wyniku)
**Gdzie:** `convex/lib/email.ts:54-86`, `convex/email.ts` (confirmation, bookReady,
printAlert), `convex/feedback.ts:119-138` (ten sam wzorzec).

**Problem:** Resend odrzuca (429, zły domain, hard bounce) → helper zamienia to na
`{ok:false}`, caller ignoruje, scheduled akcja "sukces". Zero retry, zero statusu,
zero widoczności.

**Fix (mini-outbox, bez przerostu):**

- Tabela `emailOutbox`: `(orderId, template)` unique, `status:
pending|sent|failed`, `attempts`, `lastError`, `providerMessageId`, `nextRetryAt`.
- Wysyłka: wpis `pending` → send → `sent` + messageId albo `failed` + błąd.
  Transient (429/5xx) → cron ponawia z backoffem, max 5 prób. Idempotencja po kluczu.
- Admin: lista `failed` + ręczny resend.

**Done gdy:** test z ubitym RESEND_API_KEY na dev: wpis `failed` widoczny, po
przywróceniu klucza cron dosyła; happy path tworzy `sent` z messageId.

---

### H3. Brak ogólnego watchdoga — każde ubite stage'owe action = zamówienie-zombie

- [ ]

**Weryfikacja:** ✅ empirycznie (dzisiejszy incydent: dwa zombie w `art_direction`,
niewidoczne dla `retry`); jedyny cron ratuje tylko `style_vote`
(`bookPipelineHelpers.ts:391-455`, `crons.ts:6-12`)
**Gdzie:** `convex/crons.ts`, `convex/bookPipelineHelpers.ts`, schema `bookOrders`.

**Problem:** akcje Convex nie są retry'owane automatycznie; ubita akcja zostawia
status w spokoju na zawsze. Poza `style_vote` nie ma żadnej rekoncyliacji dla
`profiling`, `story_writing`, `illustrating`, `composing_pdf`, `delivering` ani
świeżych `intake`.

**Fix:**

- Pola na `bookOrders`: `stageStartedAt` (timestamp ustawiany w `updateOrderStatus`
  przy każdej zmianie agenta) — minimalna wersja bez pełnych leasów.
- Cron co 10 min: zamówienia w statusie nieterminalnym z `stageStartedAt` starszym
  niż próg per stage (LLM stages 15 min, illustrating 45 min do czasu C3) →
  oznacz `failed` z błędem `watchdog: stage timed out` + event + (opcjonalnie)
  alert admina. Wtedy standardowy `retry` działa.
- Pełny wariant (lease + `stageRunId` + CAS w maszynie stanów) — patrz H8/backlog;
  ten punkt to minimum, które już dziś zamienia zombie w widoczne failed.

**Done gdy:** na dev sztucznie ubite stage (throw przed catch / kill akcji) w <15 min
ląduje w `failed` z czytelnym błędem i daje się wznowić `retry`.

---

### H4. `llmLogs` przestanie działać w dniu włączenia Langfuse (+ retencja kasuje historię)

- [ ]

**Weryfikacja:** ✅ (llmClient wysyła `traceId`; validator `storeLlmLog`
w `convex/llmLogs.ts:7-22` nie zna tego pola → ArgumentValidationError; działa dziś
TYLKO dlatego, że Langfuse nie jest skonfigurowany na prodzie → traceId undefined)
**Gdzie:** `convex/llmLogs.ts`, `convex/lib/llmClient.ts`.

**Problem — trzy naraz:**

1. Latentna bomba: pierwszy deploy z ustawionymi kluczami Langfuse → KAŻDY zapis
   llmLogs pada walidacją, po cichu (catch → console.warn). Tracimy jedyny działający
   rejestr wywołań LLM.
2. Retencja 50 wpisów per `clerkUserId`, a wszystkie landing zamówienia dzielą
   `landing-user` — kilka zamówień wzajemnie kasuje sobie historię (widzieliśmy to
   dziś przy debugowaniu: stare A5 były już wypchnięte).
3. Brak `orderId` w logu — korelacja z zamówieniem tylko po timestampach.

**Fix:** dodać do validatora i schematu `traceId`, `orderId` (+ indeks
`by_order`), `attempt`; retencja po wieku (30 dni) albo per-order zamiast per-user.
Uwaga RODO: to jest ta sama tabela co dziura #2 z TODO.md (PII w logach) — przy
okazji zaprojektować retencję zgodnie z tamtym wątkiem, nie przedłużać życia PII.

**Done gdy:** dev z ustawionym Langfuse zapisuje logi z traceId; `cli logs` umie
filtrować po orderId; stary format czytelny.

---

### H5. Eksport Langfuse w ścieżce krytycznej — telemetria może zabić biznes

- [ ]

**Weryfikacja:** ⚠️ (kod wskazany: `langfuse.ts:85-96, 264-275`,
`langfuseRest.ts:113-126` — unbounded fetch, awaited przed zwróceniem wyniku;
nie testowałam scenariusza na żywo. Dziś nieaktywne — Langfuse wyłączony na prodzie)
**Gdzie:** `convex/lib/langfuse.ts`, `convex/lib/langfuseRest.ts`.

**Problem:** `startActiveObservation` czeka na eksport trace'a zanim odda wynik
handlera. Wiszący/padnięty Langfuse może: (a) zjeść pozostały czas akcji PO udanej
generacji (reprodukcja cichej śmierci mimo naszych timeoutów — deadline LLM nie
obejmuje eksportu), (b) zamienić udany call w failed attempt.

**Fix:** telemetria best-effort: timeout 2 s na fetch eksportera, catch-all,
wynik biznesowy NIGDY nie zależy od eksportu. Do zrobienia RAZEM z włączaniem
Langfuse (H4) — wcześniej martwe.

**Done gdy:** test jednostkowy/dev z zablokowanym endpointem Langfuse: stage kończy
się normalnie, w konsoli warn o eksporcie.

---

### H6. Utworzenie zamówienia i start pipeline'u nie są atomowe

- [ ]

**Weryfikacja:** ⚠️ (wzorzec widoczny w `bookPipeline.ts:184-215` i `842-872`:
mutation createOrder, potem scheduler z akcji; zgodne z dokumentacją Convex —
scheduling z akcji nieatomowy)
**Gdzie:** `convex/bookPipeline.ts`, `convex/admin/bookBatch.ts:132-147`.

**Problem:** order powstaje, a zaplanowanie A0 może się nie wydarzyć (ubita akcja,
błąd po insercie) → wieczny `intake` bez `currentAgent` i bez błędu. Użytkownik
retry'uje → duplikat zamówienia.

**Fix:** mutation `createOrder` sam planuje A0 (`ctx.scheduler.runAfter` w mutacji
jest atomowy z insertem). Opcjonalnie klucz idempotencji z klienta (draft ma już
sessionStorage — dodać `clientRequestId`).

**Done gdy:** kod startu nie ma okna między insertem a schedulem; podwójny submit
z tym samym `clientRequestId` zwraca istniejące zamówienie.

---

### H7. Retry ilustracji nie jest idempotentny — duplikaty wierszy i niejednoznaczny wybór

- [ ]

**Weryfikacja:** ⚠️ (`saveIllustration` zawsze insert —
`bookPipelineHelpers.ts:238-261`; visual-QA retry planuje CAŁE A7 —
`bookAgents.ts:1167-1193`; CLI `--force` nie sprząta)
**Gdzie:** `convex/bookPipelineHelpers.ts`, `convex/bookAgents.ts`.

**Problem:** ponowny przebieg A7 (QA retry, `retry --force`) dokłada drugi komplet
wierszy `bookIllustrations`. A10 liczy `>= expected` (przechodzi), composer wybiera
z duplikatów niejednoznacznie, koszty i storage rosną.

**Fix:** klucz logiczny `(orderId, illustrationId)` + upsert (index już jest po
orderId — dodać po parze). Regeneracja tylko odrzuconych ID (spina się z C3
per-asset). Stary blob kasowany/supersedowany po commicie nowego.

**Done gdy:** podwójny przebieg A7 na dev nie zwiększa liczby wierszy; composer
zawsze bierze najnowszy komplet.

---

### H8. Maszyna stanów nie broni przed stale/duplikowanymi akcjami

- [ ]

**Weryfikacja:** ⚠️ (logika `shouldUpdateStatus` — czytałam przy dzisiejszym
incydencie: `from === failed/paused → allow anything`, terminal zawsze zapisywalny,
brak tokenów generacji; scenariusze wyścigów za raportem)
**Gdzie:** `convex/lib/pipelineStateMachine.ts:74-96`,
`convex/bookPipelineHelpers.ts:61-64` (odrzucona tranzycja zwraca sukces).

**Problem:** stara/zdublowana akcja może cofnąć `completed` do stanu roboczego,
wskrzesić `failed`, podwójnie dostarczyć (2× mail bookReady). Odrzucenie tranzycji
jest ciche — agent nie wie, że pisze w próżnię.

**Fix (średni koszt, robić razem z C3/H3):** `stageRunId` na zamówieniu; stage
startuje przez `beginStage` (CAS: expected status + runId), kończy przez
`completeStage`/`failStage` weryfikujące runId. `completed` odrzuca zwykłe starty.
Wzorzec kanoniczny — załącznik A.

**Done gdy:** test: opóźniona duplikowana akcja stage'a nie zmienia stanu
ukończonego zamówienia i loguje odrzucenie.

---

### H9. Fallbacki promptów krytycznie przestarzałe — świeży deploy generuje zepsutą książkę

- [ ]

**Weryfikacja:** ⚠️ (diff za raportem: parity PASS tylko 3/13; A2/A3/A5/A8 —
CRITICAL FAIL: fallback opisuje starą strukturę 6 beatów / 7 ilustracji vs
produkcyjne 6/7/8 beatów i 12/13/15 ilustracji)
**Gdzie:** `convex/lib/prompts/bookFallbacks.ts` vs tabela `bookPrompts` na prodzie.

**Problem:** prompty ładują się DB-first z fallbackiem do kodu. Pusta/nowa baza
(nowe środowisko, odtworzenie po awarii) → pipeline złoży niekompatybilną książkę
(zła liczba beatów, zły plan ilustracji, brak schematu w user message A3).

**Fix:**

- Jednorazowo: `cli prompts` dump z prod → podmiana fallbacków (mechanizm
  wersjonowania już jest).
- Trwale: skill/skrypt parity-check (diff DB vs fallback, ignorując metadane) w CI
  albo jako komenda CLI odpalana przed deployem; fail przy CRITICAL driftcie.
- Przy okazji: wyczyścić z DB 7 martwych promptów (patrz M4) ALBO oznaczyć je
  nagłówkiem „DOKUMENTACJA — runtime nie używa".

**Done gdy:** `prompts seed` na czystej bazie dev produkuje pipeline zgodny
z produkcyjnym (test: jedno zamówienie E2E przez CLI); parity-check w repo.

---

### H10. Brak polityki wizualnej dla scen wrażliwych (ciało dziecka) w A5/A7

- [ ]

**Weryfikacja:** ⚠️ (treść promptów za raportem; kontekst potwierdzony — katalog
tematów zawiera nocnik, moczenie, mycie, jedzenie; A5 już dziś wymaga sanityzacji
`distinguishing_features` przez PROHIBITED_CONTENT)
**Gdzie:** prompt `bookArtDirector` (DB + fallback), `bookStoryArchitect`.

**Problem:** jedyny guardrail wizualny to generyczne „adult content" — nic o scenach
kąpieli, toalety, moczenia nocnego, badań lekarskich. To dokładnie te tematy, na
których (a) provider safety wybucha niedeterministycznie, (b) najłatwiej o obrazek
naruszający godność dziecka. Do tego wewnętrzne sprzeczności promptu A5
(„maximum contrast / noticeably dark" vs `dark` w universal negative prompt).

**Fix:** blok „sensitive child/body scenes" w promptcie A5 (propozycja w raporcie
Codexa jest dobra do wzięcia niemal wprost): dziecko zawsze ubrane/okryte, sceny
przyległe zamiast czynności (droga do łazienki, mycie rąk, wybór piżamy), zakaz
ujęć anatomicznych i „voyeur angles", zamiana nieBezpiecznego beatu na najbliższy
bezpieczny + `safety_adaptation` w outputcie. Spójnie: złagodzić „maximum contrast"
na „wyraźny, ale niegroźny kontrast emocjonalny". W A2: kontraindykacje per temat
(moczenie: zero winy i nagród za „suchą noc" — zgodnie z NICE CG111; jedzenie:
zero presji przez konsekwencje).

**Done gdy:** prompt A5 w DB i fallback zawierają politykę; wygenerowana testowo
bajka „nocnik" (dev) przechodzi ręczny przegląd ilustracji.

---

## MEDIUM — wybrane do wdrożenia

### M1. Klasyfikacja błędów w retry loopie LLM + higiena backoffu

- [ ]

**Weryfikacja:** ✅ (pisałam ten kod dziś — świadomie minimalnie)
**Gdzie:** `convex/lib/llmClient.ts`.

Retry traktuje wszystko jednakowo: 401 i safety-block są ponawiane tak samo jak 429.
Fix: klasyfikacja transient (429/5xx/timeout/abort → retry, honoruj `Retry-After`,
jitter) vs permanentne (4xx poza 429, safety → fail-fast). Przy deadline'u osiągniętym
przed pierwszą próbą — sensowny komunikat zamiast `"undefined"`. Kosmetyka nazewnicza:
`retries` znaczy „total attempts" — zmienić nazwę albo semantykę, bo zaprasza do
błędnej konfiguracji.

### M2. Tuning modeli per stage

- [ ]

**Weryfikacja:** ⚠️ (rekomendacje raportu; kierunkowo zgodne z dzisiejszym incydentem —
implicit thinking na Flash stages to ta sama pułapka co A5)
**Gdzie:** `convex/lib/pipelineConfig.ts`.

- A2 (story planning) i **A4 (psych review)** → `gemini-2.5-pro`, `reasoning: false`,
  jawne `maxTokens` (16k / 12k), temp odpowiednio ~0.45 / 0.1. A4 to najważniejszy
  osąd w pipeline — Flash z temp 0.3 jest za słaby na niuans po polsku.
- A1, A8: zostaje Flash, ale JAWNE `reasoning: false` + `maxTokens` — dziś mają
  implicit thinking on (domyślne `enabled: true`), czyli tę samą minę co A5.
- A5: zostaje sonnet-4.6 reasoning-off (constraint PROHIBITED_CONTENT
  zweryfikowany empirycznie — NIE ruszać modelu); rozważyć `maxTokens` ~16k
  i 2 próby zamiast 4 (4×360 s i tak nie mieści się w deadline 510 s).
- Usunąć martwy wpis `book.finalQa` z configu (A10 nie woła modelu — patrz M9).

**Uwaga kosztowa:** przy obecnym saldzie OpenRouter ($6.53!) każda zmiana modelu
w górę wymaga doładowania konta NAJPIERW.

### M3. Generacja obrazków: wymiary, atrybucja prób

- [ ]

**Weryfikacja:** ✅ (width/height martwe — zdefiniowane w interfejsie
`geminiImageGen.ts:30-31`, nigdy nie wysyłane)
**Gdzie:** `convex/lib/geminiImageGen.ts`.

`aspect_ratio` z planu A5 jest fikcją — request nie zawiera wymiarów. Fix: przekazać
do API (imagen config), po C4 dołożyć per-attempt log (kategoria błędu, czas) do
stanu per-asset z C3. Referencje obrazkowe i seedy — backlog (duża zmiana, osobna
decyzja produktowa).

### M4. Czystka martwych promptów w DB + egzekwowanie rejestru placeholderów

- [ ]

**Weryfikacja:** ⚠️ (7 martwych dokumentów: bookIntake, bookCharacterDesigner,
bookStyleVote, bookIllustrator, bookComposer, bookFinalQa, bookDelivery — runtime
ich nie ładuje; `templateSchemas` nieużywane przez `getPrompt`)
**Gdzie:** tabela `bookPrompts`, `convex/lib/prompts.ts`, `convex/bookAgents.ts:98`.

Martwe dokumenty obiecują funkcje, których nie ma (multimodalne QA, seedy, scoring) —
mylą każdego, kto czyta prompty jako specyfikację (włącznie z audytami). Fix: usunąć
z DB albo przenieść do `docs/` jako specyfikacje z jawnym nagłówkiem; `getPrompt`
waliduje placeholdery przez `templateSchemas` (dziś rejestr tylko dokumentuje).

### M5. Copy i polszczyzna: usunięcie „2× skuteczności", poprawki w A3

- [ ]

**Weryfikacja:** ⚠️ (cytaty za raportem; klam „doubles effectiveness" niepodparty —
raport przywołuje RCT z ~15 p.p. przewagi nad waitlist, nie 2×)
**Gdzie:** prompty `bookStoryWriter`, `bookStoryArchitect`, `bookDelivery`,
copy maili w `convex/lib/email.ts`.

- Wywalić „wspólne czytanie podwaja/potraja skuteczność" wszędzie (prompty + maile);
  zamiennik: „przeczytajcie wspólnie i porozmawiajcie o tym, co czuł bohater".
- A3: przykład 9+ modeluje wstyd („Dziewięciolatki nie boją się ciemności") —
  podmienić na wersję z raportu; literówka `gasła → gasiła`; spójność limitów
  długości zdań (deklarowane 15 vs dopuszczane 20).
- Ujednolicić liczbę pytań dla rodzica (A2 robi 3, mail obiecuje 5).

### M6. Composer: brakujący obrazek = twardy błąd, nie pusta strona z podpisem

- [ ]

**Weryfikacja:** ⚠️ (`bookComposer.ts:814-824` fetch→null bez komunikatu,
`458-470` placeholder page, preview fail tylko console)
**Gdzie:** `convex/bookComposer.ts`, `convex/bookComposerRender.ts`.

Po C4 (bez placeholderów w storage) composer też musi failować przy braku wymaganego
obrazka zamiast komponować pustą stronę. Preview-fail jako event, nie console. Config
render service poza catch → wciągnąć do catcha.

### M7. Print pipeline: lease i watchdog dla `queued`

- [ ]

**Weryfikacja:** ⚠️ (`admin/printPdf.ts:165-190` POST bez abort signal; brak cronu)
**Gdzie:** `convex/admin/printPdf.ts`.

Ubita akcja dispatchu = `queued` na zawsze w adminie. Fix: timeout na accept requestu,
`dispatchedAt` + cron oznaczający stale joby, przycisk re-dispatch. (Print jest na
prodzie używany przez c3z — niski wolumen, ale mylący stan w adminie.)

### M8. Jeden kanoniczny wzorzec error handlingu — dokument + egzekwowanie w review

- [ ]

Sześć różnych stylów obsługi błędów w repo (katalog w raporcie 1). Fix: przyjąć
wzorzec z załącznika A jako obowiązujący dla NOWEGO kodu stage'ów, wpisać do
CLAUDE.md (sekcja Convex Conventions) i egzekwować w code review. Migracja starych
stage'ów przy okazji C3/H8, nie big-bangiem.

### M9. Decyzja produktowa: czym naprawdę jest finalne QA (A10)

- [ ]

**Weryfikacja:** ⚠️ (A10 programatyczny: parsowanie, obecność imienia, liczba
ilustracji; prompt multimodalny w DB martwy; config modelu martwy)

Dziś A10 nie ogląda ani jednej wyrenderowanej strony — nie wykryje przyciętego
tekstu, pustych obrazków (poza sanity checkiem z C4), złej odmiany imienia na
okładce. Decyzja: (a) prawdziwe multimodalne QA po składzie (Flash, temp 0,
contact-sheet stron — koszt ~1 call/książkę) albo (b) skasować martwy prompt
i config, nazwać A10 uczciwie „integrity check". Rekomendacja: (a) — bezpieczeństwo
dziecka to nasz wyróżnik, a to jedyny etap, który widzi finalny produkt.

---

## Backlog (świadomie NIE teraz)

- **Pełne schematy Zod dla wszystkich artefaktów A1–A8** — słuszny kierunek
  (raport 2, rekomendacja #1), ale wdrażać przyrostowo przy okazji C1/H1
  (psychReview, characterProfile najpierw), nie jako osobny big-bang.
- **Referencje obrazkowe + seedy w A6/A7** (spójność postaci między scenami) —
  wymaga zmiany integracji Gemini i decyzji produktowej; osobny projekt.
- **Orphaned blobs w storage** (store OK, DB write padł) — rzadkie, sprzątaczka
  kiedyś.
- **`backendLogs` jako operacyjny log incydentów** — na razie wystarczą pipeline
  events + llmLogs po H4; wrócić, jeśli braknie.
- **Przegląd polszczyzny i terapeutyki przez psychologa dziecięcego** (feeding,
  toileting, przemoc rówieśnicza, rozwód, lęk medyczny) — poza zakresem kodu;
  raport 2 sekcja 6 jako brief. Warte zrobienia przed skalowaniem marketingu.
- **`arc_type` nie pokrywa kategorii `change`/`general`** (rozwód, przeprowadzka,
  rodzeństwo) — rozszerzyć przy najbliższej edycji promptu A2.

## Zrobione 2026-08-10 (kontekst)

- ✅ A5: `reasoning: false` (sonnet-4.6), per-stage `timeoutMs`, deadline 8,5 min
  w llmClient — commity `13467bb`, `d324d5d`. Zamówienie klientki dokończone.
- ✅ `cli retry --force` dla zamówień zawieszonych mid-status.
- ✅ Odkrycie: **Langfuse nie jest skonfigurowany na prodzie** (brak env vars) —
  obserwowalność LLM wyłączona; dziura „PII w Langfuse" z TODO.md obecnie martwa
  na prodzie (w llmLogs — wciąż żywa).
- ⚠️ **OpenRouter: saldo $6.53 z $440** — doładować przed kampanią i przed M2.

---

## Załącznik A — kanoniczny wzorzec error handlingu (z raportu 1)

Standard: **durable start z lease, ograniczone/idempotentne IO, atomowe
complete/fail, niezależny watchdog.**

```ts
export const runStage = internalAction({
  args: { orderId: v.id('bookOrders'), runId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(internal.pipeline.beginStage, {
      ...args,
      stage: 'A7',
      leaseUntil: Date.now() + 8 * 60_000,
    });
    if (!claim.claimed) return null; // stale albo duplikat

    try {
      const result = await retryIo({
        deadlineMs: claim.leaseUntil - 30_000,
        idempotencyKey: `${args.orderId}:${args.runId}:A7`,
        operation: (signal, attempt) => generateRequiredAsset({ signal, attempt }),
      });
      await ctx.runMutation(internal.pipeline.completeStage, {
        ...args,
        artifact: result,
        event: 'complete',
        nextStage: 'A8', // mutation planuje następny krok atomowo
      });
    } catch (cause) {
      await ctx.runMutation(internal.pipeline.failStage, {
        ...args,
        error: serializeError(cause),
        retryable: isTransient(cause),
      }); // atomowo: patch zamówienia + event błędu
      throw cause;
    }
    return null;
  },
});
```

`beginStage` robi CAS na oczekiwany status+runId i zapisuje lease. `completeStage`
atomowo zapisuje artefakt, event i planuje następną akcję. `failStage` to jedyny
punkt utrwalania błędu. Jeśli akcja zginie przed catchem — wygasły lease daje
watchdogowi (H3) punkt zaczepienia.

## Załącznik B — dobór modeli per stage (rekomendacje raportu 2)

| Stage            | Obecnie                                   | Werdykt                            | Rekomendacja                                             |
| ---------------- | ----------------------------------------- | ---------------------------------- | -------------------------------------------------------- |
| A1 profiling     | Flash, temp 0.7, implicit thinking        | OK model, złe ustawienia           | Flash, temp 0.4–0.5, `reasoning:false`, cap 6k           |
| A2 storyPlanning | Flash, temp 0.6, implicit thinking        | **za słaby** na plan terapeutyczny | Pro, temp 0.4–0.5, `reasoning:false`, cap 16k            |
| A3 storyWriting  | Pro, temp 0.8, reasoning off, cap 32k     | trafiony                           | zostaje; temp ~0.7, cap 20–24k                           |
| A4 psychReview   | Flash, temp 0.3, implicit thinking        | **najbardziej niedowartościowany** | Pro, temp 0.1, `reasoning:false`, cap 10–12k             |
| A5 artDirection  | Sonnet 4.6, reasoning off, 360 s          | poprawny (constraint Gemini)       | **nie ruszać modelu**; temp 0.3–0.4, cap 12–16k, 2 próby |
| A8 visualQa      | Flash vision, temp 0.3, implicit thinking | OK; wąskim gardłem są wejścia (H1) | Flash, temp 0–0.1, `reasoning:false`, cap 8k             |
| A10 finalQa      | Flash (config martwy)                     | martwe                             | usunąć albo prawdziwe multimodalne QA (M9)               |

## Załącznik C — ranking promptów (risk-adjusted, od najsłabszego) + parity

Ranking: bookPsychReviewer (aktywny, C1) → bookFinalQa (martwy, obiecuje QA którego
nie ma) → bookChildProfiler (aktywny, H1) → bookArtDirector (aktywny, H10) →
bookVisualQa (aktywny, ślepy — H1) → bookStoryArchitect (aktywny, M5/backlog) →
bookIllustrator / bookCharacterDesigner / bookComposer / bookIntake / bookDelivery /
bookStyleVote (martwe dokumenty, M4) → **bookStoryWriter (najlepszy aktywny;
poprawki M5)**.

Parity DB↔fallback: PASS tylko bookIntake, bookStyleVote, bookDelivery.
CRITICAL FAIL: bookStoryArchitect, bookStoryWriter, bookArtDirector, bookVisualQa
(H9). Reszta: FAIL z mniejszą wagą (szczegóły w surowym raporcie 2).
