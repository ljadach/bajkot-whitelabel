# Bajkot — Personalized Therapeutic Storybooks

Bajkot generates personalized illustrated therapeutic stories for children. Parents describe their child's challenges, and the platform creates a custom story with therapeutic elements — delivered as a beautiful PDF.

Built with [Convex](https://convex.dev) (backend) and React + Vite (frontend).

Connected to Convex deployment [`accomplished-schnauzer-177`](https://dashboard.convex.dev/d/accomplished-schnauzer-177).

## Quick start

```bash
npm install
npm run dev        # Start frontend + backend
```

## Project structure

- `src/` — Frontend (React, React Router v7, Tailwind CSS)
- `convex/` — Backend (Convex functions, schema, pipeline agents)
- `e2e/` — End-to-end tests (Playwright)
- `docs/` — Documentation and devlog

## Commands

```bash
npm run dev              # Full stack dev server
npm run build            # Production build
npm run lint             # Type-check + schema validation + build
npm run format           # Prettier
npm run deploy:staging   # Deploy to staging
```

See `CLAUDE.md` for detailed architecture documentation.
