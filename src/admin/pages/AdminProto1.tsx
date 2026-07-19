/**
 * Prototype viewer: serves the standalone LP prototype (public/proto1/) inside
 * the admin panel. The prototype itself is a static, self-contained HTML page
 * iterated outside the app (see docs/devlog/2026-07-19.md) — embedding it via
 * iframe keeps its styles and scripts fully isolated from the admin bundle.
 */
export function AdminProto1() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Proto LP — mycie zębów</h1>
          <p className="text-sm text-slate-500">
            Prototyp nowego landing page (try-before-you-buy, copy pod środek Gaussa). Wersja do
            dyskusji — notatki decyzyjne na dole strony.
          </p>
        </div>
        <a
          href="/proto1/index.html"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Otwórz w nowej karcie
        </a>
      </div>
      <iframe
        src="/proto1/index.html"
        title="Prototyp LP mycie zębów"
        className="h-[calc(100vh-14rem)] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
      />
    </div>
  );
}
