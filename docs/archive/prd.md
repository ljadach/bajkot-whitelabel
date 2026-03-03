# 1) Nazwa i one‑liner

- Nazwa: AITutor
- One‑liner: 3–5 minut rozmowy → spersonalizowany program AI + płatność jednym kliknięciem.

# 2) Cel, KPI, definicja sukcesu

- Cel: zebrać wiarygodny profil i wygenerować dopasowany plan szkolenia zakończony zakupem.
- North Star: konwersja do płatności (checkout conversion).
- KPI: p50 czasu do kompletnego profilu, kompletność profilu, satysfakcja (NPS 24h), CTR na moduły.

# 3) Zakres MVP

- Czat z LLM (powitanie generowane), zawsze dostępny free‑text; widżety jako skróty.
- Kanoniczny profil (XML string jako źródło prawdy; definicja wersjonowana w Langfuse).
- 1‑min performance check z automatycznym scoringiem.
- Sekcja „Your Profile Summary” → „Your Assessment” (raport) → „Your Personalized Training Plan”.
- Stripe Checkout + webhook + powiadomienie BO.
- Walidacja kompletności/spójności przez LLM (reasoning) + gate w flow.

# 4) Ścieżka użytkownika (happy path)

1. Welcome (powitanie z LLM, ciepły ton).
2. Chat (free‑text zawsze, widżety tylko jako podpowiedzi; przejście przyciskiem „Next”; ołówek do edycji ostatniej odpowiedzi; layout jak ChatGPT).
3. Skill Verification (1‑min task + score).
4. Your Profile Summary — podsumowanie pól profilu.
5. Your Assessment — raport w Markdown, wygenerowany z profilu i historii czatu.
6. Your Personalized Training Plan — outline + szybka edycja (toggle included).
7. Checkout (Stripe) → Thank You + e‑mail do BO.

# 5) Widżety i zasady interakcji

- Typy: single‑select, multi‑select, likert 1–5, free‑text.
- Zawsze można pisać freetekstem; widżety jedynie wklejają tekst do pola jako ułatwienie.
- Idziemy dalej dopiero po „Next”.
- Ostatnią odpowiedź można edytować (ikonka ołówka zamiast UNDO).

# 6) Walidacja i „gates”

- Kompletność/spójność profilu ocenia LLM na bazie definicji XML (reasoning model).
- Gate przed kolejnymi krokami: LLM zwraca `complete: true` dopiero gdy profil jest wystarczająco uzupełniony.

# 7) Schemat danych — Kanoniczny XML

## 7.1 Źródło prawdy

Kanoniczny profil użytkownika jest przechowywany jako **XML string** w DB (`userProfiles.profileXml`).
XML pełni podwójną rolę:
1. **Konfiguracja** — definiuje jakie pola zbieramy od użytkownika
2. **Dane** — przechowuje zebrane wartości

Definicja/kontrakt XML jest utrzymywany i wersjonowany w Langfuse prompt `profile-xml-definition-v1`.
Lokalny fallback znajduje się w `convex/lib/prompts.ts` oraz `convex/lib/profileXml.ts`.

## 7.2 Pełna struktura XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<profile version="1.0">
  <!-- Narzędzia AI używane przez użytkownika -->
  <tools>
    <tool>ChatGPT</tool>
    <tool>Claude</tool>
  </tools>

  <!-- Rola zawodowa -->
  <role>Marketing Manager</role>
  <seniority>Senior</seniority>
  <experience>5+ years in digital marketing</experience>

  <!-- Artefakty tworzone z AI -->
  <artifacts>
    <artifact>briefs</artifact>
    <artifact>emails</artifact>
    <artifact>landing pages</artifact>
  </artifacts>

  <!-- Cele nauki -->
  <goals>
    <goal>Automate content creation</goal>
    <goal>Improve prompt engineering</goal>
  </goals>

  <!-- Potrzeby szczegółowe -->
  <needs>
    <need>automation</need>
    <need>research summaries</need>
  </needs>

  <!-- Czas i styl nauki -->
  <timeCommitment>2h per week</timeCommitment>
  <learningStyle>hands-on with examples</learningStyle>

  <!-- Negatywne preferencje (czego NIE chce) -->
  <negativePreferences>
    <preference>no video editing</preference>
    <preference>no Python coding</preference>
  </negativePreferences>

  <!-- Samoocena umiejętności (Likert 1-5) -->
  <skillsSelfReport prompting="3" evaluation="2" contextWindow="1" safety="2" />

  <!-- Ograniczenia -->
  <constraints time_per_week="2h" language="EN" />
</profile>
```

## 7.3 Reguły XML

- **Wartości puste**: element obecny ale pusty (`<role></role>` lub `<role />`).
- **Tablice**: powtórzone elementy potomne (`<tool>`, `<artifact>`, `<goal>`, `<need>`, `<preference>`).
- **Atrybuty**: używane dla `skillsSelfReport` (numeryczne 1-5) i `constraints`.
- **Wersjonowanie**: atrybut `version` na głównym elemencie `<profile>`.

## 7.4 Derived State (profileState)

Dla wygody UI, z XML generowany jest pochodny JSON string (`profileState`):
- Tworzony przez `deriveProfileStateFromXml()` w `convex/lib/profileXml.ts`
- Używany przez komponenty frontendowe (np. `SummaryStep`)
- **Jednokerunkowe mapowanie** — zmiany w profileState nie wpływają na XML

## 7.5 Pola dodatkowe w userProfiles

Oprócz `profileXml` i `profileState`, tabela `userProfiles` zawiera:
- `chatHistory` — historia konwersacji intake
- `skillVerification` — wynik performance check (score, level, feedback)
- `assessmentReport` — Markdown raportu HR
- `planOutline` / `planFull` / `planMetadata` — JSON planu treningowego
- `paymentStatus`, `stripeSessionId` — status płatności

# 8) Performance check (1 minuta)

- Zadanie: „Napisz prompt do [use‑case] i popraw po krótkiej krytyce.”
- Rubryka (0–1): cel; kontekst/ograniczenia; struktura/role; kryteria jakości; iteracja.
- Poziomy: 0–0.3 Beginner, 0.3–0.6 Intermediate, 0.6–0.8 Advanced, 0.8–1.0 Expert.
- Fuzja: samoocena + wynik → flaga spójności do planu.

# 9) Your Assessment (wyświetlanie profilu)

- Cel: elegancki, krótki raport HR‑owy do upskillingu, po angielsku, w atrakcyjnym Markdownie.
- Wejście: `profileXml`, `skillVerification`, `chatHistory` (ostatnie 16 wiadomości).
- Prompt (skrót): „Napisz zwięzły, profesjonalny raport (180–300 słów) po angielsku. Zwróć JSON { report: "<MARKDOWN>" }. Sekcje z emoji: Current AI Usage, Skills & Evidence, Goals & Needs, Constraints, Fast‑Track Recommendations. Uwzględnij liczby jeśli są (np. 0.62, 3/5).”
- Render: używamy bezpiecznego renderera Markdown (nagłówki, listy, hr, bold/italic, code) i pokazujemy w sekcji „Your Assessment”.
- Persistencja: zapis do `assessmentReport` w profilu.

# 10) Your Personalized Training Plan (dynamic, two-layer)

- Inputs: `profileXml`, `assessmentReport`, `skillVerification` + history gap analysis (no static module catalog).
- LLM builds a **two-layer plan**:
  - `outline` (visible): 5 concise pages/cards with `title`, `teasers`, optional `cta`. This is what the user edits/toggles.
  - `deep` (stored, not shown directly): guidance for each outline page after analyzing the user’s knowledge gaps. For every page it specifies the intended goal, missing skills to close, and suggested tactics/prompts/resources to include when generating the final handbook/PDF.
- The `deep` layer should map 1:1 to outline pages (by page number) and may include structured hints: `goal`, `gapSummary`, `suggestedPrompts`, `workflows`, `safetyNotes`, `metrics`, `links`. It is used downstream to render the full playbook; outline remains a light teaser.
- Default length: 5 pages, but titles/content adapt to role/industry inferred from the profile and assessment.
- Persistence:
  - `planOutline` — JSON used by the UI (cards in the Plan step).
  - `planFull` — the “deep” JSON with gap-closure guidance; stored in profile for PDF/handbook generation.
- Regeneration: calling the LLM action recalculates both layers based on the latest profile + assessment.

# 11) Płatność i BO

- Stripe Checkout; webhook `checkout.session.completed` → `order.created` + e‑mail do BO.
- BO: przypisanie mentora/terminu, kontakt.

# 12) Architektura

- Frontend: kroki — Welcome, Chat, Verification, Summary, Assessment, Plan (renderuje `planOutline`), Payment, Complete. W planie dostępny przycisk regeneracji i CTA do zakupu pełnego PDF.
- Backend: akcje LLM — `generateNextQuestion`, `scorePrompt`, `generateAssessmentReport`, `generatePlaybook` (zwraca outline + fullPlan; observability przez Langfuse + REST fallback).
- DB: `userProfiles` zawiera `chatHistory`, `profileXml`, `assessmentReport`, `planOutline`, `planFull`, status płatności, itd.

**Mapa kroków ↔ prompty LLM**

| Krok (UI) | Cel/rezultat | Prompt Langfuse | Główne wejścia | Wyjście / persistencja |
| --- | --- | --- | --- | --- |
| Welcome / Chat (profiling) | Kolejne pytania i budowa profilu XML | `profile-xml-definition-v1`, `intake-xml-system-v1`, `intake-xml-user-v1` | `chatHistory`, aktualny `profileXml` (XML), widżety | Następna wiadomość + `profileXml`; aktualizacja `chatHistory`/`profileXml` |
| Skill Verification (1-min prompt) | Ocena jakości promptu i levelu | `score-system-v1` | Tekst zadania 1-min + rubryka | `skillVerification` z `score`, poziomem, `mini_feedback`; zapis w `skills.performance` |
| Your Assessment | Raport HR w Markdown | `assessment-xml-system-v1`, `assessment-xml-user-v1` | `profileXml`, `skillVerification`, `chatHistory` (<=16) | `{ report: "<MARKDOWN>" }` → `assessmentReport` |
| Plan (Outline + Deep) | Dwuwarstwowy playbook do edycji | `playbook-xml-system-v1`, `playbook-xml-user-v1` | `profileXml`, `assessmentReport`, `skillVerification`, gap analysis | `{ outline, fullPlan, metadata }` |
| Checkout / Complete | Płatność + BO | — (brak promptu LLM) | `planOutline` wybory, price, session | Status płatności, e-mail BO |

# 13) Telemetria i A/B

- Eventy: `chat_view_opened`, `widget_rendered`, `option_selected`, `free_text_entered`, `profile_field_completed`, `outline_generated`, `module_toggled`, `checkout_started`, `checkout_completed`.
- Props: session_id, step, widget_type, time_to_answer, profile_hash.
- FF: kolejność bloków, ton powitania, widżety vs czysty czat.
- Odporność: retry + fallback na free‑text, autosave, recovery po refreshu.
- Observability: Langfuse (Convex actions + manual REST trace w `/test`) zbiera span/logi bezpośrednio z backendu; frontend wysyła eventy przez `observability.logEvent`.

# 14) Dostępność i UX

- Kontrast, focus‑ring, obsługa klawiaturą, aria‑labels.
- Jeden fokusowany textarea, „Next” do przejścia, ołówek do edycji ostatniej odpowiedzi.

# 15) Bezpieczeństwo i RODO

- Minimalne PII; zgody wyłącznie pod szkolenie.
- Szyfrowanie w spoczynku i w tranzycie.
- Retencja sesji 30 dni; telemetria zanonimizowana.

# 16) Testy akceptacyjne

- AC1: p50 ≤ 5 min do kompletnego profilu.
- AC2: performance check zwraca score i poziom.
- AC3: Assessment generuje się ≤ 3 s (p90), 180–300 słów, poprawny Markdown (nagłówki, listy, hr).
- AC4: Plan generuje się ≤ 2 s (p90); działa edycja (toggle).
- AC5: Webhook Stripe tworzy `order` + e‑mail do BO.
- AC6: Recovery po refreshu przywraca ostatni krok.

# 17) Ryzyka i mitigacje

- Halucynacje oceny/outline → twarde struktury JSON, snapshoty i fallback.
- Za długi raport → limit słów i sekcji, walidacja długości po stronie app.
- Spadek konwersji → mocne quick wins, A/B copy, skracanie ścieżki.

# 18) Backlog V2+

- Konta firmowe, role HR/Manager.
- Export do LMS (SCORM/xAPI).
- Rekomendacje „następna lekcja 10 min dziś”.
- Bundling dla zespołów, kupony, faktury VAT.
- Dynamic pricing (czas/poziom/popyt).
- Opcjonalny offline korpus.

# 19) **Decyzje (WRT 19)**

1. **Kanoniczny XML** jest jedynym źródłem prawdy dla profilu użytkownika.
2. **Stripe** jako bramka płatności.
3. **PostHog** do monitoringu eventów i feature flags.
4. **Back-office ręcznie** ustala terminy/mentora.
5. **Licencje korpusu** są zapewnione.

# 21) Usprawnienia nieoczywiste (włączone)

- **Kontrast preferencji:** pytanie o to, czego _nie_ chcesz (negatywne preferencje filtrują outline i skracają ścieżkę).
- **Confidence flag:** jeśli samoocena ≫ performance (lub odwrotnie), dorzucamy moduł „Jak pytać AI skuteczniej w 10 minut” i/lub „Szybkie mosty” na start.

cezar — oto **ostateczny spec AITutor (MVP)**. Wszystko zgodnie z Twoimi decyzjami. Numeracja twarda, gotowe pod implement.

# 1. Brand & UI

1.1. Styl: minimalistyczny, jasny, „apple-like” (biele, subtelne szarości).
1.2. Dark mode: **brak** (tylko jasny).
1.3. Layout czatu: strumień na **80% szerokości** (centrowany), bez panelu bocznego.
1.4. Progres: **brak** paska/licznika.
1.5. Mobile-first (min. 360×640); desktop skaluje do max 960–1100 px treści.
1.6. Tokens (domyślne, web-safe):

- Font: `Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`
- Kolory: `--bg:#FFFFFF`, `--ink:#111111`, `--muted:#666666`, `--line:#EAEAEA`, `--accent:#0A84FF`
- Promienie: `--radius: 12px` (chip/button 999px)
- Odstępy: 8/12/16/24/32 px

# 2. UX & Flow

2.1. Start: ekran powitalny → **„Wejdź i jedziemy”**; agent pierwszą wiadomością tłumaczy proces.
2.2. Jedno pytanie na ekran.
2.3. Agent może **pomijać** pytania (skipping) na bazie wcześniejszych odpowiedzi.
2.4. **Autosave** po każdej odpowiedzi.
2.5. **Undo**: cofanie o 1 krok bez utraty profilu.

# 3. Widżety

3.1. Single-select: do 7 opcji; „pokaż więcej” >7.
3.2. Multi-select (chips): do 10 zaznaczeń z licznikiem.
3.3. Likert 1–5: etykiety „I don’t know” ↔ „Confident/flow”.
3.4. Free-text: 3000 znaków **tylko** dla zadania z promptem; inne: 280 znaków; **bez autokorekty**.

# 4. Copy (ENG only)

4.1. **Welcome (hero):**
“Hi! In the next 3–5 minutes I’ll learn how you use AI and what you actually need. I’ll then assemble a tailored training plan you can edit and buy in one click. We don’t sell your data.”
Button: **“Let’s start”**
4.2. Info badges (pod hero): “3–5 minutes”, “No data resale”, “Edit your plan before payment”.
4.3. Tooltips “Why we ask?” (na pyt. wrażliwe):
“We ask this to calibrate your starting point and skip what you already know.”

# 5. Performance Check (1-minute style, bez timera w UI)

5.1. Zadanie: „Paste the **best prompt** you’ve used recently for your real work. If needed, add 1–2 lines of context.” (limit 3000 znaków).
5.2. Rubryka wag: **20/25/20/20/15** (goal / context & constraints / structure & roles / quality criteria / iteration potential).
5.3. Mini-feedback (1 zdanie): „Clear goal, but missing constraints.” + ukryty score [0–1].
5.4. Mapowanie poziomu: 0–0.3 Beginner; 0.3–0.6 Intermediate; 0.6–0.8 Advanced; 0.8+ Expert.

# 6. Outline & deep plan (now without static catalog)

6.1. Plan powstaje dynamicznie z `profileXml` + `assessmentReport` + `skillVerification` + historii czatu; nie ma stałego katalogu modułów.
6.2. LLM buduje 5‑stronicowy `outline` (widoczny) oraz odpowiadającą mu sekcję `deep` (niewidoczna), która zawiera rekomendacje jak domknąć luki kompetencyjne na każdej stronie.
6.3. `deep` może zawierać: `goal`, `gapSummary`, `suggestedPrompts`, `workflows`, `safetyNotes`, `metrics`, `links` — wyłącznie jako wskazówki do generacji PDF/handbooka.
6.4. UI pozwala edytować tylko `outline`; `deep` jest przechowywany w profilu i wykorzystywany downstream (PDF/agent).

# 7. Pricing & Checkout (Stripe)

7.1. **Pakiety** (MVP):

- **AITutor Pro** – **USD 20 / month** (dostęp do programu + aktualizacji przez miesiąc).
- (Team/Enterprise – **poza MVP**, placeholder w UI ukryty).
  7.2. Stripe: **jeden dynamiczny** `price_data` (recurring monthly, USD 20) w `checkout.session.create`.
  7.3. Kupony: **brak** w MVP.
  7.4. VAT/NIP/faktura: **ignorujemy w MVP** (copy bez obietnic faktury).
  7.5. **Refund policy (EU/UK/USA/DACH) – standard** _(copy; do przeglądu prawnego)_:
- EU/UK/DACH (consumer): 14-day cooling-off dla subskrypcji **o ile** użytkownik nie wyraził zgody na natychmiastowe rozpoczęcie świadczenia. Jeśli zaczyna od razu (checkbox), prawo odstąpienia wygasa po aktywacji dostępu.
- USA: 7-day goodwill refund (pro-rata jeśli aktywowany dostęp był użyty).
- Procedura: e-mail na support w 7/14 dni; odcięcie dostępu po zwrocie.

# 8. Telemetria (PostHog)

8.1. **Eventy**:

- `chat_view_opened`, `widget_rendered`, `option_selected`, `free_text_entered`,
- `validation_failed`, `profile_field_completed`,
- `outline_generated`, `module_toggled`,
- `checkout_started`, `checkout_completed`.
  8.2. **Props**: `session_id`, `step`, `widget_type`, `time_to_answer_ms`, `profile_hash`, `ab_variant` (zapas).
  8.3. **Feature flags**: wyłączone w MVP (hooki przygotowane).
  8.4. **Session recording**: **ON**.

# 9. Back-Office (ręcznie)

9.1. **Mail do BO – szablon (roboczo):**

- **Subject:** `AITutor | New order | ${email} | ${profileHash}`
- **Body:**

  - Learner: email
  - ProfileHash: XXX
  - Role & Needs (z profilu JSON)
  - Outline: lista modułów (id + title)
  - Plan type: Pro Monthly (USD 20)
  - Notes / negative prefs
  - Preferred time windows (jeśli podane)
    9.2. **SLA** kontaktu: **3 dni** robocze (komunikat w Thank You).
    9.3. Kanał BO: e-mail (bez webhooków).
    9.4. Przypisanie mentora/terminu: **poza MVP** (manual później).

# 10. Dane & bezpieczeństwo

10.1. **PII minimalne**: e-mail dopiero przy checkout; brak nazwisk/telefonów.
10.2. **Retencja**: sesje 30 dni; anonimizacja eventów (hash profilu).
10.3. **Export/erasure (GDPR)**: zgłoszenia ręcznie na e-mail; obsługa do 30 dni.
10.4. **Versioning**: **brak** (MVP bez wersjonowania profilu JSON/planu).

# 11. Legal & polityki (ENG copy)

11.1. **Consent (profiling):**
“I agree that my answers will be used to profile my learning needs **solely** for tailoring my AI training plan. No resale of my data.” _(checkbox before start)_
11.2. **Links (placeholders do podmiany):**

- Privacy Policy: `https://aitutor.example.com/privacy`
- Terms of Service: `https://aitutor.example.com/terms`
- Refunds: `https://aitutor.example.com/refunds`
  11.3. **Cookie banner (analytics-only + necessary):**
  “We use essential cookies and privacy-friendly analytics (PostHog). No ad trackers. [Settings] [Accept]”
  11.4. **Exclusions/compliance:** brak listy w MVP (no admittance rules).

# 12. Dane operacyjne

12.1. **Kanoniczny XML (źródło prawdy)** – pełna definicja profilu:

> **UWAGA**: Profil jest przechowywany jako XML string, NIE jako JSON.
> Pełna dokumentacja struktury XML znajduje się w sekcji 7.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<profile version="1.0">
  <tools>
    <tool tier="Pro" usage="daily">ChatGPT</tool>
    <tool tier="Free" usage="weekly">Claude</tool>
  </tools>
  <role>Marketing Manager</role>
  <seniority>Senior</seniority>
  <experience>5+ years in digital marketing</experience>
  <artifacts>
    <artifact>briefs</artifact>
    <artifact>emails</artifact>
    <artifact>landing pages</artifact>
  </artifacts>
  <goals>
    <goal>Automate content creation</goal>
    <goal>Improve prompt engineering</goal>
  </goals>
  <needs>
    <need category="automation">research &amp; summaries</need>
  </needs>
  <timeCommitment>2h per week</timeCommitment>
  <learningStyle>hands-on</learningStyle>
  <negativePreferences>
    <preference>no video editing</preference>
    <preference>no Python</preference>
  </negativePreferences>
  <skillsSelfReport prompting="3" evaluation="2" contextWindow="1" safety="2" />
  <constraints time_per_week="2h" language="EN" />
</profile>
```

12.2. **skillVerification** (przechowywane osobno w userProfiles, nie w XML):

```json
{
  "performanceScore": 0.62,
  "selfAssessment": 3,
  "level": "Intermediate",
  "feedback": "Clear goal, but missing constraints.",
  "promptText": "...",
  "completedAt": 1700000000000
}
```

12.3. **Metadata rozszerzone**: `session_meta`, `timeline`, `ab_variant` (dla telemetrii).

# 13. API (MVP)

13.1. `POST /session` → `{ session_id }` (tworzy/odtwarza).
13.2. `POST /agent/next` → in: `{ session_id, history[] }`; out: `{ message, widgets[], required_fields[] }`.
13.3. `POST /profile/validate` → in: `{ profile }`; out: `{ complete: bool, missing: [field_path], conflicts: [...] }`.
13.4. `POST /outline/generate` → in: `{ profile, assessment }`; out: `{ outline, deep }` (outline 5 cards + deep gap-closing hints).
13.5. `POST /checkout/create` → out: `{ checkout_url }` (Stripe Session z `price_data` USD 20/mo).
13.6. `POST /webhook/stripe` → on `checkout.session.completed` → `order.created` + e-mail do BO.
13.7. `POST /notify/bo` → (opcjonalny trigger ręczny) wysyła maila z szablonu 9.1.

# 14. Orkiestracja LLM (narzędzia)

14.1. `propose_widgets(history, profile_state) -> widgets[]`
14.2. `merge_profile(profile_state, new_answers) -> profile_state`
14.3. `validate_profile(profile_state) -> completeness, conflicts`
14.4. `score_task(prompt_text) -> score[0..1], mini_feedback`
14.5. `gen_outline(profile_state, assessment) -> { outline, deep }`
14.6. Zasady: skipping pytań, dopisywanie `negativePreferences` jeśli brak, reagowanie na luki kompetencyjne (gap) w deep layer.

# 15. Ekrany (MVP)

15.1. **Welcome** (copy z pkt 4) + „Let’s start”.
15.2. **Chat** (1 pytanie, widżety inline, undo, autosave).
15.3. **Profile summary** (co wiemy / co pominięto – tekstowo, bez czasu).
15.4. **Plan (Outline)** (5 kart z dynamicznego outline; deep layer ukryty, służy do handbooka).
15.5. **Checkout** (Stripe redirect).
15.6. **Thank You** („We’ll get back within **3 business days**.”)

# 16. Usprawnienia nieoczywiste (włączone)

16.1. **Kontrast preferencji**: pytamy o „what you don't want" i filtrujemy; zapis w `negativePreferences`.
16.2. **Confidence flag**: rozjazd self-report vs performance → quick win „Ask AI better in 10 minutes”.

# 17. Testy akceptacyjne (MVP)

17.1. Użytkownik kompletuję profil (JSON) bez ręcznej edycji w ≤5 min (p50).
17.2. Performance check zwraca score + mini-feedback.
17.3. Outline generuje się i pozwala na wykluczanie/dodawanie (cena stała).
17.4. Stripe checkout działa (powrót z sukcesem) i przychodzi mail do BO.
17.5. Draft można zapisać (e-mail + magic link) i wrócić do sesji.

---

# USZCZEGÓŁOWIENIE PO PYTANIACH I ODPOWIEDZIACH ZESPOŁU

> **UWAGA**: Poniższa sekcja zawiera szczegółową specyfikację rozwijającą punkty 1-17 powyżej.
> W przypadku konfliktu, sekcja USZCZEGÓŁOWIENIE ma pierwszeństwo.
>
> **Status migracji do XML (2024-12)**:
> - Profil użytkownika jest teraz przechowywany jako XML string (`profileXml`)
> - Legacy JSON (`profileData`) jest migrowany automatycznie
> - Sekcja 7 i 12 zostały zaktualizowane aby odzwierciedlać nową strukturę XML

# 1. Brand & UI

1.1. Styl: minimalistyczny, jasny, „apple-like” (biele, subtelne szarości).
1.2. Dark mode: **brak** (tylko jasny).
1.3. Layout czatu: strumień na **80% szerokości** (centrowany), bez panelu bocznego.
1.4. Progres: **brak** paska/licznika.
1.5. Mobile-first (min. 360×640); desktop skaluje do max 960–1100 px treści.
1.6. Tokens (domyślne, web-safe):

- Font: `Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`
- Kolory: `--bg:#FFFFFF`, `--ink:#111111`, `--muted:#666666`, `--line:#EAEAEA`, `--accent:#0A84FF`
- Promienie: `--radius: 12px` (chip/button 999px)
- Odstępy: 8/12/16/24/32 px

# 2. UX & Flow

2.1. Start: ekran powitalny → **„Wejdź i jedziemy”**; agent pierwszą wiadomością tłumaczy proces.
2.2. Jedno pytanie na ekran.
2.3. Agent może **pomijać** pytania (skipping) na bazie wcześniejszych odpowiedzi.
2.4. **Autosave** po każdej odpowiedzi.
2.5. **Undo**: cofanie o 1 krok bez utraty profilu.
2.6. (skreślono) — brak zapisu draftu w MVP.

# 3. Widżety

3.1. Single-select: do 7 opcji; „pokaż więcej” >7.
3.2. Multi-select (chips): do 10 zaznaczeń z licznikiem.
3.3. Likert 1–5: etykiety „I don’t know” ↔ „Confident/flow”.
3.4. Free-text: 3000 znaków **tylko** dla zadania z promptem; inne: 280 znaków; **bez autokorekty**.

# 4. Copy (ENG only)

4.1. **Welcome (hero):**
“Hi! In the next 3–5 minutes I’ll learn how you use AI and what you actually need. I’ll then assemble a tailored training plan you can edit and buy in one click. We don’t sell your data.”
Button: **“Let’s start”**
4.2. Info badges (pod hero): “3–5 minutes”, “No data resale”, “Edit your plan before payment”.
4.3. Tooltips “Why we ask?” (na pyt. wrażliwe):
“We ask this to calibrate your starting point and skip what you already know.”

# 5. Performance Check (1-minute style, bez timera w UI)

5.1. Zadanie: „Paste the **best prompt** you’ve used recently for your real work. If needed, add 1–2 lines of context.” (limit 3000 znaków).
5.2. Rubryka wag: **20/25/20/20/15** (goal / context & constraints / structure & roles / quality criteria / iteration potential).
5.3. Mini-feedback (1 zdanie): „Clear goal, but missing constraints.” + ukryty score [0–1].
5.4. Mapowanie poziomu: 0–0.3 Beginner; 0.3–0.6 Intermediate; 0.6–0.8 Advanced; 0.8+ Expert.

# 7. Pricing & Checkout (Stripe)

7.1. **Pakiety** (MVP):

- **AITutor Pro** – **USD 20 / month** (dostęp do programu + aktualizacji przez miesiąc).
- (Team/Enterprise – **poza MVP**, placeholder w UI ukryty).
  7.2. Stripe: **jeden dynamiczny** `price_data` (recurring monthly, USD 20) w `checkout.session.create`.
  7.3. Kupony: **brak** w MVP.
  7.4. VAT/NIP/faktura: **ignorujemy w MVP** (copy bez obietnic faktury).
  7.5. **Refund policy (EU/UK/USA/DACH) – standard** _(copy; do przeglądu prawnego)_:
- EU/UK/DACH (consumer): 14-day cooling-off dla subskrypcji **o ile** użytkownik nie wyraził zgody na natychmiastowe rozpoczęcie świadczenia. Jeśli zaczyna od razu (checkbox), prawo odstąpienia wygasa po aktywacji dostępu.
- USA: 7-day goodwill refund (pro-rata jeśli aktywowany dostęp był użyty).
- Procedura: e-mail na support w 7/14 dni; odcięcie dostępu po zwrocie.

# 8. Telemetria (PostHog)

8.1. **Eventy**:

- `chat_view_opened`, `widget_rendered`, `option_selected`, `free_text_entered`,
- `validation_failed`, `profile_field_completed`,
- `outline_generated`, `module_toggled`,
- `checkout_started`, `checkout_completed`.
  8.2. **Props**: `session_id`, `step`, `widget_type`, `time_to_answer_ms`, `profile_hash`, `ab_variant` (zapas).
  8.3. **Feature flags**: wyłączone w MVP (hooki przygotowane).
  8.4. **Session recording**: **ON**.

# 9. Back-Office (ręcznie)

9.1. **Mail do BO – szablon (roboczo):**

- **Subject:** `AITutor | New order | ${email} | ${profileHash}`
- **Body:**

  - Learner: email
  - ProfileHash: XXX
  - Role & Needs (z profilu JSON)
  - Outline: lista modułów (id + title)
  - Plan type: Pro Monthly (USD 20)
  - Notes / negative prefs
  - Preferred time windows (jeśli podane)
    9.2. **SLA** kontaktu: **3 dni** robocze (komunikat w Thank You).
    9.3. Kanał BO: e-mail (bez webhooków).
    9.4. Przypisanie mentora/terminu: **poza MVP** (manual później).

# 10. Dane & bezpieczeństwo

10.1. **PII minimalne**: e-mail dopiero przy checkout; brak nazwisk/telefonów.
10.2. **Retencja**: sesje 30 dni; anonimizacja eventów (hash profilu).
10.3. **Export/erasure (GDPR)**: zgłoszenia ręcznie na e-mail; obsługa do 30 dni.
10.4. **Versioning**: **brak** (MVP bez wersjonowania profilu JSON/planu).

# 11. Legal & polityki (ENG copy)

11.1. **Consent (profiling):**
“I agree that my answers will be used to profile my learning needs **solely** for tailoring my AI training plan. No resale of my data.” _(checkbox before start)_
11.2. **Links (placeholders do podmiany):**

- Privacy Policy: `https://aitutor.example.com/privacy`
- Terms of Service: `https://aitutor.example.com/terms`
- Refunds: `https://aitutor.example.com/refunds`
  11.3. **Cookie banner (analytics-only + necessary):**
  “We use essential cookies and privacy-friendly analytics (PostHog). No ad trackers. [Settings] [Accept]”
  11.4. **Exclusions/compliance:** brak listy w MVP (no admittance rules).

# 12. Dane operacyjne

12.1. **Kanoniczny XML (źródło prawdy)** – pełna definicja profilu:

> **UWAGA**: Profil jest przechowywany jako XML string, NIE jako JSON.
> Pełna dokumentacja struktury XML znajduje się w sekcji 7.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<profile version="1.0">
  <tools>
    <tool tier="Pro" usage="daily">ChatGPT</tool>
    <tool tier="Free" usage="weekly">Claude</tool>
  </tools>
  <role>Marketing Manager</role>
  <seniority>Senior</seniority>
  <experience>5+ years in digital marketing</experience>
  <artifacts>
    <artifact>briefs</artifact>
    <artifact>emails</artifact>
    <artifact>landing pages</artifact>
  </artifacts>
  <goals>
    <goal>Automate content creation</goal>
    <goal>Improve prompt engineering</goal>
  </goals>
  <needs>
    <need category="automation">research &amp; summaries</need>
  </needs>
  <timeCommitment>2h per week</timeCommitment>
  <learningStyle>hands-on</learningStyle>
  <negativePreferences>
    <preference>no video editing</preference>
    <preference>no Python</preference>
  </negativePreferences>
  <skillsSelfReport prompting="3" evaluation="2" contextWindow="1" safety="2" />
  <constraints time_per_week="2h" language="EN" />
</profile>
```

12.2. **skillVerification** (przechowywane osobno w userProfiles, nie w XML):

```json
{
  "performanceScore": 0.62,
  "selfAssessment": 3,
  "level": "Intermediate",
  "feedback": "Clear goal, but missing constraints.",
  "promptText": "...",
  "completedAt": 1700000000000
}
```

12.3. **Metadata rozszerzone**: `session_meta`, `timeline`, `ab_variant` (dla telemetrii).

# 13. API (MVP)

13.1. `POST /session` → `{ session_id }` (tworzy/odtwarza).
13.2. `POST /agent/next` → in: `{ session_id, history[] }`; out: `{ message, widgets[], required_fields[] }`.
13.3. `POST /profile/validate` → in: `{ profile }`; out: `{ complete: bool, missing: [field_path], conflicts: [...] }`.
13.4. `POST /outline/generate` → in: `{ xml }`; out: `{ outline: [ {id,title,tags[]} ] }`.
13.5. `POST /checkout/create` → out: `{ checkout_url }` (Stripe Session z `price_data` USD 20/mo).
13.6. `POST /webhook/stripe` → on `checkout.session.completed` → `order.created` + e-mail do BO.
13.7. `POST /notify/bo` → (opcjonalny trigger ręczny) wysyła maila z szablonu 9.1.

# 14. Orkiestracja LLM (narzędzia)

14.1. `propose_widgets(history, xml_state) -> widgets[]`
14.2. `merge_xml(xml_state, new_answers) -> xml_state`
14.3. `validate_profile(xml_state) -> completeness, conflicts`
14.4. `score_task(prompt_text) -> score[0..1], mini_feedback`
14.5. `gen_outline(xml_state, modules.yaml) -> outline[]`
14.6. Zasady: skipping pytań, dopisywanie `<preferences><negative>` jeśli brak, quick wins x3.

# 15. Ekrany (MVP)

15.1. **Welcome** (copy z pkt 4) + „Let’s start”.
15.2. **Chat** (1 pytanie, widżety inline, undo, autosave).
15.3. **Profile summary** (co wiemy / co pominięto – tekstowo, bez czasu).
15.4. **Plan (Outline)** (lista modułów, przełączniki Include/Exclude, quick wins on top).
15.5. **Checkout** (Stripe redirect).
15.6. **Thank You** („We’ll get back within **3 business days**.”)

# 16. Usprawnienia nieoczywiste (włączone)

16.1. **Kontrast preferencji**: pytamy o „what you don't want" i filtrujemy; zapis w `negativePreferences`.
16.2. **Confidence flag**: rozjazd self-report vs performance → quick win „Ask AI better in 10 minutes”.

# 17. Testy akceptacyjne (MVP)

17.1. Użytkownik kompletuję profil (JSON) bez ręcznej edycji w ≤5 min (p50).
17.2. Performance check zwraca score + mini-feedback.
17.3. Outline generuje się i pozwala na wykluczanie/dodawanie (cena stała).
17.4. Stripe checkout działa (powrót z sukcesem) i przychodzi mail do BO.
17.5. Draft można zapisać (e-mail + magic link) i wrócić do sesji.

---

# PIERWSZY PROMPT DO DISCOVERY

```
SYSTEM: AITutor – Intake Agent (Prototype)

GOAL
- In 3–5 minutes, extract and validate a complete learner profile in CANONICAL XML per definition below.
- Ask ONE question at a time, in English, with minimal friction.
- Simulate UI widgets in plain text (see WIDGET SIMULATION).
- Do NOT invent user data. If you infer, mark with metadata.
- When profile is complete and consistent, hand off (outside this agent) to outline generation.

VOICE & UX
- English only. Friendly, concise, professional. No small talk beyond onboarding.
- Always display exactly ONE question per turn.
- Skip redundant questions if you already have the data (skipping allowed).
- Provide tiny “Why we ask?” tooltips on sensitive items when useful.
- Never reveal chain-of-thought; only output in the OUTPUT CONTRACT format.

CANONICAL XML (source of truth)
The canonical learner profile is stored as a single XML document string (`userProfiles.profileXml`).
The XML contract is versioned in Langfuse prompt `profile-xml-definition-v1`.

Example (illustrative only; the real contract lives in Langfuse):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<profile version="1.0">
  <tools><tool>ChatGPT</tool></tools>
  <role>Marketing Manager</role>
  <seniority>Senior</seniority>
  <artifacts><artifact>briefs</artifact></artifacts>
  <needs><need>automation</need></needs>
  <skillsSelfReport prompting="3" evaluation="2" contextWindow="1" safety="2" />
  <constraints time_per_week="2h" language="EN" />
</profile>
```

COMPLETENESS GATE (MVP)
- Completeness/spójność are decided by the reasoning model based on `profile-xml-definition-v1`.
- The intake action returns `complete: true` only when it considers the XML profile ready for the next step.

VALIDATION & CONSISTENCY
- If self_report is high but performance score < 0.4 (or inverse), flag confidence_gap=true.
- Use soft gating only: warn if adding advanced topics without prerequisites, but allow.
- If any required fields missing, ask immediately with the most efficient widget.

PERFORMANCE CHECK (1-minute style; no visible timer)
- Prompt the user: “Paste the best prompt you’ve used recently for your real work. If needed, add 1–2 lines of context.” (max 3000 chars).
- Score with rubric weights: goal 0.20, context&constraints 0.25, structure&roles 0.20, quality_criteria 0.20, iteration_potential 0.15. Output score ∈ [0,1] rounded to 2 decimals.
- Provide ONE-sentence mini-feedback (e.g., “Clear goal, but missing constraints.”).

HEURISTICS
- Preference contrast: explicitly ask "Tell me what you DON'T want in your training." Persist each in `negativePreferences` array.
- Quick wins: if confidence_gap or early momentum needed, suggest adding "Ask AI better in 10 minutes" to quick wins (outside this agent); here just store the signal in skillVerification metadata like: `hintQuickWin: "ask-better-10"`.

WIDGET SIMULATION (for prototype)
- Render widgets inside the MESSAGE block as plain text lines starting with [WIDGET: ...].
- Types to use:
  • Single-select: [WIDGET: single-select | id=... | label="..." | options: "A","B","C"]
  • Multi-select:  [WIDGET: multi-select  | id=... | label="..." | options: "A","B","C" | max=10]
  • Likert 1–5:    [WIDGET: likert        | id=... | label="..." | left="I don’t know" | right="Confident"]
  • Free-text:     [WIDGET: free-text     | id=... | label="..." | maxChars=280]  (for best-prompt use 3000)

QUESTION ORDER (ONE AT A TIME; SKIP IF KNOWN)
1) Tools you actively use:
   - Ask tier for ChatGPT if selected (Free/Pro/Team/Enterprise) and usage frequency (daily/weekly/monthly).
2) Role & seniority (single-select seniority + free-text title).
3) Artifacts you produce (multi-select chips + optional short free-text).
4) Needs (multi-select categories + short free-text refinement).
5) Negative preferences (free-text, can list with commas; store each as <topic>).
6) Self-report skills (Likert 1–5 for: prompting, evaluation, context_window, safety).
7) Performance check (best prompt + 1–2 lines context; score + mini-feedback).
8) Constraints (time_per_week; language fixed EN).
At each step, validate completeness and ask the next most impactful missing field.

NORMALIZATION
- Do not autocorrect free-text. For options you present, map to canonical values from your options.
- If the user types a free-text that matches an option loosely, keep their literal answer and optionally add `canonicalName` field if helpful.

OUTPUT CONTRACT (EVERY TURN)
Return JSON only:

```json
{
  "message": "English text to the user (one focused question).",
  "widget": { "type": "single-select|multi-select|likert|free-text", "options": ["..."] },
  "profileXml": "<?xml version=\"1.0\"?> ...",
  "complete": false
}
```

EXAMPLE START (FIRST TURN ONLY)
MESSAGE:
Hi! In the next 3–5 minutes I'll learn how you use AI and what you actually need. I'll then assemble a tailored training plan you can edit and buy in one click. We don't sell your data.
[WIDGET: multi-select | id=tools_active | label="Which AI tools do you actively use?" | options:"ChatGPT","Claude","Copilot","Midjourney","DALL·E","Notion AI","Other"]

PROFILE_DELTA:
{}

REQUIRED_FIELDS:
["tools","role","artifacts","needs","skillsSelfReport or skillVerification","constraints"]

COMPLETE:
false

CONFLICTS:
[]

SCORING EXAMPLE (WHEN SCORING BEST PROMPT)
- Score: e.g., 0.62
- Mini-feedback: one short sentence.
- Persist as:
PROFILE_DELTA:
{
  "skillVerification": {
    "taskId": "best-prompt",
    "score": 0.62,
    "rubric": "v2",
    "level": "Intermediate",
    "feedback": "Clear goal, but missing constraints.",
    "hintQuickWin": "ask-better-10"
  }
}

FINALIZATION
- When COMPLETE becomes true and there are no CONFLICTS, summarize what you captured in 2–3 bullet lines (no outline generation here).
- Then stop asking questions.
```

---

# 20) KRYTYCZNE PROBLEMY DO POPRAWIENIA (z audytu 2025-11-26)

## 🔴 CRITICAL (Must-fix przed production)

### C1. Public LLM API bez autentykacji i rate limiting

**Problem:** `generateNextQuestion` w `convex/ai.ts` jest public action dostępny bez autentykacji. Brak rate limitingu prowadzi do potencjalnych kosztów LLM przez abuse.

**Impact:** 🔴 HIGH - Bezpośrednie ryzyko finansowe (eksploatacja przez boty)

**Jak naprawić:**

```typescript
// convex/ai.ts:9
export const generateNextQuestion = action({
  args: { ... },
  handler: async (ctx, args) => {
    // 1. Enforce authentication
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Authentication required');
    }

    // 2. Check rate limit (example: 10 calls per minute per user)
    const now = Date.now();
    const rateLimitWindow = Math.floor(now / 60000); // 1-minute windows
    const rateLimitKey = `llm_rate_${userId}_${rateLimitWindow}`;

    const existing = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', q => q.eq('key', rateLimitKey))
      .unique();

    if (existing && existing.count >= 10) {
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }

    // Update counter
    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert('rateLimits', {
        key: rateLimitKey,
        userId,
        count: 1,
        expiresAt: now + 120000, // 2 minutes TTL
      });
    }

    // 3. Proceed with LLM call
    const result = await runGenerateNextQuestion(ctx, args, llmModel);
    return result;
  },
});
```

**Dodać do schema:**
```typescript
// convex/schema.ts
rateLimits: defineTable({
  key: v.string(),
  userId: v.id('users'),
  count: v.number(),
  expiresAt: v.number(),
}).index('by_key', ['key'])
  .index('by_expires', ['expiresAt']), // For cleanup cron
```

**Effort:** 2-3h | **Priority:** P0

---

### C2. Unbounded chatHistory growth

**Problem:** `chatHistory` w `userProfiles` nie ma limitu długości. Convex ma limit 1MB na dokument → potencjalne DoS.

**Impact:** 🔴 HIGH - Aplikacja może przestać działać przy długich sesjach

**Jak naprawić:**

```typescript
// convex/profiles.ts:82
export const createOrUpdateProfile = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const MAX_HISTORY_LENGTH = 200; // Keep last 200 messages

    // Trim chatHistory before storing
    const trimmedHistory = args.chatHistory
      ? args.chatHistory.slice(-MAX_HISTORY_LENGTH)
      : [];

    const existingProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        currentStep: args.step,
        chatHistory: trimmedHistory, // ← Use trimmed version
        // ... rest of updates
      });
      return existingProfile._id;
    }
    // ... rest of logic
  },
});
```

**Optional: Dodaj warning w UI gdy blisko limitu:**
```typescript
// src/components/steps/ChatStep.tsx
useEffect(() => {
  if (chatHistory.length > 180) {
    toast.warning('Chat history is getting long. Consider completing your profile soon.');
  }
}, [chatHistory.length]);
```

**Effort:** 1h | **Priority:** P0

---

### C3. Brak walidacji Stripe webhook signature

**Problem:** Gdy Stripe webhook zostanie zaimplementowany, musi weryfikować signature. Brak weryfikacji = możliwość fałszywych płatności.

**Impact:** 🔴 CRITICAL - Ryzyko finansowe (fake payments)

**Jak naprawić:**

```typescript
// convex/http.ts (lub convex/router.ts)
import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import Stripe from 'stripe';

const http = httpRouter();

http.route({
  path: '/webhook/stripe',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    try {
      // CRITICAL: Verify webhook signature
      event = stripe.webhooks.constructEvent(
        body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed.', err);
      return new Response('Webhook Error: Invalid signature', { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Update profile payment status
      await ctx.runMutation(internal.profiles.updatePaymentStatusInternal, {
        stripeSessionId: session.id,
        status: 'completed',
        email: session.customer_email || '',
      });

      // Send email to back-office
      // ... (implement email sending)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }),
});

export default http;
```

**Environment variables wymagane:**
- `STRIPE_SECRET_KEY` (Convex env)
- `STRIPE_WEBHOOK_SECRET` (get from Stripe Dashboard → Webhooks)

**Testing:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:3000/webhook/stripe

# Test webhook
stripe trigger checkout.session.completed
```

**Effort:** 3-4h | **Priority:** P0 (before payment launch)

---

## 🟡 IMPORTANT (Should-fix przed MVP)

### I1. Implementacja Stripe Checkout

**Problem:** `convex/payments.ts` istnieje ale Stripe Checkout nie jest w pełni zaimplementowany.

**Impact:** 🟡 HIGH - Payment flow nie działa

**Jak naprawić:**

```typescript
// convex/payments.ts
import { action } from './_generated/server';
import { v } from 'convex/values';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export const createCheckoutSession = action({
  args: {
    planOutline: v.string(), // JSON string
    email: v.optional(v.string()),
  },
  returns: v.object({
    url: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AITutor Pro',
              description: 'Personalized AI training program (monthly access)',
            },
            unit_amount: 2000, // $20.00 in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: args.email,
      metadata: {
        userId,
        planOutline: args.planOutline.slice(0, 500), // Stripe metadata limit
      },
      success_url: `${process.env.SITE_URL}/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/plan`,
    });

    // Update profile with pending payment
    await ctx.runMutation(internal.profiles.updatePaymentStatusInternal, {
      stripeSessionId: session.id,
      status: 'pending',
    });

    return {
      url: session.url!,
      sessionId: session.id,
    };
  },
});
```

**Frontend integration:**
```typescript
// src/components/steps/PaymentStep.tsx
const handleCheckout = async () => {
  try {
    const result = await createCheckoutSession({
      planOutline: JSON.stringify(profile.planOutline),
      email: userEmail,
    });

    // Redirect to Stripe Checkout
    window.location.href = result.url;
  } catch (error) {
    toast.error('Failed to create checkout session');
  }
};
```

**Effort:** 6h | **Priority:** P1

---

### I2. Kompletna integracja PostHog

**Problem:** PostHog jest w kodzie ale nie jest inicjalizowany. Większość eventów nie jest tracked.

**Impact:** 🟡 MEDIUM - Brak telemetrii = brak danych do optymalizacji

**Jak naprawić:**

```typescript
// src/main.tsx
import posthog from 'posthog-js';

// Initialize PostHog
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
  });
}

// ... rest of main.tsx
```

**Add missing events:**
```typescript
// src/components/steps/PlanStep.tsx
const handleRegeneratePlan = async () => {
  telemetry.track('plan_regenerated', {
    session_id: telemetry.getSessionId(),
    profile_hash: telemetry.generateProfileHash(profile.profileXml),
  });
  // ... regeneration logic
};

// src/components/steps/PaymentStep.tsx
const handleCheckout = async () => {
  telemetry.track('checkout_started', {
    session_id: telemetry.getSessionId(),
    plan_price: 20,
    currency: 'USD',
  });
  // ... checkout logic
};
```

**Environment variables:**
```bash
# .env.local
VITE_POSTHOG_KEY=phc_your_project_key_here
VITE_POSTHOG_HOST=https://app.posthog.com
```

**Effort:** 3h | **Priority:** P1

---

### I3. Sanityzacja PII w telemetrii

**Problem:** `telemetry.track()` forwarduje surowe props do PostHog. Ryzyko wycieku PII (email, prompt content).

**Impact:** 🟡 MEDIUM - GDPR/privacy risk

**Jak naprawić:**

```typescript
// src/lib/telemetry.ts
const PII_FIELDS = ['email', 'promptText', 'content', 'name', 'customerEmail'];

function sanitizeProperties(props: Record<string, any>): Record<string, any> {
  const sanitized = { ...props };

  for (const field of PII_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeProperties(sanitized[key]);
    }
  }

  return sanitized;
}

export function track(event: string, properties?: Record<string, any>) {
  if (!posthog) return;

  const sanitized = sanitizeProperties(properties || {});
  posthog.capture(event, sanitized);
}
```

**Effort:** 2h | **Priority:** P1

---

### I4. Structured error responses

**Problem:** Mutations rzucają generic errors. Frontend nie może dobrze obsługiwać błędów.

**Impact:** 🟡 MEDIUM - Poor UX przy błędach

**Jak naprawić:**

```typescript
// convex/lib/errors.ts
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorCode; message: string };

export enum ErrorCode {
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  LLM_ERROR = 'LLM_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

// convex/profiles.ts
export const updateProfile = mutation({
  args: { ... },
  returns: v.union(
    v.object({ success: v.literal(true), data: v.id('userProfiles') }),
    v.object({
      success: v.literal(false),
      error: v.string(),
      message: v.string()
    })
  ),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        return {
          success: false,
          error: ErrorCode.NOT_AUTHENTICATED,
          message: 'You must be logged in to update your profile',
        };
      }

      // ... logic

      return { success: true, data: profileId };
    } catch (error) {
      console.error('updateProfile failed', error);
      return {
        success: false,
        error: ErrorCode.DATABASE_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
```

**Frontend handling:**
```typescript
// src/components/steps/ChatStep.tsx
const result = await updateProfile({ ... });

if (!result.success) {
  switch (result.error) {
    case 'NOT_AUTHENTICATED':
      toast.error('Please log in again');
      break;
    case 'RATE_LIMIT_EXCEEDED':
      toast.error('Too many requests. Please wait a moment.');
      break;
    default:
      toast.error(result.message);
  }
  return;
}

// Success
toast.success('Profile updated');
```

**Effort:** 4h | **Priority:** P2

---

## Podsumowanie Priorytetów

| ID | Problem | Priority | Effort | Deadline |
|----|---------|----------|--------|----------|
| C1 | Public LLM API bez auth/rate limit | P0 🔴 | 2-3h | Week 1 |
| C2 | Unbounded chatHistory | P0 🔴 | 1h | Week 1 |
| C3 | Stripe webhook validation | P0 🔴 | 3-4h | Before payment launch |
| I1 | Stripe Checkout implementation | P1 🟡 | 6h | Week 2 |
| I2 | PostHog integration | P1 🟡 | 3h | Week 2 |
| I3 | PII sanitization | P1 🟡 | 2h | Week 2 |
| I4 | Structured errors | P2 🟡 | 4h | Week 3 |

**Total effort:** ~21-24h developer time

**Critical path:** C1 → C2 → I1 → C3 (muszą być w tej kolejności)

---

**Data audytu:** 2025-11-26
**Następny review:** Po implementacji C1-C3 (za ~1 tydzień)

---

# 21) Bezpieczeństwo i Role (dodane 2026-01-06)

## 21.1 System ról

Używamy Clerk JWT custom claims do zarządzania rolami. Obecnie jedyna rola: `admin`.

**Konfiguracja w Clerku:**
1. JWT Templates → edytuj template "convex"
2. Dodaj custom claim: `"isAdmin": "{{user.public_metadata.isAdmin}}"`
3. Dla adminów ustaw `publicMetadata.isAdmin = true` w Users

**Implementacja:**
- `convex/lib/roles.ts` - helpery: `hasRole`, `isAdmin`, `assertRole`, `assertAdmin`
- `api.auth.isAdmin` - query dla frontendu do sprawdzenia statusu admina

## 21.2 Macierz dostępu do API

| Endpoint | Niezalogowany | Zalogowany | Admin |
|----------|---------------|------------|-------|
| `config.get` | ❌ | ✅ | ✅ |
| `config.list` | ❌ | ❌ | ✅ |
| `config.set` | ❌ | ❌ | ✅ |
| `llmLogs.*` | ❌ | ❌ | ✅ |
| `ai.debugListPrompts` | ❌ | ❌ | ✅ |
| `auth.isAdmin` | ❌ | ✅ | ✅ |
| `exercises.*` | ❌ | ✅ | ✅ |
| `profiles.deleteAccount` | ❌ | ✅ (tylko siebie) | ✅ |

## 21.3 Decyzje architektoniczne

1. **`config.get` publiczne dla zalogowanych** - używane przez frontend i backend do pobierania LLM_MODEL_GLOBAL. Nie ma tam sekretów.

2. **`auth.isAdmin` dostępne dla zalogowanych** - każdy zalogowany user wie czy jest adminem. Minimalne ryzyko, potrzebne dla frontendu.

3. **Admin może widzieć logi innych userów** - feature dla debugowania. `getLlmLogs` przyjmuje opcjonalny `clerkUserId` parametr.

4. **CORS wildcard** - oznaczone `@security` TODO w `streaming.ts`. Do zabezpieczenia przed produkcją.

5. **deleteAccount** - user może skasować tylko siebie (używa `identity.subject`).
