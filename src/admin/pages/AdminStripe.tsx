import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

type ConfigStatus = {
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  priceIdConfigured: boolean;
  appUrlConfigured: boolean;
};

function ConfigChecklist({ status }: { status: ConfigStatus | undefined }) {
  if (!status) return <div className="text-sm text-neutral-500">Ładowanie konfiguracji…</div>;
  const rows: Array<{ label: string; ok: boolean; envVar: string }> = [
    { label: 'STRIPE_SECRET_KEY', ok: status.secretKeyConfigured, envVar: 'STRIPE_SECRET_KEY' },
    {
      label: 'STRIPE_WEBHOOK_SECRET',
      ok: status.webhookSecretConfigured,
      envVar: 'STRIPE_WEBHOOK_SECRET',
    },
    { label: 'STRIPE_BOOK_PRICE_ID', ok: status.priceIdConfigured, envVar: 'STRIPE_BOOK_PRICE_ID' },
    { label: 'APP_URL', ok: status.appUrlConfigured, envVar: 'APP_URL' },
  ];
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map((row) => (
        <li key={row.envVar} className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${row.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
            aria-label={row.ok ? 'configured' : 'missing'}
          />
          <code className="text-neutral-700 font-mono">{row.label}</code>
          <span className={row.ok ? 'text-emerald-700' : 'text-rose-700'}>
            {row.ok ? 'OK' : 'brak'}
          </span>
        </li>
      ))}
    </ul>
  );
}

const PAYMENT_BADGE_STYLES: Record<string, { className: string; label: string }> = {
  completed: { className: 'bg-emerald-100 text-emerald-800', label: 'completed' },
  failed: { className: 'bg-rose-100 text-rose-800', label: 'failed' },
  pending: { className: 'bg-amber-100 text-amber-800', label: 'pending' },
};

function PaymentBadge({ status }: { status: string | null }) {
  const style = (status && PAYMENT_BADGE_STYLES[status]) ?? {
    className: 'bg-neutral-100 text-neutral-600',
    label: '—',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${style.className}`}
    >
      {style.label}
    </span>
  );
}

export function AdminStripe() {
  const configStatus = useQuery(api.admin.stripe.stripeConfigStatus);
  const orders = useQuery(api.admin.stripe.listTestOrders);
  const createTestOrder = useMutation(api.admin.stripe.createTestOrder);
  const deleteTestOrder = useMutation(api.admin.stripe.deleteTestOrder);
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

  const [busyId, setBusyId] = useState<Id<'bookOrders'> | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allConfigured =
    configStatus?.secretKeyConfigured &&
    configStatus?.webhookSecretConfigured &&
    configStatus?.priceIdConfigured &&
    configStatus?.appUrlConfigured;

  async function handleCreate() {
    setError(null);
    setCreating(true);
    try {
      await createTestOrder({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleCheckout(bookOrderId: Id<'bookOrders'>) {
    setError(null);
    setBusyId(bookOrderId);
    try {
      const result = await createCheckoutSession({
        bookOrderId,
        returnPath: '/admin/stripe',
      });
      window.location.assign(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusyId(null);
    }
  }

  async function handleDelete(bookOrderId: Id<'bookOrders'>) {
    setError(null);
    setBusyId(bookOrderId);
    try {
      await deleteTestOrder({ bookOrderId });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Stripe — sandbox testów</h1>
        <p className="text-sm text-neutral-500 mt-1">
          One-shot Checkout per book order. Webhook nadpisuje{' '}
          <code className="font-mono text-neutral-700">paymentStatus = 'completed'</code>.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-neutral-200 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 mb-3">
          Konfiguracja
        </h2>
        <ConfigChecklist status={configStatus} />
        {!allConfigured && configStatus !== undefined && (
          <p className="mt-3 text-xs text-rose-600">
            Brakujące zmienne ustaw przez <code>npx convex env set KEY=value</code>. Webhook URL:{' '}
            <code>{`<deployment>.convex.site/stripe/webhook`}</code>
          </p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Testowe zamówienia
          </h2>
          <button
            onClick={() => {
              void handleCreate();
            }}
            disabled={creating}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {creating ? 'Tworzenie…' : '+ Nowe zamówienie testowe'}
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
            {error}
          </div>
        )}

        {orders === undefined ? (
          <div className="text-sm text-neutral-500">Ładowanie…</div>
        ) : orders.length === 0 ? (
          <div className="text-sm text-neutral-500">
            Brak testowych zamówień. Stwórz nowe, żeby uruchomić Checkout.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {orders.map((order) => (
              <li key={order._id} className="py-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900 truncate">{order.childName}</div>
                  <div className="text-xs text-neutral-500 font-mono truncate">
                    {order._id}
                    {order.stripeSessionId && (
                      <>
                        {' · '}
                        <span title={order.stripeSessionId}>
                          {order.stripeSessionId.slice(0, 14)}…
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <PaymentBadge status={order.paymentStatus} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      void handleCheckout(order._id);
                    }}
                    disabled={busyId === order._id || order.paymentStatus === 'completed'}
                    className="text-xs font-medium px-2.5 py-1 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {order.paymentStatus === 'completed' ? 'Opłacone' : 'Otwórz Checkout'}
                  </button>
                  <button
                    onClick={() => {
                      void handleDelete(order._id);
                    }}
                    disabled={busyId === order._id}
                    className="text-xs font-medium px-2.5 py-1 rounded-md text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                  >
                    Usuń
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 p-5 text-sm text-neutral-600 space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Webhook smoke test
        </h2>
        <p>
          Lokalnie:{' '}
          <code className="font-mono text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
            stripe listen --forward-to {'<dep>'}.convex.site/stripe/webhook
          </code>
        </p>
        <p>
          Test card:{' '}
          <code className="font-mono text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
            4242 4242 4242 4242
          </code>{' '}
          · dowolna data w przyszłości · dowolne CVC.
        </p>
      </section>
    </div>
  );
}
