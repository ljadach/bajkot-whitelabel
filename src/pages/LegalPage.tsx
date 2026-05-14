import { PageShell } from '../components/layout/PageShell';
import type { LegalDoc } from '../data/legalDocs';

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const effectiveDateLabel = new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(doc.effectiveDate));

  return (
    <PageShell>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-20">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            {doc.title}
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            Wersja {doc.version} · obowiązuje od {effectiveDateLabel}
          </p>
        </header>

        {doc.intro && (
          <p className="mb-8 text-base text-neutral-700 leading-relaxed">{doc.intro}</p>
        )}

        <div className="space-y-10">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-neutral-900 mb-3">{section.heading}</h2>
              <div className="space-y-3 text-[15px] text-neutral-700 leading-[1.7]">
                {section.paragraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 pt-6 border-t border-neutral-200 text-sm text-neutral-500">
          Kontakt w sprawach związanych z dokumentem:{' '}
          <a className="text-accent hover:underline" href="mailto:info@bajkoterapia.org">
            info@bajkoterapia.org
          </a>
        </footer>
      </article>
    </PageShell>
  );
}
