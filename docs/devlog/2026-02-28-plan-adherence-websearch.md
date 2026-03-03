# 2026-02-28 — Plan adherence + web search fix

## Kontekst

Quality audit usera z profilem CTO/5-5 ujawnił dwa niezależne problemy w pipeline generacji handbooków.

## Problem 1: Plan outline ignorowany (score 4/10)

Handbook'i dryfowały od plan outline. Dwa tematy z 6 zostały podmienione:
- "Orkiestracja Multi-Agentowa" → zamienione na "Precyzyjne Instrukcje Systemowe"
- "Automatyzacja z Claude Code" → zamienione na "Integracja z Narzędziami"

Dwa dodatkowe tematy pojawiły się spoza planu. LLM dokonywał edytorskich wyborów.

### Root cause

Prompt traktował plan jako kontekst, nie constraint. Jedyna linia o planie w system prompcie:
```
Keep content focused on the specific course page topic
```

To sugestia, nie zakaz. User prompt używał labeli "COURSE PAGE (from outline)" i "DETAILED PAGE GUIDANCE" — brzmią jak materiał referencyjny, nie binding spec. Przy ~40 liniach o personalizacji i 1 linii o planie, LLM over-indexował na "stwórz najlepszy content" kosztem trzymania się tematu.

Pipeline w `courseAi.ts` jest OK — dane `outline[i]` i `fullPlan[i]` docierają per-page. Problem czysto promptowy.

### Fix

Dodano sekcję `PLAN ADHERENCE (mandatory — highest priority)` do obu system promptów (non-video i video-enhanced):
- "You MUST write about exactly this topic"
- "Do NOT rename, substitute, merge, or reinterpret"
- "Topic selection was already decided in the planning phase"

Zmieniono labele w user promptach z informacyjnych na imperatywne:
- `COURSE PAGE (from outline)` → `ASSIGNED TOPIC (you MUST write about this exact topic)`
- `DETAILED PAGE GUIDANCE` → `REQUIRED COVERAGE (address every block)`

## Problem 2: Web search skonfigurowany, ale nieaktywny

`pipelineConfig.ts` miał `webSearch: { enabled: true, maxResults: 3 }` dla stage `handbook` i `playbook`. Ale `chatJsonForStage` wywoływał `resolveModel()` zamiast `resolveModelWithSearch()`. Suffix `:online` nigdy nie był dodawany. Konfiguracja martwa.

Jedyny stage z faktycznym web search to `quickTip`, który używał osobnej funkcji `chatJsonForStageWithSources`.

### Fix

- `chatJsonForStage` → `resolveModelWithSearch` zamiast `resolveModel`
- Dodano extraction sources z odpowiedzi OpenRouter `:online` w `chatJsonWithRetries`
- Nowe pola w `llmLogs`: `webSearchUsed`, `webSearchSources` — widoczne w admin debug panel

## Obserwacje

Oba problemy mają ten sam wzorzec: config/intencja jest poprawna, ale warstwa wykonawcza (prompt / kod) nie respektuje. Warto po każdej zmianie w `pipelineConfig` weryfikować, czy stage faktycznie używa skonfigurowanych opcji.

Quality audit jako narzędzie diagnostyczne sprawdza się dobrze — ujawnia problemy, których nie widać w testach jednostkowych (bo te sprawdzają czy JSON się parsuje, nie czy content pasuje do planu).
