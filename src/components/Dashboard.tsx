import { Link } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function DashboardPage() {
  const isAdmin = useQuery(api.auth.isAdmin);
  const myOrders = useQuery(api.bookPipeline.getMyOrders);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-900 mb-8">Panel</h1>

      <div className="grid gap-4">
        <Link
          to="/book/order"
          className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-6 hover:border-neutral-300 hover:shadow-sm transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-neutral-900">Stwórz nową bajkę</div>
            <div className="text-sm text-neutral-500">
              Opisz sytuację dziecka i wygeneruj spersonalizowaną bajkę
            </div>
          </div>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-6 hover:border-neutral-300 hover:shadow-sm transition-all"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-white">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-neutral-900">Panel administracyjny</div>
              <div className="text-sm text-neutral-500">
                Prompty, zamówienia, logi, konfiguracja
              </div>
            </div>
          </Link>
        )}
      </div>

      {myOrders && myOrders.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Twoje bajki</h2>
          <div className="space-y-2">
            {myOrders.map((order) => (
              <Link
                key={order._id}
                to={
                  order.status === 'completed'
                    ? `/book/${order._id}/result`
                    : `/book/${order._id}/progress`
                }
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 transition-colors"
              >
                <div>
                  <span className="font-medium text-neutral-900">{order.childName}</span>
                  <span className="ml-2 text-xs text-neutral-400">
                    {new Date(order.createdAt).toLocaleDateString('pl-PL')}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    order.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : order.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : order.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {order.status === 'completed'
                    ? 'Gotowa'
                    : order.status === 'failed'
                      ? 'Błąd'
                      : order.status === 'paused'
                        ? 'Wstrzymana'
                        : 'W trakcie'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
