# bajkot-pipeline

Port pipeline'u generowania spersonalizowanych ksiazek (trustee-book-pipeline) do frameworka bajkot (Convex + React + Vite).

## Cel projektu

Zintegrowanie pipeline'u generowania spersonalizowanych materialow szkoleniowych z istniejaca platforma Bajkot. Pipeline przyjmuje zamowienie (profil ucznia, preferencje), przetwarza je przez lancuch agentow LLM (planowanie, pisanie rozdzialow, generowanie ilustracji, korekta), i produkuje gotowy dokument.

Zrodlo: `trustee-book-pipeline` — pipeline oparty na agentach LLM z promptami w Markdown.
Cel: natywna implementacja w Convex (actions, mutations, queries) z frontendem React.

## Zespol

| Agent                   | Rola                                                                | Fala         |
| ----------------------- | ------------------------------------------------------------------- | ------------ |
| **team-lead**           | Koordynacja agentow, zarzadzanie zaleznosci miedzy taskami, decyzje | caly projekt |
| **researcher-pipeline** | Analiza kodu zrodlowego trustee-book-pipeline                       | 1            |
| **researcher-bajkot**   | Analiza wzorcow i konwencji bajkot/Convex                           | 1            |
| **documentalist**       | Dokumentacja decyzji, workflow, retrospektywa                       | 1, 5         |
| **architect**           | Projekt architektury integracji na bazie researchu                  | 2            |
| **schema-builder**      | Implementacja zmian w schemacie Convex                              | 3            |
| **prompt-porter**       | Port 14 plikow promptow z Markdown do TypeScript                    | 3            |
| **frontend-builder**    | Formularz zamowienia, strona progresu, strona wynikow               | 3            |
| **pipeline-builder**    | Implementacja akcji Convex — agenci + orkiestrator                  | 4            |
| **verifier**            | Weryfikacja kompilacji i integracji                                 | 5            |

## Workflow — fale

Praca podzielona na 5 fal. Kazda fala konczy sie przed rozpoczeciem nastepnej (z wyjatkiem rownoleglosci wewnatrz fali).

### Fala 1: Research (rownolegle)

- `researcher-pipeline` — analiza kodu zrodlowego pipeline'u
- `researcher-bajkot` — analiza konwencji i wzorcow bajkot
- `documentalist` — struktura dokumentacji, opis zespolu

### Fala 2: Architektura

- `architect` — projekt integracji na bazie wynikow researchu obu badaczy

### Fala 3: Implementacja (rownolegle)

- `schema-builder` — schemat Convex (tabele, indeksy, walidatory)
- `prompt-porter` — prompty z Markdown do TypeScript
- `frontend-builder` — UI (formularz, progress, wyniki)

### Fala 4: Pipeline

- `pipeline-builder` — akcje Convex dla wszystkich agentow + orkiestrator

### Fala 5: Weryfikacja + dokumentacja koncowa

- `verifier` — kompilacja, sprawdzenie integracji
- `documentalist` — retrospektywa, uzupelnienie decision-log

## Osia czasu

| Data       | Wydarzenie                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| 2026-03-04 | Start projektu. Fala 1 — research + dokumentacja                           |
| 2026-03-04 | Fala 2 — architektura: `architecture.md` (898 linii)                       |
| 2026-03-04 | Fala 3 — implementacja: schemat, prompty, frontend (rownolegle)            |
| 2026-03-04 | Fala 4 — pipeline: `bookAgents.ts`, `bookComposer.ts`, `geminiImageGen.ts` |
| 2026-03-04 | Fala 5 — weryfikacja + finalna dokumentacja                                |

## Pliki w tym katalogu

- `README.md` — ten plik, przeglad projektu
- `architecture.md` — architektura integracji (schemat, agenci, flow, frontend)
- `decision-log.md` — log decyzji architektonicznych i technologicznych (14 decyzji)
- `team-retrospective.md` — retrospektywa zespolu
