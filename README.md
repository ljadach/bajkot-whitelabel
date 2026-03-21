# Bajkot — Personalized Therapeutic Storybooks

Bajkot generates personalized illustrated therapeutic stories for children. Parents describe their child's challenges, and the platform creates a custom story with therapeutic elements — delivered as a beautiful PDF.

Built with [Convex](https://convex.dev) (backend) and React + Vite (frontend).

Connected to Convex deployment [`accomplished-schnauzer-177`](https://dashboard.convex.dev/d/accomplished-schnauzer-177).

## Quick start

```bash
npm install
npm run dev        # Start frontend + backend
```

`npm install` automatycznie ustawia git hooks (`prepare` script). Zero dodatkowej konfiguracji.

## Project structure

- `src/` — Frontend (React, React Router v7, Tailwind CSS)
- `convex/` — Backend (Convex functions, schema, pipeline agents)
- `docs/` — Documentation and devlog

## Commands

```bash
npm run dev              # Full stack dev server
npm run build            # Production build
npm run lint             # Type-check + schema validation + build
npm run format           # Prettier na całym repo
npm run check:dead-code  # Knip — znajdź nieużywany kod
npm run analyze          # Sonda — analiza bundle size
npm run deploy:staging   # Deploy na staging
```

## Developer tooling

Cały DX tooling działa automatycznie — nie musisz nic konfigurować poza `npm install`.

### Git hooks (pre-commit)

Każdy commit automatycznie odpala:

| Pliki                      | Co robi                                |
| -------------------------- | -------------------------------------- |
| `src/**/*.{ts,tsx}`        | Prettier + ESLint (`--max-warnings=0`) |
| `convex/**/*.ts`           | Prettier                               |
| `*.{json,md,css,yml,yaml}` | Prettier                               |

**Dlaczego:** Żaden brzydki ani zepsuty kod nie trafia do repo. Nie musisz pamiętać o formatowaniu — hook robi to za ciebie. ESLint z `--max-warnings=0` oznacza zero tolerancji dla warningów — albo napraw, albo nie commitniesz.

Stack: `simple-git-hooks` + `lint-staged`. Lekkie, zero dependencji runtime.

### CI (GitHub Actions)

Każdy push na `main` i każdy PR odpala:

1. TypeScript — osobno convex i frontend
2. ESLint
3. Build produkcyjny

**Dlaczego:** Łapie rzeczy, które hook nie złapie (np. typy zepsute przez zmiany w innym pliku). Jeśli CI jest zielone, merge jest bezpieczny.

### Knip — dead code detection

```bash
npm run check:dead-code
```

Skanuje repo i znajduje: nieużywane pliki, nieużywane exporty, nieużywane dependencje.

**Dlaczego:** Codebase rośnie — Knip mówi ci co możesz bezpiecznie usunąć. Uruchamiaj po większych refaktorach żeby nie zostawiać śmieci.

### Sonda — bundle analysis

```bash
npm run analyze
```

Buduje produkcyjny build i otwiera interaktywną wizualizację bundle'a — widać co ile waży, które dependencje są największe.

**Dlaczego:** Kiedy strona ładuje się wolno, Sonda pokaże ci co zjada kilobajty. Uruchamiaj przed i po dodaniu nowej dependencji.

### Prettier + EditorConfig

Prettier config: `printWidth: 100`, `singleQuote: true`, `trailingComma: all`.

`.editorconfig` ustawia: UTF-8, LF, 2 spacje, trim trailing whitespace. Działa w każdym edytorze (VS Code, Cursor, JetBrains) bez pluginów.

**Dlaczego:** Jeden styl kodu w całym repo. Koniec kłótni o formatowanie.

## More docs

See `CLAUDE.md` for detailed architecture documentation.
