import type { Topic } from '../../data/topics';

const CARD_ACCENT = ['bg-magic-500', 'bg-calm-500', 'bg-magic-500'] as const;

export function TopicScience({ topic }: { topic: Topic }) {
  return (
    <section className="py-24 bg-calm-900 text-white px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
        <i className="fa-solid fa-atom text-9xl absolute -top-10 -left-10 text-white" />
        <i className="fa-solid fa-brain text-9xl absolute bottom-10 right-10 text-white" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-magic-400 font-bold uppercase tracking-widest text-sm mb-2 block">
            Podstawy Naukowe
          </span>
          <h2 className="text-3xl md:text-4xl font-black mb-6">{topic.scienceHeadline}</h2>
          <p className="text-calm-100 text-lg">{topic.scienceSubheading}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {topic.scienceCards.map((card, i) => (
            <div
              key={i}
              className="bg-calm-800/50 p-8 rounded-3xl border border-calm-700 hover:bg-calm-800 transition"
            >
              <div
                className={`w-14 h-14 ${CARD_ACCENT[i]} rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg`}
              >
                <i className={card.icon} />
              </div>
              <h3 className="text-xl font-bold mb-3">{card.title}</h3>
              <p className="text-calm-200 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-calm-200/80 bg-calm-800/30 inline-block px-6 py-3 rounded-full border border-calm-700/50 mx-auto w-full max-w-2xl">
          <i className="fa-solid fa-circle-info mr-2" />
          <strong>Nota:</strong> Bajka pełni funkcję psychoedukacyjną. Nie zastępuje klinicznej
          psychoterapii.
        </div>
      </div>
    </section>
  );
}
