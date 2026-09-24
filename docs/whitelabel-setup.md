# White-label demo — setup checklist

Everything a fresh environment needs, in order. Nothing here is shared with
bajkoterapia.org by default: own Convex project, own Vercel project, own
Stripe account, own e-mail sender. Where sharing is possible (LLM keys, the
typst render service) it's called out.

The domain isn't decided yet — every place it goes is marked **〈domain〉**.

## 1. Convex (backend)

```bash
npm install
npx convex dev            # log in, create a NEW project (e.g. "storybook-whitelabel") — dev deployment
npx convex deploy         # creates the prod deployment of that project
```

Set env vars on **both** deployments (dashboard → Settings → Environment
Variables, or `npx convex env set NAME value [--prod]`):

| Variable                                 | Required        | What                                                                                                         |
| ---------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `OPENROUTER_API_KEY`                     | yes             | Story LLM calls (OpenRouter). Can be the bajkot key or a separate one for cost tracking.                     |
| `GOOGLE_GENERATIVE_AI_API_KEY`           | yes             | Illustrations (Gemini).                                                                                      |
| `APP_URL`                                | yes             | `https://〈domain〉` — Stripe return URLs and e-mail links. Dev: `http://localhost:5173`.                    |
| `STRIPE_MODE`                            | no              | `test` (default) or `live`. See [Stripe](#stripe).                                                           |
| `STRIPE_TEST_SECRET_KEY`                 | for payments    | `sk_test_…`                                                                                                  |
| `STRIPE_TEST_WEBHOOK_SECRET`             | for payments    | `whsec_…` of the test-mode webhook endpoint                                                                  |
| `STRIPE_TEST_BOOK_PRICE_ID`              | for payments    | test-mode Price, PDF (49 PLN)                                                                                |
| `STRIPE_TEST_BOOK_PRINT_PRICE_ID`        | for payments    | test-mode Price, PDF + print (139 PLN)                                                                       |
| `STRIPE_LIVE_*` (same four)              | for live        | the live-mode counterparts                                                                                   |
| `STRIPE_AUTOMATIC_TAX`                   | no              | `true` to enable Stripe Tax on Checkout (needs Stripe Tax set up in the account).                            |
| `RESEND_API_KEY`                         | for e-mail      | Without it e-mails are skipped (logged), the flow still works.                                               |
| `EMAIL_FROM`                             | for e-mail      | Sender on a domain verified in Resend, e.g. `bajki@〈domain〉`. The display name becomes the partner's name. |
| `EMAIL_REPLY_TO`                         | no              | Reply-to when the partner has no `supportEmail`.                                                             |
| `ADMIN_ALERT_EMAIL`                      | no              | Gets an alert for every paid PDF + print order (test payments are flagged "nie drukować").                   |
| `USE_RENDER_SERVICE`, `RENDER_*`, `R2_*` | no              | typst-render PDFs instead of the built-in composer — see [PDF rendering](#pdf-rendering).                    |
| `LANGFUSE_*`                             | **leave unset** | Langfuse tracing sends full prompts (child's name, problem description) to a third party.                    |

Then the prompts — see [Prompts](#prompts).

## 2. Vercel (frontend)

1. New Vercel project from `ljadach/bajkot-whitelabel` (or `vercel link` and
   deploy manually with `npm run deploy`, like bajkot).
2. Env (Production): `VITE_CONVEX_URL=https://<prod-deployment>.convex.cloud`.
3. Add **〈domain〉** to the project, then set `APP_URL` in Convex prod to it.

The site sends `noindex` and `robots.txt` disallows everything — it's a demo.

## Stripe

Use a **separate Stripe account** (or at least check the account's public
business name and logo): Checkout shows them at the top of the payment page,
in test mode too. The partner's name appears in the note next to the pay
button, but the account name is Stripe's.

For each mode you want (test now, live when a partner goes real):

1. Products → two one-time Prices in PLN: **PDF 49 zł** and **PDF + druk
   139 zł** (match `convex/lib/pricing.ts`, which the UI shows). IDs go into
   `STRIPE_{TEST|LIVE}_BOOK_PRICE_ID` / `…_BOOK_PRINT_PRICE_ID`.
2. Developers → Webhooks → add endpoint
   `https://<prod-deployment>.convex.site/stripe/webhook`, event
   `checkout.session.completed`. Its signing secret →
   `STRIPE_{TEST|LIVE}_WEBHOOK_SECRET`. Register the same URL in both modes;
   the handler tries both secrets and reads `livemode` from the event.
3. API keys → secret key → `STRIPE_{TEST|LIVE}_SECRET_KEY`.

**The switch:** `npx convex env set STRIPE_MODE live --prod` (and back with
`test`). New Checkout sessions use the new mode immediately. Rules:

- Test mode: the paywall shows a banner with card `4242 4242 4242 4242`.
- A live payment always unlocks its order; a test payment only while
  `STRIPE_MODE` is `test` — after going live nobody unlocks a book with the
  test card.
- Every paid order records `paymentMode` (`test`/`live`) and the amount
  actually charged, so demo orders are easy to tell from sales.

Heads-up: in test mode anyone can finish the flow with the test card and
download the book. That's the point of the demo, but it also means every
visitor can generate books at your LLM/image cost (the intake is open, no rate
limit) — see `TODO.md`.

## E-mail (Resend)

Verify **〈domain〉** (or a subdomain) in Resend, create an API key, set
`RESEND_API_KEY` and `EMAIL_FROM`. Each e-mail is sent as
`"<partner name>" <EMAIL_FROM address>` with the partner's colours and logo
(PNG/JPG only — SVG logos fall back to the text name) and reply-to set to the
partner's `supportEmail`.

## Prompts

The pipeline loads prompts from the `bookPrompts` table and falls back to the
code in `convex/lib/prompts/bookFallbacks.ts` when the table is empty. A fresh
deployment runs on the code fallbacks. If bajkoterapia.org's prompts were
edited in its database, copy them over for the same story quality:

```bash
# in the bajkot checkout, against its prod
npx convex run --prod admin/bookPrompts:exportAllPrompts > prompts.json
# in this repo, per entry (filename + content), against the target deployment
npx convex run [--prod] admin/bookPrompts:importPrompt '{"filename":"A3_story_writer","content":"…"}'
```

`npm run cli -- prompts list` shows which prompts are in the DB.

## PDF rendering

- **Default — built-in composer (pdfkit):** no setup, runs inside Convex.
- **typst-render service** (what bajkoterapia.org uses; better typesetting):
  `USE_RENDER_SERVICE=true`, `RENDER_SERVICE_URL`, `RENDER_SHARED_SECRET`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`. Ask
  whoever runs the droplet whether to share it (PDFs would then land in the
  same R2 bucket as bajkot's) or run a separate instance. Its template has no
  brand text. See `docs/typst-render-service.md`.

## Smoke test

1. `https://〈domain〉/` — "Twoja Marka" theme; `https://〈domain〉/przyklad` —
   the example partner.
2. Order a book → progress page → pick a style → dedication → preview.
3. Pay with `4242 4242 4242 4242` → "Potwierdzamy płatność…" → the book.
   If it hangs on confirming, the test webhook secret or endpoint is wrong
   (Stripe dashboard → webhook → recent deliveries).
4. Check the two e-mails arrived in the partner's branding.
5. `npm run cli -- status --prod` to see orders from the terminal.

## Before a partner takes real money

- Partner entry with `legalEntity`, `termsUrl`, `privacyUrl`,
  `supportEmail` (the consent checkbox and e-mails use them).
- Live Stripe keys, prices and webhook; `STRIPE_MODE=live`.
- Decide on the open intake (rate limit or access code) — see `TODO.md`.
- A privacy policy that lists the processors: OpenRouter/Google (story +
  illustrations), Convex, Resend, Stripe, R2 if the render service is used.
