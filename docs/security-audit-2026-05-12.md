# Security Audit - 2026-05-12

Branch: `security-audit-2026-05-12`  
Scope: React/React Router frontend, Convex backend, Stripe/webhooks, public landing flows, admin functions, secrets handling, dependency audit.

**Initial audit:** 2026-05-12 morning — audit only, no application code changed.
**Remediation pass:** 2026-05-12 evening — C1, C2, C3, H3, H1 closed in this branch (see "Resolution status" at the bottom).

## Reference Baseline

- Convex authentication docs: https://docs.convex.dev/auth and https://docs.convex.dev/auth/functions-auth
- Convex internal functions docs: https://docs.convex.dev/functions/internal-functions
- Convex production docs: https://docs.convex.dev/production
- Local Convex rules: `.cursor/rules/convex_rules.mdc`

Key baseline points used for this review:

- Public Convex `query`, `mutation`, and `action` functions are internet-facing and must enforce authorization in code.
- Sensitive server-side operations should be `internalQuery`, `internalMutation`, or `internalAction`.
- HTTP actions need explicit request authentication or signature validation.
- Auth-linked lookups should prefer the server-derived identity, not client-provided user IDs.

## Executive Summary

The current codebase has strong foundations in several areas: Convex auth is configured, most authenticated order/admin paths perform server-side checks, Stripe webhook signatures are verified, public form inputs have validation and rate limiting, and user text entering LLM prompts is sanitized.

However, there are launch-blocking risks in the order flow:

1. Client-controlled developer flags can bypass Stripe and QA.
2. Landing-order authorization is based only on `clerkUserId === "landing-user"`, not on a per-order secret or authenticated user.
3. Landing intake has its access-token gate disabled and does not rate-limit expensive LLM pipeline creation.
4. `npm audit` reports critical/high vulnerabilities in runtime dependencies, including Clerk and protobufjs.

## Findings

### C1 - Client-Controlled `skipStripe` Bypasses Payment

Severity: Critical  
Files: `convex/bookPipeline.ts:137`, `convex/bookPipeline.ts:155`, `convex/bookPipeline.ts:535`, `convex/bookPipeline.ts:735`, `convex/bookPipeline.ts:774`, `src/components/book/order-flow/AuthOrderFlow.tsx:42`, `src/components/book/order-flow/AuthOrderFlow.tsx:76`, `src/components/book/order-flow/LandingOrderFlow.tsx:37`, `src/components/book/order-flow/LandingOrderFlow.tsx:85`, `src/components/book/order-flow/OrderPreview.tsx:174`

`skipStripe` is accepted as a public action argument, stored on the order, and `isPaid()` treats `skipStripe === true` as paid. The frontend defaults `skipStripe` to `true` and renders diagnostic checkboxes to every visitor. Even where the UI only auto-submits for admins, a caller can invoke the public Convex action directly with `skipStripe: true`.

Impact: unauthenticated landing callers and authenticated regular users can create orders that unlock full downloads without a real Stripe payment. This also undermines revenue controls and payment-status auditability.

Recommendation:

- Remove `skipStripe`, `skipQaReviews`, and `fastImage` from public `startOrder` and `startLandingOrder` args.
- If test bypasses are still needed, expose them only through admin-only actions/mutations guarded by `assertAdmin`.
- Make payment unlock depend only on trusted server-side payment state, e.g. Stripe webhook-marked `paymentStatus === "completed"` or an admin-only internal override with audit logging.

### C2 - Landing Orders Have No Per-Order Authorization Secret

Severity: Critical  
Files: `convex/lib/roles.ts:105`, `convex/lib/roles.ts:124`, `convex/bookPipeline.ts:486`, `convex/bookPipeline.ts:650`, `convex/bookPipeline.ts:723`, `convex/bookPipeline.ts:830`, `convex/bookPipeline.ts:866`, `convex/bookPipeline.ts:892`, `convex/bookPipeline.ts:919`, `convex/bookPipeline.ts:991`

All landing orders share `clerkUserId: "landing-user"`. `assertLandingOrder()` only verifies that the order belongs to that sentinel user. Any caller with a valid landing `orderId` can read progress, events, preview data, style-vote images, print-thanks email, payment/download status, and can submit/skip dedication or style vote.

Convex IDs are not intended as the sole authorization boundary. This is especially risky because order IDs can leak through URLs, analytics, browser history, email, support screenshots, referrers, or logs.

Impact: privacy breach for child/order data and unauthorized mutation of another landing customer's order.

Recommendation:

- Add a per-order `accessTokenHash` or `publicAccessTokenHash` to landing orders.
- Return the raw token only once to the creator and require it for every landing read/write action.
- Store only a hash server-side and compare using a timing-safe helper where available.
- Consider expiring or rotating landing tokens after checkout/payment and for support handoffs.

### C3 - Landing Intake Token Gate Is Disabled and Expensive Pipeline Has No Rate Limit

Severity: Critical  
Files: `convex/bookPipeline.ts:735`, `convex/bookPipeline.ts:763`, `convex/bookPipeline.ts:768`, `convex/bookPipeline.ts:778`

`startLandingOrder` requires `accessToken` in the validator but the enforcement is commented out and the value is discarded. Unlike authenticated `startOrder`, the landing path does not call the LLM rate limiter before scheduling the pipeline.

Impact: anyone can create unlimited landing orders and trigger LLM/image/PDF generation costs until provider-side limits or Convex limits intervene.

Recommendation:

- Re-enable `LANDING_ACCESS_TOKEN` or replace it with per-session/per-order token issuance.
- Add rate limiting for anonymous landing intake using a durable key such as access-token hash, email hash, or a server-issued session ID. Email-only limits are insufficient because the field is optional and attacker-controlled.
- Add a global emergency cap for pipeline starts per time window.

### H1 - Runtime Dependency Vulnerabilities

Severity: High  
Files: `package.json:45`, `package.json:46`, `package.json:48`, `package.json:49`, `package.json:50`, `package.json:64`, `package.json:76`

`npm audit --omit=dev --json` reports 19 production vulnerabilities: 5 critical, 7 high, 7 moderate. Full `npm audit --json` reports 21 total. Notable production issues:

- Critical: `@clerk/shared` middleware route protection bypass, GHSA-vqx2-fgx2-5wq9.
- High: Clerk authorization bypass across `@clerk/clerk-react`, `@clerk/react-router`, `@clerk/backend`, GHSA-w24r-5266-9c3c.
- Critical: `protobufjs` arbitrary code execution, GHSA-xq3m-2v4x-88gg, pulled through OpenTelemetry/Langfuse packages.
- High: `vite` arbitrary file read / fs deny bypass advisories affect dev server exposure.
- Moderate: `dompurify`, `postcss`, `yaml`, `ajv`, and others.

Impact: auth-related dependency issues are especially sensitive because this app relies on Clerk claims for admin gates and Convex identity. Some advisories may be context-dependent, but they should not remain unresolved in a production-facing app.

Recommendation:

- Upgrade Clerk packages beyond the affected ranges.
- Upgrade or pin transitive Langfuse/OpenTelemetry/protobufjs dependencies to fixed versions.
- Re-run `npm audit --omit=dev` after upgrades and record remaining exceptions with rationale.
- Avoid exposing Vite dev server outside localhost until Vite is upgraded.

### H2 - Admin Role Depends on Client-Configurable Clerk Public Metadata Claim

Severity: High  
Files: `convex/lib/roles.ts:1`, `convex/lib/roles.ts:31`, `convex/lib/roles.ts:91`, `convex/auth.config.ts:8`

Admin authorization depends on a custom JWT claim `isAdmin`, documented as sourced from Clerk `public_metadata.isAdmin`. Convex verifies JWT issuer/audience, but authorization quality depends on Clerk template configuration and who can modify public metadata.

Impact: if public metadata can be modified by a user-facing path, compromised Clerk dashboard access, or misconfigured automation, an attacker gets full admin access to orders, logs, prompts, config, PDF URLs, retries, and cancellations.

Recommendation:

- Move admin role source to Clerk private metadata or an allowlisted server-side Convex table.
- Add a defense-in-depth admin allowlist by Clerk user ID or email in Convex env/config.
- Include a deployment checklist item verifying the Clerk JWT template and metadata mutability.

### H3 - Landing Checkout Token Is Optional When Env Var Is Missing

Severity: High  
Files: `convex/stripe.ts:103`, `convex/stripe.ts:114`, `convex/stripe.ts:119`

`createLandingCheckoutSession` only validates `accessToken` if `LANDING_ACCESS_TOKEN` exists. If the env var is missing in production, any caller with a landing order ID can create checkout sessions for landing orders.

Impact: less severe than free-download bypass, but it weakens landing order access control and can create payment/session confusion for users.

Recommendation:

- Fail closed in production when `LANDING_ACCESS_TOKEN` or a replacement per-order token mechanism is missing.
- Use the same per-order landing token for checkout as for progress/result/vote/dedication reads and writes.

### M1 - Public Contact Form Lacks Global/IP/Bot Protection

Severity: Medium  
Files: `convex/contact.ts:85`, `convex/contact.ts:108`

The contact form rate-limits by email only. Attackers can rotate emails and fill `contactSubmissions`. The lead form is stronger: it has a global cap and optional Turnstile.

Impact: spam/data bloat and potential operational noise.

Recommendation:

- Add global rate limiting similar to `leads`.
- Consider Turnstile for contact submissions if abuse appears.
- Add max length validators for all contact fields.

### M2 - Lead Captcha Fails Open Unless Configured

Severity: Medium  
Files: `convex/leads.ts:35`, `convex/leads.ts:36`, `convex/leads.ts:390`

Turnstile is required only if `LEADS_CAPTCHA_REQUIRED === "true"` or `TURNSTILE_SECRET_KEY` is present. This is acceptable for dev, but production can silently run without captcha if env config is omitted.

Impact: public lead forms rely only on honeypot, min fill time, per-email and global rate limits.

Recommendation:

- Fail closed in production when captcha is intended.
- Add an admin config/status check that clearly reports whether Turnstile is active.

### M3 - Security Headers Are Not Configured

Severity: Medium  
Files: `vercel.json:1`, `middleware.ts:17`, `src/root.tsx:57`

`vercel.json` only declares the framework. No Content-Security-Policy, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, or frame controls are configured. The app loads external fonts, Font Awesome CSS, PostHog, Clerk, Convex, Stripe, and generated/download URLs, so CSP needs careful tuning rather than a generic default.

Impact: browser-side exploit containment is weaker if an XSS or third-party script issue occurs.

Recommendation:

- Add a production CSP in report-only mode first, then enforce.
- Add HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and frame protections.
- Keep Stripe/Clerk/PostHog/Convex domains explicit.

### L1 - Authenticated Ownership Uses `identity.subject` Instead of `tokenIdentifier`

Severity: Low  
Files: `convex/lib/roles.ts:111`, `convex/lib/roles.ts:116`, `convex/bookPipeline.ts:149`

The local Convex rules recommend `identity.tokenIdentifier` as the canonical stable key. This code stores and checks `identity.subject`. With one Clerk issuer this is likely stable, but `tokenIdentifier` is safer if providers/environments change.

Impact: migration/provider edge case rather than an immediate exploit.

Recommendation:

- For new auth-linked rows, store `identity.tokenIdentifier`.
- Plan a compatibility migration for existing `clerkUserId` values if auth providers may change.

## Positive Controls Observed

- Convex auth is configured via `convex/auth.config.ts`.
- Frontend uses `ConvexProviderWithClerk`, so Convex receives Clerk auth tokens.
- Most admin functions call `assertAdmin`.
- Most authenticated book read/write functions call `assertOrderOwner`.
- Stripe webhook payloads are verified with `stripe.webhooks.constructEvent`.
- Stripe payment unlock is normally performed by an internal mutation from a verified webhook path.
- User text entering LLM prompts is sanitized in `convex/lib/security.ts`.
- Lead form HTML email escapes user-controlled fields.
- `.env`, `.env.local`, `.env.test`, and `.env.staging` are gitignored. `.env.test.example` is tracked and contains placeholder values only.

## Secret Scan Notes

I did not print or inspect local `.env*` secret values. I checked tracked files for common secret patterns and found only placeholders/documentation references, not live-looking secrets. There is an untracked `.claude/worktrees/` directory that duplicated some documentation matches; it was left untouched.

## Verification Commands

- `git switch -c security-audit-2026-05-12`
- `rg --files -g '!*node_modules*' -g '!convex/_generated/**'`
- `rg -n "export const ... = (query|mutation|action)(" convex`
- `rg -n "export const ... = internal(Query|Mutation|Action)(" convex`
- `npm audit --omit=dev --json`
- `npm audit --json`
- `git check-ignore -v .env .env.local .env.test .env.staging .env.test.example`

## Prioritized Remediation Plan

1. Remove or admin-gate `skipStripe`, `skipQaReviews`, and `fastImage` on the server.
2. Add per-order landing access tokens and require them on every landing read/write/checkout/download action.
3. Re-enable/fail-closed landing intake authorization and add anonymous/global rate limits for pipeline starts.
4. Upgrade vulnerable dependencies and re-run production audit.
5. Harden admin role source away from public metadata.
6. Add production security headers.
7. Add contact-form global rate limiting and length caps.
8. Document a production security checklist for required env vars and Clerk JWT claim configuration.

## Resolution status (2026-05-12)

| ID  | Severity | Status    | Notes                                                                                                                                                                                                                                                                                                 |
| --- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Critical | **Fixed** | `skipStripe`, `skipQaReviews`, `fastImage` removed from `startOrder` and `startLandingOrder` validators. `isPaid()` and `presignForOrder` no longer honor `skipStripe` — only `paymentStatus === 'completed'`. UI diagnostic panel deleted. CLI sets `paymentStatus: 'completed'` directly.           |
| C2  | Critical | **Fixed** | New `accessTokenHash` column on `bookOrders`. `startLandingOrder` mints a 256-bit base64url token, stores SHA-256 hex, returns raw token once. `assertLandingOrder(ctx, orderId, accessToken)` does timing-safe compare and fail-closes on missing hash. Frontend persists token in localStorage map. |
| C3  | Critical | **Fixed** | `LANDING_ACCESS_TOKEN` env gate re-enabled with **fail-closed-in-prod**. New `landing_start` rate-limit type (60 starts/hour, global key `__landing_global__`). `checkAndRecordLandingStart` runs before sanitize and LLM guards.                                                                     |
| H1  | High     | **Fixed** | `npm audit fix --omit=dev`. Clerk packages → 5.61.6 / 2.4.13 / 2.33.3 / 3.47.5; protobufjs → 7.5.8 / 8.0.1; vite → 7.3.3. Remaining: 3 moderate `ajv` ReDoS via `@vercel/static-config` → `@vercel/react-router` (fix unavailable; deploy-time only — accepted exception).                            |
| H2  | High     | Open      | Admin role still sourced from Clerk public metadata.                                                                                                                                                                                                                                                  |
| H3  | High     | **Fixed** | `createLandingCheckoutSession` no longer depends on env `LANDING_ACCESS_TOKEN` (which fell open when unset). Uses per-order token via `internal.bookPipeline.verifyLandingTokenInternal`.                                                                                                             |
| M1  | Medium   | Open      | Contact form global cap not yet added.                                                                                                                                                                                                                                                                |
| M2  | Medium   | Open      | Turnstile still fails open when env unset.                                                                                                                                                                                                                                                            |
| M3  | Medium   | Open      | No CSP / HSTS / frame protections configured.                                                                                                                                                                                                                                                         |
| L1  | Low      | Open      | Still using `identity.subject`; provider-migration concern only.                                                                                                                                                                                                                                      |

Implementation devlog: `docs/devlog/2026-05-12.md`. Pre-launch tracker: `TODO.md`.
