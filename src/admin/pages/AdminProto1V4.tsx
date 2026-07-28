/**
 * Prototype viewer: serves v4 of the LP prototype (public/proto1/v4.html) inside
 * the admin panel. v4 restructures the page to the agreed section skeleton
 * (product → science → reviews → objections → promo → engagement), adds a hero
 * photo carousel and a PDF viewer subpage.
 */
export function AdminProto1V4() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Proto LP v4 — mycie zębów</h1>
          <p className="text-sm text-slate-500">
            Czwarta iteracja: struktura wg szkieletu z 28.07, karuzela zdjęć w hero, podstrona z
            viewerem PDF, CTA konsekwentnie „Stwórz bajkę”.
          </p>
        </div>
        <a
          href="/proto1/v4.html"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Otwórz w nowej karcie
        </a>
      </div>
      <iframe
        src="/proto1/v4.html"
        title="Prototyp LP mycie zębów v4"
        className="h-[calc(100vh-14rem)] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
      />
    </div>
  );
}
