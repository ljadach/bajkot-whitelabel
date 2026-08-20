import { redirect, type LoaderFunctionArgs } from 'react-router';

// Target of the QR codes printed on the kindergarten mailing leaflets. Every
// institution gets its own ID (`P001`…`P100`, register:
// `Trustee_Book in a day/11_Marketing/Przedszkola/Mailing_Przedszkola_Lista100.xlsx`)
// and its own printed URL `/p/<ID>`.
//
// Why a route instead of the plain UTM link the leaflet could carry directly:
// the edge middleware records `url.pathname` only (`middleware.ts:61`), so a
// query string never reaches the `pageViews` table. Putting the ID in the path
// is what makes a scan countable BEFORE cookie consent — and consent rates
// differ between audiences, so a consent-gated count would rank kindergartens
// by banner behaviour rather than by leaflet. The redirect then adds the UTMs
// for `src/lib/attribution.ts`, which credits the order.
//
// The middleware runs on this request first and fires its tracking POST
// independently of the response (`middleware.ts:84-92`), so the 302 below does
// not cost us the scan. One scan therefore leaves two rows in `pageViews`:
// `/p/<ID>` and then `/`.
//
// 302, never 301: browsers cache permanent redirects, and the whole point of
// the short printed URL is that the destination can change after 100 leaflets
// are in the post.

/** Mailing wave. Must match `utm_campaign` used in PostHog and the Stripe coupon metadata. */
const WAVE = 'przedszkola-2026-09';

/** Register IDs are `P` plus three digits. Anything else is a misread or a typo. */
const ID_PATTERN = /^P\d{3}$/;

export function loader({ params }: LoaderFunctionArgs) {
  // Uppercased because a hand-typed URL off a leaflet is as likely to be
  // `/p/p001`; the register itself only ever produces uppercase.
  const id = (params.id ?? '').toUpperCase();

  // Unknown ID lands on the home page with no tagging at all: a typo should
  // still sell a book, and inventing an `utm_content` for it would poison the
  // per-kindergarten report with a phantom row.
  if (!ID_PATTERN.test(id)) {
    return redirect('/', 302);
  }

  const query = new URLSearchParams({
    utm_source: 'qr',
    utm_medium: 'przedszkole',
    utm_campaign: WAVE,
    utm_content: id,
  });

  return redirect(`/?${query.toString()}`, 302);
}
