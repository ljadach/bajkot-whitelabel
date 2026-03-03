# Audyt pipeline generowania podręczników vs obietnice na stronach statycznych

Data: 28 lutego 2026  
Branch: `audit/pipeline-handbook-vs-static-promises`

## 1) Co obiecujemy na stronach statycznych

Najmocniejsze obietnice produktowe:

1. Personalizacja pod rolę, narzędzia i poziom użytkownika (`src/locales/pl/app.json:4`, `src/locales/pl/app.json:66`, `src/locales/pl/faq.json:50`, `src/locales/pl/faq.json:60`).
2. Aktualna wiedza, „na bieżąco” (`src/locales/pl/app.json:58`, `src/locales/pl/app.json:60`, `src/locales/pl/app.json:63`).
3. Adaptacyjne moduły i realna użyteczność, nie generyczny kurs (`src/locales/pl/app.json:88`, `src/locales/pl/pricing.json:31`).
4. Jakość i spójność treści (pośrednio: „esencja”, „zero generycznych rad”) (`src/locales/pl/app.json:39`, `src/locales/pl/app.json:50`).
5. Pozycjonowanie jako najlepsza opcja przez skuteczność i dopasowanie (claimy o oszczędności czasu i dopasowaniu w wielu stronach segmentowych).

## 2) Jak działa pipeline dzisiaj (stan faktyczny)

Sekwencja:

1. Intake + profil (`convex/lib/prompts.ts`, prompty intake).
2. Weryfikacja umiejętności + inferencja fluency.
3. Assessment.
4. Playbook (outline + fullPlan) (`convex/ai.ts:256-311`).
5. Start course generation; tworzenie dokumentów modułów (`convex/courseAi.ts:193-280`).
6. Per-moduł handbook (z opcjonalnym video path) (`convex/courseAi.ts:55-99`).
7. Ćwiczenia tylko jeśli config `AUTO_GENERATE_EXERCISES=true` (`convex/courseAi.ts:155-177`, domyślnie `false` w `convex/lib/config.ts:22-25`).

Ważne technicznie:

- Web search dla playbook/handbook jest włączony (`convex/lib/pipelineConfig.ts:57-58`), ale pipeline nie wymusza cytowań ani walidacji recency.
- Style guide jest wstrzykiwany do promptów (`convex/lib/editorialGuide.ts:47`), ale bez twardego post-checku.
- Walidacja odpowiedzi LLM jest syntaktyczna (JSON parse), bez walidacji domenowej kształtu outputu (`convex/lib/llmClient.ts:124-134`).
- Fallback playbook ma 5 stron, podczas gdy system oczekuje 6 (`convex/ai.ts:317-351` vs `convex/courseAi.ts:244-246`).

## 3) Ocena wg 5 kluczowych celów

## 3.1 Moduły dopasowane do użytkownika (preferencje)

Co działa:

- Prompty handbooków mają sekcję personalizacji i plan adherence (`convex/lib/prompts.ts:347-407`, `convex/lib/prompts.ts:473-500`).
- Profil i assessment są przekazywane do handbooka (`convex/lib/prompts.ts:415-425`, `convex/lib/prompts.ts:539-546`).

Luki:

- Brak twardych reguł odrzutu, gdy wynik nie odzwierciedla `negativePreferences`, narzędzi z profilu albo constraints czasu.
- Brak walidacji „plan->handbook title exact match” po generacji.
- Profil do preselekcji video jest ucinany do 800 znaków (`convex/lib/corpusPreselection.ts:49`, `convex/lib/corpusPreselection.ts:176`), co osłabia dopasowanie.

Dowód jakości:

- Raport jakości wskazuje drift tematów względem planu i pominięcia kluczowych potrzeb (`docs/quality-reports/2026-02-28-Qi31lC-v2.md:35-40`).

## 3.2 Moduły zawierają poprawną i nową wiedzę

Co działa:

- Stage handbook/playbook korzystają z modelu online (`:online`) przez config (`convex/lib/pipelineConfig.ts:57-58`, `convex/lib/pipelineConfig.ts:107-112`).

Luki:

- Brak wymogu źródeł i dat przy twierdzeniach „bieżących”.
- Brak quality gate, który wykrywa „stare lub niezweryfikowane” fakty przed zapisem.
- Brak jawnego kontraktu „source pack” w output JSON.

## 3.3 Wideo tam, gdzie się da (na bazie korpusu)

Co działa:

- Video-enhanced path istnieje i ma reguły embedów (`convex/courseAi.ts:55-77`, `convex/lib/prompts.ts:502-520`).
- Preselekcja filtruje bardzo krótkie klipy i duplikaty overlap (`convex/lib/corpusPreselection.ts:51-93`).

Luki:

- Minimalny klip to 5s, a w praktyce jakość dalej jest słaba dla części use-case.
- Brak deduplikacji na poziomie całego kursu (cross-handbook).
- Brak twardego tool-matching (np. user = Copilot/Claude, a klipy = Gemini).
- Dla małych korpusów preselection jest pomijane i zwracany jest pełny corpus (`convex/lib/corpusPreselection.ts:120-124`), co może osłabiać precyzję doboru.

Dowód jakości:

- Raport jakości: tylko 2 źródła video, wiele klipów 0.6-2.4s, duplikaty i niedopasowanie do narzędzi usera (`docs/quality-reports/2026-02-28-Qi31lC-v2.md:44-57`).

## 3.4 Moduły zgodne ze style guidelines

Co działa:

- Source of truth style guide istnieje (`docs/editorial_style_guide.md:24-35`, `docs/editorial_style_guide.md:41-45`).
- Skrócony guide jest osadzany w promptach (`convex/lib/editorialGuide.ts:6-41`).

Luki:

- Brak automatycznej walidacji post-generation: długość akapitów, zakazane frazy, gęstość template’ów promptów.
- Brak gate’u „hard fail” dla naruszeń stylu.

Dowód jakości:

- Raport jakości pokazuje formuły powtarzalne i problemy z gęstością dobrych template’ów promptów (`docs/quality-reports/2026-02-28-Qi31lC-v2.md:61-67`, `docs/quality-reports/2026-02-28-Qi31lC-v2.md:91-95`).

## 3.5 „Przydatne i najlepsze na rynku”

Co działa:

- Architektura ma telemetry + logi + quality reports.

Luki:

- Brak spójnego scorecardu release-gate dla jakości kursu (personalizacja, recency, video match, style compliance, completion).
- Brak twardych progów jakości przed publikacją modułu.
- Ćwiczenia (które podnoszą użyteczność) nie są gwarantowane przy default config (`convex/lib/config.ts:22-25`).

## 4) Co poprawić: proces, kolejność, prompty

## 4.1 Nowa kolejność pipeline (proponowana)

1. Intake + verification + assessment.
2. Playbook generation.
3. **Plan QA gate**:
   - dokładnie 6 modułów,
   - title exact-match w outline/fullPlan,
   - brak tematów z `negativePreferences`.
4. Course-level video allocation (raz na kurs, nie per-handbook).
5. Handbook generation per moduł (z przypisanymi segmentami video).
6. **Handbook QA gate**:
   - plan adherence,
   - personalizacja (tools/role/constraints),
   - style lint,
   - freshness lint (dla twierdzeń czasowo wrażliwych).
7. Auto-repair prompt tylko dla failed checks.
8. Exercise generation obowiązkowo.
9. Exercise QA gate.
10. Publikacja modułu dopiero po przejściu gate’ów.

## 4.2 Zmiany w promptach (konkret)

Playbook (`playbook-system` / `playbook-user`):

- Dodać kontrakt `coverage_map`: dla każdej strony `page` -> `goal_id`, `tool_targets`, `excluded_topics_checked`.
- Dodać twardą instrukcję: „Nie wolno tworzyć strony bez mapowania do needs/goals z profilu”.
- Dodać explicit handling `negativePreferences` jako twarde ograniczenie.

Handbook (`handbook-system*` / `handbook-user*`):

- Dodać wymóg:
  - minimum 1 odniesienie do `ASSESSMENT_SUMMARY` per handbook,
  - minimum 1 pełny template promptu z `{{PLACEHOLDER}}`,
  - przy skill 5/5: „no definitions, only edge cases/nuance”.
- Dodać output metadata:
  - `plan_alignment`: `{outline_title_match: boolean, covered_blocks: string[]}`,
  - `assessment_refs`: `string[]`,
  - `tools_used`: `string[]`.

Video prompts:

- Wymusić `segment_duration >= 10s`.
- Wymusić `tool_match_score` (zgodność segmentu z toolset użytkownika).
- Zakazać reuse tego samego segmentu w >1 handbooku tego samego kursu.

Freshness prompts:

- Dodać sekcję „RECENCY RULES”:
  - dla twierdzeń o funkcjach/modelach/cenach: min 2 źródła,
  - przynajmniej jedno źródło oficjalne vendor docs.
- Wymagać daty źródła w output metadata.

## 4.3 Zmiany w walidacji i danych

1. Wprowadzić Zod walidację domenową dla playbook/handbook/exercise payload.
2. Dodać `course_quality_checks` table (wyniki gate’ów).
3. Dodać `source_citations` do handbook metadata.
4. Zmienić fallback playbook na 6 stron (obecnie 5).
5. Ustawić `AUTO_GENERATE_EXERCISES=true` jako domyślny w środowiskach produkcyjnych.

## 5) Priorytety wdrożenia

P0 (1-3 dni):

1. Naprawić fallback playbook 5→6.
2. Włączyć i egzekwować walidację plan-title alignment.
3. Podnieść min duration klipu i dodać cross-handbook dedup.
4. Naprawić stale dependencies w `CoursePreviewStep` callbackach (`src/components/steps/CoursePreviewStep.tsx:50-60`, `src/components/steps/CoursePreviewStep.tsx:69-78`).

P1 (1-2 tygodnie):

1. Wdrożyć pełny QA gate po handbook generation.
2. Dodać source citations + freshness lint.
3. Wymusić template density i assessment reference w promptach.

P2 (2-4 tygodnie):

1. Course-level video allocator (optymalizacja pod różnorodność i tool-match).
2. Scorecard „best-on-market” z porównaniem do baseline (czas do wartości, completion, quality score, retention).

## 6) KPI, które powinny blokować release

1. Plan adherence pass rate >= 95%.
2. Personalization precision (tools/role/constraints) >= 90%.
3. Freshness compliance (claims with sources+date) >= 95%.
4. Video relevance score >= 85% i duplicate segment rate <= 5%.
5. Style compliance score >= 90%.
6. Exercise coverage = 100% (3/3 chapters per module).

## 7) Wniosek

Obecna architektura ma dobry fundament (prompty, web-search, video path, style injection), ale brakuje twardych gate’ów jakości i walidacji kontraktów outputu. Największa dźwignia jakości to:

1. plan/content backbone enforcement,
2. video pipeline z realnym tool-matching i dedup,
3. freshness + source governance,
4. automatyczny style+quality gate przed publikacją.
