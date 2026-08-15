# Meta Pixel + Conversions API — setup checklist

Retargeting for Facebook / Instagram. Mirrors `stripe-setup-checklist.md` in
shape: what to configure, where, and how to prove it works.

The integration is **inert until configured**. With no env vars set, no
script is injected, every helper no-ops and the Stripe webhook skips the
server-side send. It is therefore safe on `main` and safe in production
before the Meta account exists.

## Why both a browser pixel and a server API

The browser pixel loses a large share of events to iOS tracking prevention
and ad-blockers, and it loses them unevenly — the people most likely to
block are not the people least likely to buy. The Conversions API reports
the purchase from the Stripe webhook, over a channel no extension can
interrupt.

Both sides send the same `Purchase` with the same `event_id`
(`purchase_<orderId>`), so Meta counts one sale regardless of which arrives.
The formula lives in two places on purpose and **must stay identical**:

- `src/lib/metaPixel.ts` → `metaPurchaseEventId`
- `convex/metaCapi.ts` → `metaPurchaseEventId`

`tests/unit/metaPixel.test.ts` asserts the two agree, deliberately by
re-declaring the server formula rather than importing it — importing would
make the test pass by construction even after a drift.

## Environment variables

### Vercel (build time — Vite inlines these)

| Variable             | Where to find it                                   | Effect if unset                 |
| -------------------- | -------------------------------------------------- | ------------------------------- |
| `VITE_META_PIXEL_ID` | Events Manager → your dataset → the 15-16 digit id | No pixel script injected at all |

Current value: `4481352568789657` (dataset `Bajkoterapia Web`, portfolio
`Trustee Interactive`). Env-driven rather than hardcoded so dev and preview
builds stay silent instead of polluting the production audience with our own
testing.

**This is build-time.** Setting it in Vercel is not enough — deploys here are
manual (`npm run deploy`), so the next build after setting it is what
actually carries the value.

The domain-verification token is **hardcoded** in `src/lib/metaPixel.ts`
(`META_DOMAIN_VERIFICATION`), not an env var. It is public, it belongs to
the domain rather than to an environment, and it never rotates — an env var
would only add a step whose one possible outcome is forgetting it.

### Google Ads, while you are in the same settings page

Not Meta, but the same deploy and the same failure mode — recorded here
because there is nowhere better and because it was missing for months.

| Variable                         | Value            | Effect if unset                      |
| -------------------------------- | ---------------- | ------------------------------------ |
| `VITE_GOOGLE_ADS_ID`             | `AW-18164650689` | No Google Ads tag on the site at all |
| `VITE_GOOGLE_ADS_PURCHASE_LABEL` | **leave unset**  | Correct — see below                  |

**Verified on production 2026-08-15: the Google Ads tag was not installed.**
`curl -sL https://bajkoterapia.org/` returned `G-3QB3EX66Z2` and no `AW-`
tag; Google's own Data Manager reported _"No data has been received from
your tag"_ for `AW-18164650689`. Root cause: `root.tsx` emits
`gtag('config', 'AW-…')` only when `VITE_GOOGLE_ADS_ID` is set, and it was
not set in Vercel. Thirty-eight campaigns had been running since
2026-07-20 with no Google Ads tag on the site.

**`VITE_GOOGLE_ADS_PURCHASE_LABEL` must stay unset**, and this is a trap
worth stating loudly. Purchase conversions are imported from GA4
(Ads → Goals → Conversions → Import → Google Analytics 4), which is how
czytam.club has always measured on the same account. Setting the label as
well would make the tag fire a second conversion for the same sale, and
Smart Bidding would optimise against an inflated count. `trackPurchase`
checks both variables and skips the Ads conversion event when the label is
absent, so leaving it unset is a supported configuration, not a gap.

### Convex (runtime, per deployment)

| Variable                 | Where to find it                                                              | Effect if unset                       |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------- |
| `META_PIXEL_ID`          | Same id as above                                                              | Server-side Purchase silently skipped |
| `META_CAPI_ACCESS_TOKEN` | Events Manager → dataset → Settings → Conversions API → Generate access token | Server-side Purchase silently skipped |
| `META_CAPI_TEST_CODE`    | Events Manager → Test events tab                                              | Optional; **remove after verifying**  |

```bash
npx convex env set META_PIXEL_ID <id> --prod
npx convex env set META_CAPI_ACCESS_TOKEN <token> --prod
```

Read one back with `npx convex env get META_PIXEL_ID --prod`. Do **not** use
`npx convex env list` — it prints every secret in the deployment.

Events carrying `META_CAPI_TEST_CODE` do not count towards reporting or
audiences. Leaving it set means the pixel appears to work while feeding
nothing into the ad account.

## What fires, and when

| Funnel moment                      | Source                              | Meta event                   |
| ---------------------------------- | ----------------------------------- | ---------------------------- |
| Any page                           | route change                        | `PageView`                   |
| `/problem/<slug>`                  | route change                        | `ViewContent` (no topic id)  |
| First real edit in the intake form | `order_started`                     | custom `OrderStarted`        |
| Paywall / preview seen             | `preview_paywall_viewed`            | `AddToCart`                  |
| Checkout clicked                   | `checkout_submit_clicked`           | `InitiateCheckout`           |
| Paid (browser)                     | `trackPurchase` in `gtag.ts`        | `Purchase` + `eventID`       |
| Paid (server)                      | Stripe `checkout.session.completed` | `Purchase` + same `event_id` |

## GA4 gets the same funnel stages

`GA4_FUNNEL_MAP` in `src/lib/telemetry.ts` mirrors the same three mid-funnel
stages into GA4, under GA4's own vocabulary:

| Funnel stage              | GA4 event        |
| ------------------------- | ---------------- |
| `order_started`           | `order_started`  |
| `preview_paywall_viewed`  | `add_to_cart`    |
| `checkout_submit_clicked` | `begin_checkout` |

GA4 previously received only `page_view`, `purchase` and `book_generated`,
so a Google Ads remarketing audience could express "visited and did not
buy" but not "started an order and abandoned it" — the group worth the
most. Recommended GA4 ecommerce names are used where they exist, because
Google Ads reads those natively for bidding and audience building.

Separate map from Meta's on purpose: the two vocabularies differ, and
forcing one shared name on both would mean picking a loser.

## What must never be sent — RODO art. 9

**No event carries the problem topic.** Not the slug (`moczenie-nocne`), not
the catalog category (`sen`, `leki`, `higiena`, `emocje`, `relacje`,
`trudne`), not the child's name, age or appearance.

Every topic on this site names a child's behavioural, emotional or health
difficulty. "This person read the bedwetting page" is data revealing the
health of a child — a special category under RODO art. 9. Consent to
analytics cookies is not consent to send that to an ad platform, and Meta's
own terms forbid transmitting sensitive-category data through the pixel.

Three enforcement points, because this is the kind of thing that gets
helpfully "improved" back in:

1. `mirrorToMeta` in `telemetry.ts` takes **no** properties argument. Funnel
   events carry `problemId`; the mirror cannot forward what it never
   receives.
2. `trackPurchase` in `gtag.ts` passes `category` to GA4 but **not** to
   Meta. GA4 is our own analytics under a processing agreement; Meta is an
   advertising audience.
3. `buildMetaOrderAttribution` sends `window.location.origin`, never
   `location.href` — the order flow lives at `/problem/<topic>/zamow`.
   `tests/unit/metaPixel.test.ts` asserts the serialised payload contains
   neither `/problem/` nor a topic slug.

**What we cannot prevent:** the browser pixel transmits the page URL with
every event. That is inherent to how ad pixels work, and for a topic page
the URL reveals the topic. Section 8 of the privacy policy discloses this
plainly rather than implying otherwise. It is also why the pixel is fully
inert before consent.

**Consequence for campaigns:** no per-topic retargeting audiences. Build on
funnel depth instead — `OrderStarted` without `Purchase`, `AddToCart`
without `Purchase`, all visitors without `Purchase`. Meta's personal-
attributes ad policy would block topic-specific creative anyway, so the
targeting would carry the legal risk without delivering the payoff. If
traffic ever makes per-topic pools servable, the answer is a coarse
non-clinical bucket agreed with counsel, not the raw slug.

Mid-funnel mappings live in one table, `META_FUNNEL_MAP` in
`src/lib/telemetry.ts`, next to the PostHog dispatch. Adding a stage means
adding a row there — never a second call site, or the two analytics systems
start describing different funnels.

`Purchase` is the exception: it lives in `trackPurchase` because that
function already owns the once-per-order guard (`markPurchaseTrackedOnce`).
Routing it through the funnel mirror would reintroduce the double-count that
guard exists to prevent.

## Consent

Meta rides the **same cookie-banner toggle as GA4**, decided 2026-08-15.
That toggle already grants Google's `ad_storage` / `ad_user_data` /
`ad_personalization`, so it has always in practice meant advertising
consent; splitting it would only shrink an already small retargeting pool.

Enforced in three places:

1. `fbq('consent', 'revoke')` runs before `fbq('init')` in `root.tsx`, so
   fbevents.js writes no cookies until the banner grants.
2. `applyTrackingConsent` in `telemetry.ts` is the single function every
   banner action calls — a future third platform cannot be wired into four
   of five call sites and forgotten in the fifth.
3. `buildMetaOrderAttribution` reads consent from localStorage itself rather
   than accepting it as a parameter, and returns `undefined` without it. An
   order from someone who rejected carries no `metaAttribution`, and
   `metaCapi.sendPurchase` refuses to send without it.

If the consent policy is ever revisited, update
`polityka-prywatnosci` at the same time — Meta Platforms Ireland is a
recipient of personal data and the controller is Trustee Interactive
Sp. z o.o.

## Match keys and why they are stored on the order

The Purchase is sent hours later from a Stripe webhook, where there is no
browser: no `_fbp` / `_fbc` cookies, no user agent, and an IP belonging to
Stripe. Meta cannot attribute a server event to an ad click without at
least one match key, so `bookOrders.metaAttribution` snapshots them at
order creation (`LandingOrderFlow` → `startLandingOrder` → `createOrder`).

`client_ip_address` is deliberately **not** sent. We do not hold the
customer's real IP on this path, and sending Stripe's would corrupt Meta's
geo matching rather than improve it.

When Meta's `_fbc` cookie is missing but our own attribution snapshot still
holds an `fbclid` (visitor rejected consent on the ad click, accepted on a
later visit), it is reconstructed as `fb.1.<timestamp>.<fbclid>`, Meta's
documented format.

## Verification

Do all four before believing any of it works.

1. **Consent gate.** Load the site in a clean profile, open DevTools →
   Network, filter `facebook`. Before accepting the banner there must be no
   request to `/tr` and no `_fbp` cookie. Accept, then confirm both appear.
2. **Browser events.** Meta Pixel Helper extension on `/problem/<slug>`:
   expect `PageView` and `ViewContent`. Start the form: `OrderStarted`.
   Reach the paywall: `AddToCart`.
3. **Server events.** Set `META_CAPI_TEST_CODE`, open Events Manager → Test
   events, run a real (or Stripe-test) payment. Expect `Purchase` from both
   Browser and Server, shown as **deduplicated** — not two purchases.
   Then remove the test code.
4. **Domain.** Business settings → Brand safety → Domains shows
   `bajkoterapia.org` as Verified.

If step 3 shows two separate purchases rather than one deduplicated pair,
the two `metaPurchaseEventId` implementations have drifted. That is the
failure this whole arrangement is built to make visible.

## Deliberately not built

- **Audiences and campaigns.** As of 2026-08-15 the entire consented
  visitor pool is ~213 people over 180 days (PostHog project `bajkot`).
  Meta creates a website custom audience at 100 people and delivers
  unreliably below roughly 1,000; a "paywall abandoners, 14 days" audience
  would currently hold 4. The pixel is what fills the pool — audiences and
  spend wait until it is large enough to mean something.
- **A separate "marketing" cookie category.** See Consent above.
- **Lead / AddPaymentInfo events.** No corresponding funnel stage exists.
