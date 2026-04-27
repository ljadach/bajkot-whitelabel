# Stripe Setup Checklist

Aktualny model: **one-shot Checkout per book order**.

- Checkout: `convex/stripe.ts` → `mode: 'payment'`, args: `{ bookOrderId }`.
- Webhook: `POST /stripe/webhook` w `convex/http.ts` → na `checkout.session.completed` (mode=payment, paid) ustawia `bookOrders.paymentStatus = 'completed'`.
- Powrot po checkout: `success_url = ${APP_URL}${returnPath}?checkout=success&session_id=...`. `returnPath` defaultuje do `/book/<orderId>/result`. Admin sandbox uzywa `/admin/stripe`.

## 1. Stripe Dashboard

- Utworz produkt `Bajka` (lub podobny).
- Utworz **jednorazowa cene** (`one-time`) — np. PLN 49.
- Skopiuj `price_...` i ustaw go jako `STRIPE_BOOK_PRICE_ID`.
- Wlacz `Automatic tax`, jesli chcesz rozliczac VAT przez Stripe Tax.
- Customer Portal — niepotrzebny przy one-shot. Mozna zostawic wylaczony.

## 2. Env vars

Potrzebne zmienne (Convex env):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_BOOK_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:5173
```

Ustawiaj przez `npx convex env set KEY=value` (dev) albo dashboard Convex (prod).

## 3. Convex deployment URL

Webhook Stripe musi trafia do Convex HTTP route, nie do Vite.

```text
https://<twoj-convex-deployment>.convex.site/stripe/webhook
```

## 4. Stripe CLI (dev)

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to https://<dep>.convex.site/stripe/webhook
```

CLI zwroci `whsec_...` → ustaw jako lokalny `STRIPE_WEBHOOK_SECRET`.

Smoke test:

```bash
stripe trigger checkout.session.completed
```

## 5. Webhook endpoint w Stripe (prod)

W Stripe Dashboard dodaj endpoint:

```text
https://<dep>.convex.site/stripe/webhook
```

Zasubskrybuj minimum: `checkout.session.completed`. Skopiuj sekret webhooka → `STRIPE_WEBHOOK_SECRET`.

## 6. Checkout smoke test

1. Zaloguj sie jako admin → `/admin/stripe`.
2. Klik **+ Nowe zamowienie testowe** → tworzy `bookOrder` z `paymentStatus = 'pending'`.
3. Klik **Otworz Checkout** → redirect na Stripe.
4. Zaplac karta `4242 4242 4242 4242`, dowolna data w przyszlosci, dowolne CVC.
5. Powrot na `/admin/stripe` → status zmienia sie na `completed` (live, przez Convex query).

## 7. Test cards

- sukces: `4242 4242 4242 4242`
- 3DS: `4000 0025 0000 3155`
- odrzucona: `4000 0000 0000 9995`

## 8. Deploy production

- Live `STRIPE_SECRET_KEY`, live `STRIPE_BOOK_PRICE_ID`, live `STRIPE_WEBHOOK_SECRET` na produkcyjnym deploymencie Convex.
- Osobny prod webhook endpoint w Stripe.
- `APP_URL` = produkcyjna domena (np. `https://bajkoterapia.org`).
- Jeden testowy zakup na live (najlepiej z return refund).

## 9. Known gotchas

- Webhook wymaga surowego body. `convex/stripeHttp.ts` uzywa `request.text()` — nie parsuj wczesniej.
- `APP_URL` i domena Clerk musza byc spojne (returnUrl wraca tutaj).
- Bez webhooka redirect z Checkout sam w sobie NIE oznacza zaplaty — to webhook updatuje DB.
- `bookOrderId` jest przekazywany przez `client_reference_id` ORAZ `metadata.bookOrderId`. Webhook woli `metadata`, fallback do `client_reference_id`.
