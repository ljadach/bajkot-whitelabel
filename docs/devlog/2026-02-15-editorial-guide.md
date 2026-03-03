# 2026-02-15 — Editorial style guide injection do promptów

## Co zrobione

Wstrzyknięcie skondensowanego editorial style guide (`docs/editorial_style_guide.md`) do wszystkich system promptów generujących treści edukacyjne.

Nowy plik `convex/lib/editorialGuide.ts` — stała `EDITORIAL_STYLE_GUIDE` (skrócona wersja guide'a zoptymalizowana pod tokeny LLM) + `EDITORIAL_GUIDE_SECTION` (z headerem sekcji).

Dwa wzorce injekcji:
- **Template-based** (handbook, playbook, exercise): placeholder `{{EDITORIAL_GUIDE}}` w fallback templates + Zod schema z `.default('')` żeby Langfuse prompty bez placeholdera nie crashowały.
- **Inline** (exploration chapters w instrumentAi.ts): string concatenation do 3 faz (sketch/expanded/full).

Langfuse: wszystkie 5 system promptów zaktualizowane do nowych wersji z `{{EDITORIAL_GUIDE}}` (handbook-system v5, handbook-system-video-enhanced v4, playbook-system v16, playbook-system-video-enhanced v4, exercise-generation-system v4).

## Notatki techniczne

Celowo NIE targetowane: intake, scoring, assessment, fluency inference, quick tip, contrapositor, probes, concept radar, skeleton key, tomorrow tasks — bo to nie są learner-facing treści edukacyjne, tylko krótkie strukturyzowane outputy.

Code-simplifier słusznie zamienił `editorialGuideSection()` na stałą `EDITORIAL_GUIDE_SECTION` — funkcja bez argumentów to const.
