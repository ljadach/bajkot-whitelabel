# Plan integracji płatności — AITutorc Freemium

> Data: 2026-03-11
> Status: implementation-ready v1
> Zakres: aktywny flow `/plan`, bez legacy `PaymentStep`

## TL;DR

Wdrożenie powinno iść przez **Stripe Direct + Convex**, ale nie jako osobny krok `payment`.
Billing ma być wpięty w **dostęp do modułów na `/plan`**:

- user widzi cały outline kursu,
- może odblokować **2 dowolne moduły za darmo**,
- próba otwarcia 3. nieodblokowanego modułu pokazuje paywall,
- po zakupie wraca do `/plan` i dostaje pełny dostęp,
- backend egzekwuje dostęp do handbooków, żeby paywall nie był tylko UI.

## Fact-check: Clerk Billing i UE

### Zweryfikowane na 2026-03-11

Teza **"Clerk Billing odpada, bo jest niedostępny w EU"** jest dziś nieprawdziwa.

- Clerk rozszerzył Billing na kraje wspierane przez Stripe poza USA.
- Clerk docs podają dziś kraje niewspierane: `BR`, `IN`, `MY`, `MX`, `SG`, `TH`.
- Polska jest wspierana przez Stripe, więc **EU / PL nie są blockerem geograficznym**.

### Dlaczego mimo to nie wybieramy Clerk Billing

Powody praktyczne dla PL/EU:

- tylko **USD**,
- brak **tax / VAT**,
- Clerk FAQ nadal wskazuje brak wsparcia dla dodatkowej autoryzacji typu **3D Secure**,
- beta / experimental API,
- 0.7% dodatkowego fee,
- plany w Clerk nie synchronizują się ze Stripe Billing.

Wniosek: **Clerk Billing odpada nie przez EU, tylko przez walutę, podatki i compliance.**

### Snippety referencyjne z dokumentacji Clerk

To są poprawne przykłady dla React Router, ale w tym projekcie traktujemy je jako materiał referencyjny, nie ścieżkę wdrożeniową.

```tsx
import { PricingTable } from '@clerk/react-router';

export function PricingPage() {
  return <PricingTable />;
}
```

```tsx
import { Show } from '@clerk/react-router';

export function ProOnly({ children }: { children: React.ReactNode }) {
  return (
    <Show when={{ plan: 'pro' }} fallback={<p>Upgrade required.</p>}>
      {children}
    </Show>
  );
}
```

## Decyzje produktowe v1

To są założenia, pod które plan jest zoptymalizowany:

1. Paywall żyje na `/plan`, nie w osobnym kroku checkoutowym.
2. `currentStep` nie bierze udziału w billing logic.
3. User widzi cały outline kursu i teaser każdego modułu.
4. User może odblokować **2 dowolne moduły** za darmo.
5. Free unlock jest trwały dla danego kursu i nie przepada po reloadzie.
6. Próba otwarcia 3. zablokowanego modułu otwiera paywall.
7. Po zakupie user wraca do `/plan` albo `/plan/:pageIndex`, nie do `complete`.
8. v1 zostawia obecną generację wszystkich modułów naraz.
9. v1 egzekwuje dostęp **na backendzie**, nie tylko w UI.

## Rzeczywisty stan codebase

### Aktywny flow

Obecny flow to:

- `chat`
- `verification`
- `summary`
- `plan`
- `complete`

Nie ma aktywnego kroku `payment`.

### Gdzie naprawdę żyje kurs

Realny punkt integracji to:

- `src/components/steps/PlanStep.tsx`
- `src/components/plan/BentoDashboard.tsx`
- `src/components/plan/CourseSection.tsx`
- `src/components/plan/BentoModuleCard.tsx`
- `src/components/course/ScrollReaderView.tsx`

### Krytyczna luka w obecnym API

`convex/courseDocuments.ts` zwraca dziś wszystkie dokumenty razem z `handbook` dla zalogowanego usera.

To znaczy:

- frontendowy lock na karcie modułu nie wystarczy,
- user może pobrać treść locked modułów przez publiczny query,
- billing trzeba wdrożyć razem z **backendowym filtrowaniem dostępu**.

### Generacja kursu już dziś robi wszystkie moduły

`convex/courseAi.ts:startCourseGeneration` generuje wszystkie strony outline naraz.

To nie jest optymalne kosztowo, ale dla v1 jest akceptowalne, bo:

- minimalizuje zakres zmian,
- nie blokuje wdrożenia billingowego,
- pozwala skupić się na egzekwowaniu dostępu.

**Deferred v2:** lazy generation tylko dla unlocked / paid modules.

### Legacy do usunięcia

`profiles.updatePaymentStatus` i demo `PaymentStep.tsx` nie mogą zostać użyte jako baza wdrożenia.

Powód:

- to stary model "client marks payment complete",
- był już oznaczony jako luka bezpieczeństwa,
- nie pasuje do aktualnego flow `/plan`.

## Architektura docelowa v1

```text
Dashboard /plan
  -> user sees all modules
  -> clicks module card
  -> frontend asks backend: is this page accessible?
    -> yes: navigate to /plan/:pageIndex and load handbook
    -> no but free unlocks remaining: show free-unlock prompt
    -> no and no free unlocks remaining: show upgrade prompt

Upgrade prompt
  -> Convex Node action creates Stripe Checkout Session
  -> browser redirects to Stripe Checkout
  -> Stripe webhook hits Convex HTTP route
  -> Node action verifies signature
  -> internal mutation syncs subscription
  -> frontend refresh sees active subscription
  -> locked module becomes readable
```

## Najważniejsza decyzja techniczna

### Nie przechowujemy free access per `courseDocumentId`

To byłby błąd, bo `courseDocumentId` zmienia się przy regeneracji dokumentów.

Obecna generacja:

- kasuje stare `courseDocuments`,
- tworzy nowe rekordy,
- nadaje nowe `_id`.

Dlatego free unlock musi być zapisany względem:

- `courseId`
- `pageIndex`

a nie względem `courseDocumentId`.

## Model danych

### 1. `subscriptions`

```ts
subscriptions: defineTable({
  clerkUserId: v.string(),
  courseId: v.optional(v.id('courses')),
  stripeCustomerId: v.string(),
  stripeSubscriptionId: v.string(),
  stripePriceId: v.string(),
  status: v.union(
    v.literal('incomplete'),
    v.literal('trialing'),
    v.literal('active'),
    v.literal('past_due'),
    v.literal('canceled'),
    v.literal('unpaid'),
  ),
  cancelAtPeriodEnd: v.boolean(),
  currentPeriodEnd: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_clerk_user', ['clerkUserId'])
  .index('by_stripe_customer', ['stripeCustomerId'])
  .index('by_stripe_subscription', ['stripeSubscriptionId']);
```

Uwagi:

- `courseId` może być opcjonalne w v1, jeśli subskrypcja jest globalna dla usera.
- jeśli plan ma odblokowywać całą aplikację, `courseId` może zostać puste.

### 2. `moduleUnlocks`

To jest ledger darmowych unlocków.

```ts
moduleUnlocks: defineTable({
  clerkUserId: v.string(),
  courseId: v.id('courses'),
  pageIndex: v.number(),
  source: v.union(v.literal('free_trial')),
  createdAt: v.number(),
})
  .index('by_clerk_user', ['clerkUserId'])
  .index('by_clerk_user_course', ['clerkUserId', 'courseId'])
  .index('by_clerk_user_course_page', ['clerkUserId', 'courseId', 'pageIndex']);
```

Uwagi:

- v1 zakłada max 2 wiersze `free_trial` na user + course.
- mutation unlockująca musi być idempotentna.

### 3. Legacy cleanup

Docelowo do usunięcia z `userProfiles`:

- `paymentStatus`
- `stripeSessionId`

Nie są dobrym źródłem prawdy dla subskrypcji.

## Backend API v1

### Nowy moduł `convex/billing.ts`

Powinien zawierać logikę produktu, nie Stripe SDK.

Proponowane funkcje:

- `getAccessState`
- `unlockFreeModule`
- `getReadablePageAccess`

#### `getAccessState`

Cel:

- zwrócić stan paywalla do dashboardu i paywalla.

Przykładowy shape:

```ts
{
  courseId: Id<"courses"> | null,
  subscriptionStatus: "none" | "active" | "past_due" | "canceled",
  isPro: boolean,
  freeUnlockLimit: 2,
  freeUnlocksUsed: number,
  unlockedPageIndexes: number[],
}
```

#### `unlockFreeModule`

Cel:

- zapisać trwały unlock dla jednej strony kursu.

Zasady:

- auth required,
- musi istnieć `courseId`,
- max 2 free unlocks per `clerkUserId + courseId`,
- drugi zapis tego samego `pageIndex` zwraca success bez duplikatu,
- mutation nie może ufać frontendowi w liczeniu limitu.

#### `getReadablePageAccess`

Cel:

- backendowy gate dla readera.

Wejście:

```ts
{
  pageIndex: v.number();
}
```

Wyjście:

```ts
v.union(
  v.object({
    kind: v.literal("readable"),
    document: ...
  }),
  v.object({
    kind: v.literal("locked"),
    reason: v.union(v.literal("upgrade_required"), v.literal("free_unlock_available")),
  }),
  v.null()
)
```

To jest ważniejsze niż frontendowy hook.

### Zmiany w `convex/courseDocuments.ts`

Obecne `getCourseDocuments()` nie może dalej zwracać pełnych handbooków do dashboardu.

#### Rozdzielić API na dwa poziomy

1. `getPlanDocuments`
2. `getReadableDocumentByPage`

#### `getPlanDocuments`

Do użycia przez dashboard `/plan`.

Powinien zwracać tylko:

- `_id`
- `pageIndex`
- `pageTitle`
- `status`
- `error`

Bez:

- `handbook`
- pełnej treści chapterów

#### `getReadableDocumentByPage`

Do użycia przez reader `/plan/:pageIndex`.

Powinien:

- najpierw sprawdzić access przez billing logic,
- zwrócić pełen `handbook` tylko jeśli user ma dostęp,
- w przeciwnym razie zwrócić `kind: "locked"`.

### Nowy moduł `convex/stripe.ts`

To jest warstwa integracyjna Stripe.

Powinien działać w Node runtime.

Proponowane funkcje:

- `createCheckoutSession`
- `createCustomerPortalSession`
- `verifyWebhookEvent`
- `syncSubscriptionFromEvent`

#### Snippet: create checkout session

```ts
'use node';

import Stripe from 'stripe';
import { action } from './_generated/server';
import { v } from 'convex/values';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const createCheckoutSession = action({
  args: {
    returnPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.APP_URL}${args.returnPath ?? '/plan'}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}${args.returnPath ?? '/plan'}?checkout=cancelled`,
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      client_reference_id: identity.subject,
      metadata: {
        clerkUserId: identity.subject,
      },
    });

    return { url: session.url };
  },
});
```

#### Snippet: create customer portal session

```ts
'use node';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCustomerPortalSession(stripeCustomerId: string) {
  return await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.APP_URL}/settings`,
  });
}
```

### Nowy moduł `convex/stripeHttp.ts`

HTTP action odbiera raw body i przekazuje je do Node action.

#### Snippet: webhook receiver

```ts
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

export const receiveWebhook = httpAction(async (ctx, request) => {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  await ctx.runAction(internal.stripe.verifyWebhookEvent, {
    payload,
    signature,
  });

  return new Response('ok', { status: 200 });
});
```

#### Snippet: verify webhook in Node runtime

```ts
'use node';

import Stripe from 'stripe';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const verifyWebhookEvent = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const event = stripe.webhooks.constructEvent(
      args.payload,
      args.signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    await ctx.runMutation(internal.stripe.syncSubscriptionFromEvent, {
      eventType: event.type,
      objectJson: JSON.stringify(event.data.object),
    });
  },
});
```

#### `syncSubscriptionFromEvent`

To powinno:

- mapować Stripe eventy na stan aplikacyjny,
- upsertować rekord w `subscriptions`,
- być idempotentne,
- nie robić logiki UI.

Eventy startowe:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Security hardening

To nie jest opcjonalne.

Przed rolloutem trzeba:

- usunąć publiczne przejście na paid state z `profiles.updatePaymentStatus`,
- nie ustawiać `currentStep: "complete"` po płatności,
- nie opierać billing state o klienta,
- nie zwracać locked treści przez publiczne query.

## Frontend integration plan

### 1. `src/components/steps/PlanStep.tsx`

To jest główny punkt integracji.

#### Zmiany

- dashboard query ma przejść z `api.courseDocuments.getCourseDocuments` na `api.courseDocuments.getPlanDocuments`,
- reader ma ładować **jeden** dokument przez `api.courseDocuments.getReadableDocumentByPage`,
- `handleSelectPage(index)` nie powinno bezwarunkowo nawigować do `/plan/${index}`,
- jeśli moduł jest zablokowany i free unlock dostępny, pokazujemy `FreeUnlockPrompt`,
- jeśli moduł zablokowany i limit zużyty, pokazujemy `UpgradePrompt`.

#### Dlaczego

To jest jedyne miejsce, które widzi:

- dashboard,
- routing `/plan/:pageIndex`,
- aktywny dokument,
- przejście między kartą modułu a readerem.

### 2. `src/components/plan/BentoModuleCard.tsx`

Tu trzeba dodać jawny stan `locked`.

#### UI states

- `ready`
- `in_progress`
- `completed`
- `generating`
- `locked_free_available`
- `locked_upgrade_required`

#### UX v1

- locked karta nadal pokazuje title + teaser + summary,
- CTA nie brzmi `Start module`, tylko:
  - `Unlock free`
  - albo `Upgrade to Pro`

### 3. `src/components/course/ScrollReaderView.tsx`

Aktywny reader to właśnie ten komponent.

W v1 nie powinien sam decydować o locku.

Plan:

- `PlanStep` rozstrzyga, czy current page jest readable,
- jeśli tak, renderuje `ScrollReaderView`,
- jeśli nie, renderuje `LockedModuleView`.

To trzyma logikę dostępu w jednym miejscu.

### 4. `src/components/SettingsPage.tsx`

Tu dodajemy:

- status subskrypcji,
- link `Manage billing`,
- wejście do Stripe Customer Portal.

### 5. `src/pages/PricingPage.tsx`

Tu można zostawić marketingowy cennik, ale trzeba go urealnić względem billing rollout:

- spójna cena,
- spójny opis free tier,
- usunąć messaging typu "free until end of March", jeśli rollout paywalla już wchodzi.

## UI components do dodania

### `src/components/billing/FreeUnlockPrompt.tsx`

Cel:

- przed wejściem w moduł zapytać usera, czy chce zużyć jeden z 2 free unlocków.

Musi pokazywać:

- numer / tytuł modułu,
- ile unlocków zostało,
- CTA `Unlock this module`,
- CTA `Not now`.

### `src/components/billing/UpgradePrompt.tsx`

Cel:

- paywall po wyczerpaniu dwóch unlocków.

Musi mieć:

- jasny value prop,
- CTA `Upgrade to Pro`,
- secondary CTA `Back to plan`,
- opcjonalnie listę: pełny dostęp, ćwiczenia, kolejne moduły, przyszłe aktualizacje.

### `src/components/billing/LockedModuleView.tsx`

Cel:

- obsłużyć bezpośrednie wejście na `/plan/:pageIndex` bez dostępu.

To nie jest modal.
To pełny ekran readera w stanie locked.

## Minimalna ścieżka wdrożenia v1

### Faza 0: bezpieczeństwo i API

1. Usunąć / zdeprecjonować `profiles.updatePaymentStatus`.
2. Rozdzielić `courseDocuments` na summary query i protected reader query.
3. Wprowadzić backend access check przed zwrotem `handbook`.

### Faza 1: model danych

1. Dodać `subscriptions`.
2. Dodać `moduleUnlocks`.
3. Upewnić się, że każdy aktywny user ma `courseId` przed billing rolloutem.

### Faza 2: Stripe

1. `npm install stripe`
2. Dodać `convex/stripe.ts`
3. Dodać `convex/stripeHttp.ts`
4. Dodać route `/stripe/webhook` w `convex/http.ts`
5. Ustawić env vars:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
APP_URL=https://...
```

### Faza 3: `/plan` gating

1. Dodać `billing.getAccessState`
2. Dodać `billing.unlockFreeModule`
3. Zmienić `PlanStep` na access-aware flow
4. Dodać `FreeUnlockPrompt`
5. Dodać `UpgradePrompt`
6. Dodać `LockedModuleView`

### Faza 4: settings i polish

1. Dodać portal link w settings
2. Dodać telemetry:
   - `module_unlock_started`
   - `module_unlocked_free`
   - `upgrade_prompt_viewed`
   - `checkout_started`
   - `checkout_completed`
   - `customer_portal_opened`
3. Dodać retry-safe webhook processing
4. Przetestować Stripe test mode end to end

## Ścieżka dostępu v1

### Dashboard `/plan`

- widoczny cały course outline,
- cards pokazują status i teaser,
- locked module nie ładuje readera bez checku.

### Reader `/plan/:pageIndex`

Scenariusze:

1. **Subscription active**
   - pełen dostęp do wszystkich modułów

2. **Free unlocked module**
   - pełen dostęp tylko do wcześniej odblokowanych modułów

3. **Not unlocked, but free unlocks remain**
   - render `LockedModuleView` z CTA `Unlock free`

4. **Not unlocked, no free unlocks left**
   - render `LockedModuleView` z CTA `Upgrade to Pro`

## Świadomie odłożone

Nie robimy w v1:

- lazy generation tylko dla paid modules,
- annual plan,
- kuponów,
- trial period,
- invoice PDF / custom receipt flow,
- team billing,
- rozliczania Business / Enterprise przez Stripe w tym samym wdrożeniu.

## Otwarte decyzje produktowe

Trzeba potwierdzić przed wdrożeniem:

1. Cena finalna:
   - dokument historycznie mówi o `80 PLN`,
   - public pricing page dziś komunikuje inne liczby,
   - to trzeba ujednolicić przed rolloutem.

2. Czy subskrypcja ma odblokowywać:
   - tylko Individual course,
   - czy globalnie całe konto?

3. Czy free unlock ma być:
   - per kurs,
   - czy per user globalnie?

4. Czy zostawiamy generację wszystkich modułów upfront po wejściu na `/plan`,
   - czy odkładamy optymalizację kosztową do v2?

## Rekomendacja końcowa

Wdrożyć **Stripe Direct v1** według powyższego planu, z naciskiem na:

- backend access control przed readerem,
- free unlock ledger oparty o `courseId + pageIndex`,
- checkout powiązany z `/plan`, nie z wizard step,
- całkowite odcięcie legacy `PaymentStep`.

To jest najmniejsza sensowna implementacja, która:

- pasuje do aktualnego kodu,
- nie zostawia publicznego bypassu,
- nie wymaga przebudowy całego onboarding flow,
- zostawia miejsce na późniejsze obniżenie kosztu generacji.

## Źródła

- [Clerk Billing overview](https://clerk.com/docs/guides/how-clerk-works/billing)
- [Clerk Billing FAQ](https://clerk.com/docs/guides/how-clerk-works/billing/faq)
- [Clerk changelog: global support for Billing](https://clerk.com/changelog/2025-05-13-billing-global-support)
- [Clerk component docs: PricingTable](https://github.com/clerk/clerk-docs/blob/main/docs/reference/components/billing/pricing-table.mdx)
- [Clerk component docs: Show](https://github.com/clerk/clerk-docs/blob/main/docs/reference/components/control/show.mdx)
- [Stripe Global availability](https://stripe.com/global)
- [Stripe pricing Poland](https://stripe.com/en-pl/pricing)
- [Stripe Checkout for subscriptions](https://docs.stripe.com/payments/checkout/build-subscriptions)
- [Stripe Tax with Checkout](https://docs.stripe.com/tax/checkout)
- [Stripe Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Stripe webhooks and signature verification](https://docs.stripe.com/webhooks)
- [Convex runtimes](https://docs.convex.dev/functions/runtimes)
- [Convex HTTP actions](https://docs.convex.dev/functions/http-actions)
- [Convex actions](https://docs.convex.dev/functions/actions)
- [Stripe + Convex pattern](https://stack.convex.dev/stripe-with-convex)
