/**
 * Prototype viewer: serves v2 of the LP prototype (public/proto1/v2.html) inside
 * the admin panel. Same iframe isolation as AdminProto1 — v2 applies the review
 * feedback from 2026-07-27 (pricing boxes, sample book, no refund promises).
 */
export function AdminProto1V2() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Proto LP v2 — mycie zębów</h1>
          <p className="text-sm text-slate-500">
            Druga iteracja po przeglądzie 27.07: boxy cenowe 49/99, przykładowa bajka do pobrania,
            zdjęcia druku, zwroty wycięte. Notatki decyzyjne na dole strony.
          </p>
        </div>
        <a
          href="/proto1/v2.html"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Otwórz w nowej karcie
        </a>
      </div>
      <iframe
        src="/proto1/v2.html"
        title="Prototyp LP mycie zębów v2"
        className="h-[calc(100vh-14rem)] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
      />
    </div>
  );
}
