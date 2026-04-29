import type { Topic } from '../../data/topics';
import { trackEvent } from '../../lib/telemetry';

export function TopicHero({ topic }: { topic: Topic }) {
  return (
    <header className="pt-32 pb-20 px-6 relative overflow-hidden bg-gradient-to-br from-calm-50 to-white">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-calm-100 text-calm-800 text-sm font-bold">
            <i className="fa-solid fa-star text-magic-500" />
            {topic.badge}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-calm-900 leading-tight">
            {topic.headline} <span className="text-calm-500">{topic.headlineAccent}</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed">
            {topic.intro}
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <a
              href="#kreator"
              onClick={() =>
                trackEvent('cta_create_book_clicked', {
                  location: 'topic_hero',
                  topicSlug: topic.slug,
                })
              }
              className="w-full sm:w-auto bg-magic-500 hover:bg-magic-600 text-white px-8 py-4 rounded-full font-extrabold text-lg shadow-xl shadow-magic-500/30 transition transform hover:-translate-y-1 text-center"
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-2" />
              WYGENERUJ BAJKĘ DLA MOJEGO DZIECKA
            </a>
          </div>
          <p className="text-sm text-gray-500 font-semibold text-center sm:text-left">
            <i className="fa-regular fa-clock text-calm-500 mr-1" />
            Bajka gotowa do czytania w 15 minut
          </p>
        </div>

        <div className="relative flex justify-center py-10">
          <div className="relative w-full max-w-md">
            <div className="aspect-[4/5] md:aspect-square bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-white transform rotate-3 hover:rotate-0 transition duration-500">
              <img
                src={topic.heroImage}
                alt={topic.heroImageAlt}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
            <div
              className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-50 flex items-center gap-4 animate-bounce"
              style={{ animationDuration: '3s' }}
            >
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl">
                <i className="fa-solid fa-shield-heart" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Gwarancja</p>
                <p className="text-sm font-black text-calm-900">100% Bezpiecznych Treści</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
