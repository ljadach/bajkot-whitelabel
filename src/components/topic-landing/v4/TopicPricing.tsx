import type { Topic } from '../../../data/topics';
import { PRICING, GENERATION_MINUTES } from '../../../data/pricing';
import { CtaButton } from './CtaButton';

export function TopicPricing({ topic }: { topic: Topic }) {
  return (
    <section className="py-12 px-6 bg-white" id="cennik">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-black text-navy text-center mb-2">
          Prosty wybór. Bez gwiazdek.
        </h2>
        <p className="text-ink-soft text-center max-w-2xl mx-auto mb-8">
          W każdym wariancie najpierw czytasz podgląd bajki za darmo. Płacisz dopiero wtedy, gdy
          chcesz ją zatrzymać.
        </p>
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <div className="relative bg-white border-[3px] border-amberlp rounded-3xl p-6 flex flex-col shadow-lg">
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amberlp text-navy font-black text-xs px-4 py-1.5 rounded-full whitespace-nowrap">
              Najczęściej zamawiane
            </span>
            <h3 className="font-black text-navy mb-1">Książeczka w PDF</h3>
            <span className="self-start bg-red-100 text-red-800 font-black text-xs px-3 py-0.5 rounded-full mb-1">
              Promocja
            </span>
            <p className="text-3xl font-black text-navy my-1">
              <span className="text-lg text-ink-soft line-through mr-2">
                {PRICING.pdf.regular} zł
              </span>
              {PRICING.pdf.promo} zł
            </p>
            <p className="text-[0.7rem] text-ink-soft mb-3">
              Najniższa cena z ostatnich 30 dni: {PRICING.pdf.omnibus} zł
            </p>
            <ul className="grid gap-1.5 text-sm mb-5">
              <li>✓ Cała spersonalizowana bajka z ilustracjami</li>
              <li>✓ Gotowa w {GENERATION_MINUTES} minut</li>
              <li>✓ Czytasz na tablecie albo drukujesz w domu</li>
              <li>✓ Zostaje z Wami na zawsze</li>
            </ul>
            <CtaButton topicSlug={topic.slug} location="pricing_pdf" className="mt-auto" />
          </div>
          <div className="bg-cream rounded-3xl p-6 flex flex-col shadow-md">
            <h3 className="font-black text-navy mb-1">Książeczka drukowana + książeczka w PDF</h3>
            <p className="text-3xl font-black text-navy my-1">
              {PRICING.printBundle} zł <small className="text-base text-ink-soft">z wysyłką</small>
            </p>
            <ul className="grid gap-1.5 text-sm mb-5">
              <li>✓ Wszystko z wariantu PDF</li>
              <li>✓ Profesjonalnie wydrukowana książka</li>
              <li>✓ Kurier w 3–5 dni roboczych, wysyłka po Polsce w cenie</li>
              <li>✓ Prezent, w którym dziecko widzi siebie</li>
            </ul>
            <CtaButton topicSlug={topic.slug} location="pricing_print" className="mt-auto" />
          </div>
          <div className="bg-cream rounded-3xl p-6 flex flex-col shadow-md">
            <h3 className="font-black text-navy mb-1">Książeczka w PDF + audiobook</h3>
            <p className="text-3xl font-black text-navy my-1">{PRICING.audioBundle} zł</p>
            <ul className="grid gap-1.5 text-sm mb-5">
              <li>✓ Wszystko z wariantu PDF</li>
              <li>✓ Bajka czytana ciepłym głosem lektora</li>
              <li>✓ Do słuchania przed snem i w aucie</li>
              <li>✓ Plik audio zostaje z Wami na zawsze</li>
            </ul>
            <CtaButton topicSlug={topic.slug} location="pricing_audio" className="mt-auto" />
          </div>
        </div>
        <p className="text-center text-sm font-bold text-ink-soft mt-6">
          Cena jak za książkę z księgarni — tylko że ta jest o Twoim dziecku.
        </p>
      </div>
    </section>
  );
}
