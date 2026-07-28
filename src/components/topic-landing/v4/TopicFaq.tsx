import { LP_FAQ } from './lpContent';

export function TopicFaq() {
  return (
    <section className="pb-12 px-6 bg-cream-dark">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black text-navy mb-5">
          Pytania, które pewnie masz
        </h2>
        <div className="grid gap-2.5 max-w-3xl">
          {LP_FAQ.map((item) => (
            <details key={item.q} className="bg-white rounded-2xl px-5 py-4 shadow-sm">
              <summary className="font-extrabold text-navy cursor-pointer">{item.q}</summary>
              <p className="mt-2 text-sm text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
