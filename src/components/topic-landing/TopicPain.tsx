import type { Topic } from '../../data/topics';

export function TopicPain({ topic }: { topic: Topic }) {
  return (
    <section className="py-24 bg-white px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-calm-900 mb-6">
            {topic.painHeadline}
          </h2>
        </div>

        <div className="bg-calm-50/50 rounded-3xl p-8 md:p-12 border border-calm-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-calm-100 rounded-full blur-3xl opacity-50 -z-10 -mt-10 -mr-10" />

          <p className="text-lg text-gray-700 leading-relaxed mb-6 font-medium">
            {topic.painEmpathy}
          </p>

          <p className="text-lg text-gray-700 leading-relaxed mb-8">{topic.painRootCause}</p>

          <div className="bg-white rounded-2xl p-6 border-l-4 border-magic-500 shadow-md">
            <p className="text-xl font-bold text-calm-900">{topic.painCta}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
