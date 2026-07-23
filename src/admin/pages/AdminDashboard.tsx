import { Link, useNavigate } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { STATUS_COLORS } from '../statusColors';
import { timeAgo } from '../../lib/formatTime';

const RECENT_LIMIT = 25;

// Statuses that need admin eyes: failures always, plus print orders (shipping).
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'paused']);

const NAV_CARDS = [
  {
    to: '/admin/batch',
    title: 'Book Lab',
    desc: 'Zamówienia, launch testów, prompty',
    color: 'bg-green-50 text-green-600',
  },
  {
    to: '/admin/mail',
    title: 'Mail',
    desc: 'Wyślij e-mail jako Bajkoterapia',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    to: '/admin/config',
    title: 'Config',
    desc: 'Konfiguracja systemu',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    to: '/admin/analytics',
    title: 'Analytics',
    desc: 'Ruch i konwersje',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    to: '/admin/logs',
    title: 'Logs',
    desc: 'Logi LLM i backendu',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    to: '/admin/stripe',
    title: 'Stripe',
    desc: 'Sandbox płatności',
    color: 'bg-indigo-50 text-indigo-600',
  },
];

export function AdminDashboard() {
  const orders = useQuery(api.admin.bookBatch.listOrders);
  const navigate = useNavigate();

  const recent = orders?.slice(0, RECENT_LIMIT);
  const failedCount = orders?.filter((o) => o.status === 'failed').length ?? 0;
  const inProgressCount = orders?.filter((o) => !TERMINAL_STATUSES.has(o.status)).length ?? 0;
  const unshippedPrints =
    orders?.filter((o) => o.format === 'pdf_print' && o.paymentStatus === 'completed').length ?? 0;

  const openOrder = (orderId: string) => {
    void navigate(`/admin/batch?tab=orders&orderId=${encodeURIComponent(orderId)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">Ostatnie zamówienia i nawigacja</p>
        </div>
        {orders && (
          <div className="flex items-center gap-2 text-xs">
            {inProgressCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 font-semibold">
                <span className="w-3 h-3 spinner border-blue-500 border-t-transparent" />
                {inProgressCount} w toku
              </span>
            )}
            {failedCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2.5 py-1 font-semibold">
                {failedCount} failed
              </span>
            )}
            {unshippedPrints > 0 && (
              <span
                className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 px-2.5 py-1 font-semibold"
                title="Opłacone zamówienia z drukiem — sprawdź, czy wysłane"
              >
                📚 {unshippedPrints} druk
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recent orders — the main thing */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Ostatnie zamówienia</h2>
          <Link
            to="/admin/batch?tab=orders"
            className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Wszystkie &rarr;
          </Link>
        </div>

        {!recent ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 spinner" />
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-neutral-400">
            Brak zamówień. Odpal testowe z Book Lab.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-400 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Dziecko</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Płatność</th>
                  <th className="px-5 py-3 font-medium">E-mail</th>
                  <th className="px-5 py-3 font-medium">Błąd</th>
                  <th className="px-5 py-3 font-medium text-right">Utworzono</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr
                    key={order._id}
                    onClick={() => openOrder(order._id)}
                    className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium text-neutral-700">{order.childName}</span>
                      {order.format === 'pdf_print' && (
                        <span
                          className="ml-1.5 inline-flex items-center text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded-full"
                          title="Zamówiona wersja drukowana — wymagana wysyłka"
                        >
                          📚 DRUK
                        </span>
                      )}
                      {order.skipQaReviews && (
                        <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          FAST
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] ?? 'bg-neutral-100 text-neutral-600'}`}
                      >
                        {order.status}
                      </span>
                      {order.currentAgent && !TERMINAL_STATUSES.has(order.status) && (
                        <span className="ml-1.5 text-xs text-neutral-400">
                          {order.currentAgent}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {order.paymentStatus === 'completed' ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          OPŁACONE
                        </span>
                      ) : order.paymentStatus === 'failed' ? (
                        <span className="text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                          NIEUDANA
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-500 text-xs max-w-[180px] truncate">
                      {order.email ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-red-500 text-xs max-w-[200px] truncate">
                      {order.error ?? ''}
                    </td>
                    <td className="px-5 py-3 text-neutral-400 text-right whitespace-nowrap">
                      {timeAgo(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NAV_CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:shadow-sm transition-all"
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${card.color}`}
            >
              {card.title[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-700 group-hover:text-neutral-900">
                {card.title}
              </p>
              <p className="text-xs text-neutral-400">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
