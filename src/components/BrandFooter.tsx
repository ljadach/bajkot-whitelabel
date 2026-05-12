/**
 * Minimal brand header for in-flow pages (landing book progress, vote,
 * dedication). Same wordmark as TopicNav on marketing pages but with no menu
 * and no CTA — the user is mid-wizard and shouldn't be pulled away. Used
 * only on landing flow; the authenticated flow keeps the global <Header>
 * because it carries Panel + avatar.
 */
export function BrandHeader() {
  return (
    <header className="w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
        <a href="/" className="flex items-center gap-2 shrink-0 no-underline">
          <i className="fa-solid fa-book-open text-calm-500 text-2xl" />
          <span className="font-extrabold text-xl text-calm-900 tracking-tight">Bajkoterapia</span>
        </a>
      </div>
    </header>
  );
}

/**
 * Minimal brand footer for in-flow pages (book progress, vote, dedication).
 * Just the wordmark + copyright — no menu, no contact block — so the page
 * stays focused on the wizard but still ends with a recognisable Bajkoterapia
 * sign-off. Matches the logo style used in the homepage hero / TopicNav.
 */
export function BrandFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white border-t border-calm-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-calm-800 font-extrabold text-xl no-underline"
        >
          <i className="fa-solid fa-book-open text-calm-500 text-2xl" />
          <span>Bajkoterapia</span>
        </a>
        <div className="text-xs text-slate-500 mt-3">
          © {year} Bajkoterapia by Trustee Interactive
        </div>
      </div>
    </footer>
  );
}
