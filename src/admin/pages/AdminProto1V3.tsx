/**
 * Prototype viewer: serves v3 of the LP prototype (public/proto1/v3.html) inside
 * the admin panel. Same iframe isolation as AdminProto1 — v3 applies the review
 * feedback from 2026-07-28 (product-first hero, gallery lightbox, PDF promo,
 * audiobook variant, science-before-reviews order).
 */
export function AdminProto1V3() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Proto LP v3 — mycie zębów</h1>
          <p className="text-sm text-slate-500">
            Trzecia iteracja po przeglądzie 28.07: opis produktu na górze, galeria zdjęć druku,
            promocja na PDF (59→49), wariant audiobook, nauka przed opiniami, link do Trustpilot.
          </p>
        </div>
        <a
          href="/proto1/v3.html"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Otwórz w nowej karcie
        </a>
      </div>
      <iframe
        src="/proto1/v3.html"
        title="Prototyp LP mycie zębów v3"
        className="h-[calc(100vh-14rem)] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
      />
    </div>
  );
}
