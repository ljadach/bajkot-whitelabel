# TODO — open risks of the white-label demo

Checked at the start of every session (see CLAUDE.md). Remove an item only
when it's actually fixed.

## 1. Open intake: anyone can burn the generation budget

`startLandingOrder` (`convex/bookPipeline.ts`) has no access code and no rate
limit — decided for the demo (2026-09-24: "open to anyone"). Every started
order costs LLM + image-generation money **before** the paywall. Inherited
from bajkot, where it's also open.

Before sending the link around widely or running ads: add a per-IP / global
rate limit or an access code on intake (bajkot's history has a ready
`checkAndRecordLandingStart` + `rateLimits` table to restore).

## 2. Stripe test mode gives books away

While `STRIPE_MODE=test`, anyone can finish checkout with card 4242 and get the
full PDF. Intended for pitches. A partner going live needs `STRIPE_MODE=live`
(test payments then stop unlocking anything) — see `docs/whitelabel-setup.md`.

## 3. Children's data in LLM logs

`llmLogs` stores full prompts (child's name, problem description, dedication).
All orders share one user id and the table keeps the last 50 rows per id, so
it's a rolling window of the latest calls — but they are raw. Langfuse would
send the same to a third party: keep `LANGFUSE_*` unset here. Fix: log hashes

- metadata only (same open item as bajkot's TODO #2).

## 4. Inherited from bajkot's audits (still in this code)

Full reports live in bajkot's history (`docs/security-audit-2026-08-06.md`,
`docs/reliability-audit-2026-08-10.md` — the latter is kept here).

- Webhook unlocks on `payment_status === 'paid'` without checking the amount;
  with `allow_promotion_codes` a 100% coupon means a free book. Don't create
  such coupons in the live account.
- No refund / delayed-payment handling (`checkout.session.completed` only):
  a refund keeps access; P24/BLIK-style async methods would never unlock. Keep
  only card payments enabled until handled.
- A4 psych gate fails open and QA passes are skipped for speed
  (`skipQaReviews: true`) — see the reliability audit.

## 5. Before a real partner launch

- Partner entry with `legalEntity`, `termsUrl`, `privacyUrl`, `supportEmail`.
- Privacy policy naming the processors (OpenRouter/Google, Convex, Resend,
  Stripe, R2).
- Decide per partner who owns the Stripe account the money goes to.
