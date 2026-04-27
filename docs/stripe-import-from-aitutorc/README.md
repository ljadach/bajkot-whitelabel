# Stripe import — aitutorc → bajkot

Pliki w tym folderze NIE są budowane. Zostały skopiowane z aitutorc
(`codex/stripe-billing-v1`, commit `53d9a10`) jako wzorzec.

## Inventory

| Plik                                      | Origin (aitutorc)                             | Czemu nie 1:1                                                                                   |
| ----------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `aitutorc-billing.ts`                     | `convex/billing.ts`                           | Używa tabel `courses` i `moduleUnlocks` (bajkot ich nie ma). Adaptuj do `bookOrders`.           |
| `aitutorc-lib-billing.ts`                 | `convex/lib/billing.ts`                       | j.w.                                                                                            |
| `components-billing/FreeUnlockPrompt.tsx` | `src/components/billing/FreeUnlockPrompt.tsx` | i18n namespace `plan` z aitutorc; design system OK do skopiowania, copy do podmiany.            |
| `components-billing/LockedModuleView.tsx` | `src/components/billing/LockedModuleView.tsx` | j.w. + logika "module" zamiast "book".                                                          |
| `components-billing/UpgradePrompt.tsx`    | `src/components/billing/UpgradePrompt.tsx`    | j.w.                                                                                            |
| `useCheckoutReturn.ts`                    | `src/hooks/useCheckoutReturn.ts`              | Używa `react-router` + `sonner` — bajkot ma oba. Można podpiąć 1:1, sprawdzić namespace `plan`. |
| `stripe-integration-plan.md`              | `docs/stripe-integration-plan.md`             | 757 linii pełnego planu. Read first przed adaptacją.                                            |

## Co już jest podpięte w bajkot

Czysto generic kawałki poszły do `convex/`:

- `convex/stripe.ts` — Checkout + Customer Portal + webhook handler.
- `convex/stripeHttp.ts` — HTTP route handler.
- `convex/billing.ts` — odchudzone, tylko subscription state (bez `getAccessState` / `unlockFreeModule`).
- `convex/lib/billing.ts` — helpery do `subscriptions` table.
- `convex/schema.ts` — tabela `subscriptions`.
- `convex/http.ts` — route `POST /stripe/webhook`.
- `package.json` — `stripe@^20.4.1`.

## Aitutorc commit reference

```
53d9a1075aafd5f8ddf5225f14042ebc9d24e041
(feat) Stripe billing v1: freemium model with 2 free unlocks + Pro paywall

- Add subscriptions and moduleUnlocks tables with indexes
- Stripe Checkout, Customer Portal, webhook verification (Node actions)
- Backend billing gate: getReadableDocumentByPage checks access before returning content
- Frontend: LockedModuleView, FreeUnlockPrompt, UpgradePrompt billing modals
- SettingsPage billing section (upgrade/manage via Stripe portal)
- GDPR cleanup in deleteAccount/resetProfile for new billing tables
- Code cleanup: shared validators, extracted hooks, removed dead code
```
