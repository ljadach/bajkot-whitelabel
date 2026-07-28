import type { Topic } from '../../../data/topics';
import { SAFETY_POINTS, SPREAD_IMAGE } from './lpContent';
import { CtaButton } from './CtaButton';

export function TopicSafety({ topic }: { topic: Topic }) {
  return (
    <section className="py-12 px-6 bg-cream-dark">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-navy mb-4">
            Bajkoterapia jest bezpieczna
          </h2>
          <ul className="grid gap-3">
            {SAFETY_POINTS.map((p) => (
              <li key={p.title} className="bg-white rounded-2xl px-4 py-3 shadow-sm text-sm">
                <b className="text-navy">{p.title}</b> {p.body}
              </li>
            ))}
            <li className="bg-white rounded-2xl px-4 py-3 shadow-sm text-sm">
              <b className="text-navy">Dane dziecka służą tylko bajce.</b> To, co opowiesz o swoim
              dziecku, służy do napisania jego bajki. Nie sprzedajemy tych informacji, nie
              pokazujemy ich innym rodzicom i nie używamy do reklam. Szczegóły:{' '}
              <a href="/polityka-prywatnosci" className="text-teallp-text font-bold">
                polityka prywatności
              </a>
              . Bajkoterapia to projekt polskiej firmy Trustee Interactive z Warszawy.
            </li>
          </ul>
          <div className="bg-amberlp/10 border-2 border-dashed border-amberlp rounded-3xl px-5 py-4 mt-5 font-bold text-navy text-sm">
            Najlepsza gwarancja to ta, której nie musisz używać:{' '}
            <b>podgląd bajki czytasz przed zapłatą</b>. Nie podoba się — nie płacisz i nikt nie zada
            Ci ani jednego pytania.
          </div>
          <div className="mt-5">
            <CtaButton topicSlug={topic.slug} location="safety_v4" />
          </div>
        </div>
        <img
          src={SPREAD_IMAGE}
          alt="Rozkładówka bajki: bohater z magiczną szczoteczką-latarnią i zabawne potworki"
          loading="lazy"
          className="rounded-3xl shadow-xl"
          width={900}
          height={900}
        />
      </div>
    </section>
  );
}
