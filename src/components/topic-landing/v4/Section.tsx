/**
 * Shared shell for LP v4 sections: outer padding + centered max-w container.
 * `flushTop` glues a section to the previous one when both share a background
 * (FAQ sits directly under Safety). `containerClassName` extends the inner
 * wrapper — e.g. for grid layouts.
 */
export function Section({
  id,
  className = 'bg-white',
  containerClassName = '',
  flushTop = false,
  children,
}: {
  id?: string;
  className?: string;
  containerClassName?: string;
  flushTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`${flushTop ? 'pb-12' : 'py-12'} px-6 ${className}`}>
      <div className={`max-w-6xl mx-auto ${containerClassName}`}>{children}</div>
    </section>
  );
}

/** LP v4 section h2 + optional subtitle, with unified margins. */
export function SectionHeading({
  children,
  sub,
  center = false,
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <>
      <h2
        className={`text-xl md:text-3xl font-black text-lp-navy ${sub ? 'mb-2' : 'mb-6'} ${center ? 'text-center' : ''}`}
      >
        {children}
      </h2>
      {sub && (
        <p className={`text-lp-ink-soft max-w-2xl mb-6 ${center ? 'text-center mx-auto' : ''}`}>
          {sub}
        </p>
      )}
    </>
  );
}
