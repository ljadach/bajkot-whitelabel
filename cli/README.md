# bajkot CLI

Narzędzie CLI do testowania pipeline'u bajkot. Opakowuje `npx convex run` — wymaga `npx convex dev` w osobnym terminalu.

## Setup

```bash
npm run dev:backend   # terminal 1 — Convex dev server
npm run cli -- <cmd>  # terminal 2 — CLI
```

Alternatywnie:

```bash
npx tsx cli/index.ts <cmd>
```

## Komendy

### `order` — Zlecenie nowej książki

Tworzy order i startuje pipeline. Domyślnie: pre-selected style A, skipped QA (szybki tryb).

```bash
# Minimum — imię wystarczy, reszta ma sensowne defaulty
npm run cli -- order -n Zosia

# Pełne opcje
npm run cli -- order \
  -n Zosia \
  -a 6-8 \
  -g girl \
  -p fear_of_dark \
  --detail "Boi się spać sama, potrzebuje lampki" \
  --toy "pluszowy miś" \
  --hair-color braz \
  --hair-style dlugie_krecone \
  --eye-color zielone \
  --skin-tone jasna \
  --outfit sukienka_motyle \
  -s A

# Z watchem — śledzi progress do zakończenia
npm run cli -- order -n Zosia -w

# Z pełnym QA (wolniejsze, ale jak produkcja)
npm run cli -- order -n Zosia --no-skip-qa
```

### `status` — Stan kolejki

```bash
npm run cli -- status              # stats + ostatnie 20 orderów
npm run cli -- status -l 5         # top 5
npm run cli -- status -s failed    # tylko failed
npm run cli -- status -s completed
```

### `detail` — Szczegóły orderu

```bash
npm run cli -- detail <orderId>              # podsumowanie + artefakty
npm run cli -- detail <orderId> --artifacts  # + surowe JSON artefaktów
```

### `events` — Timeline pipeline'u

Pokazuje narratywną oś czasu z deltami czasowymi.

```bash
npm run cli -- events <orderId>
```

### `logs` — Logi LLM

```bash
npm run cli -- logs                    # logi cli-user (domyślne)
npm run cli -- logs -u <clerkUserId>   # logi konkretnego usera
npm run cli -- logs -l 5               # ostatnie 5
npm run cli -- logs --full             # z promptami i odpowiedziami
```

### `download` — Pobierz PDF

```bash
npm run cli -- download <orderId>        # wypisuje URL
npm run cli -- download <orderId> -o     # otwiera w przeglądarce
```

### `watch` — Śledź progress

Polluje co 5 sekund, kończy na `completed`/`failed`/`paused`/`style_vote`.

```bash
npm run cli -- watch <orderId>
```

### `presets` — Dostępne wartości

Wypisuje wszystkie dopuszczalne klucze dla pól orderu.

```bash
npm run cli -- presets
```

## Architektura

```
cli/index.ts          → Commander CLI, wywołuje npx convex run
convex/cli.ts         → Internal functions (bez auth), wrapper na pipeline
```

CLI nie potrzebuje żadnych tokenów ani konfiguracji. Działa z lokalnym `convex dev`.

Ordery tworzone przez CLI mają `clerkUserId: "cli-user"` i domyślnie `skipQaReviews: true` + `chosenStyle: "A"` (pomija style vote i QA reviews dla szybszego testowania).

## Typowy workflow testowy

```bash
# 1. Stwórz order i obserwuj
npm run cli -- order -n Zosia -w

# 2. Jak się skończy — sprawdź detale
npm run cli -- detail <orderId>

# 3. Sprawdź logi LLM
npm run cli -- logs --full

# 4. Pobierz PDF
npm run cli -- download <orderId> -o
```
