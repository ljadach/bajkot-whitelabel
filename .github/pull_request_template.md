## What changed and why

<!-- One paragraph -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor (no behavior change)
- [ ] SEO / performance
- [ ] Governance / tooling

## Checklist

### Always
- [ ] `npm run build` passes with zero errors
- [ ] Read relevant `ARCHITECTURE.md` section before coding

### If I modified a public page (src/pages/)
- [ ] Uses `useLangFromUrl()` hook
- [ ] Uses `<PageShell>` wrapper
- [ ] `<PageHead>` present with title, description, canonicalPath, currentLang
- [ ] `<JsonLd>` present with at least BreadcrumbList
- [ ] No direct Convex/Clerk imports (use lazy wrappers)

### If I added a new public page
- [ ] Added to `scripts/generate-sitemap.mjs`
- [ ] Added to `scripts/generate-meta-shells.mjs`

### If I added Tailwind classes
- [ ] Used tokens from `tailwind.config.js`
- [ ] Used `neutral-*` not `gray-*`
