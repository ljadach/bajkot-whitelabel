import { useState } from 'react';
import { Link } from 'react-router';
import { JsonLd } from '../components/JsonLd';
import { TopicNav } from '../components/topic-landing/TopicNav';
import { TopicFooter } from '../components/topic-landing/TopicFooter';
import { PricingCards } from '../components/cennik/PricingCards';
import { ComparisonTable } from '../components/cennik/ComparisonTable';
import { FAQ_ITEMS, PRICE_TESTIMONIALS, VALUE_ITEMS } from '../data/cennik';
import { BOOK_PRICE_PDF_PLN, BOOK_PRICE_PRINT_PLN, formatPricePLN } from '../lib/pricing';
import { trackEvent } from '../lib/telemetry';

const pdfPrice = formatPricePLN(BOOK_PRICE_PDF_PLN);

export function CennikPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen antialiased selection:bg-magic-400 selection:text-white"
      style={{ fontFamily: "'Nunito', sans-serif", backgroundColor: '#FAFAFA', color: '#334155' }}
    >
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Spersonalizowana bajka terapeutyczna',
          description:
            'Spersonalizowana książeczka terapeutyczna z imieniem, wyglądem i konkretnym wyzwaniem Twojego dziecka.',
          brand: { '@type': 'Brand', name: 'Bajkoterapia' },
          offers: [
            {
              '@type': 'Offer',
              name: 'Bajka PDF',
              price: BOOK_PRICE_PDF_PLN,
              priceCurrency: 'PLN',
              availability: 'https://schema.org/InStock',
            },
            {
              '@type': 'Offer',
              name: 'PDF + Druk',
              price: BOOK_PRICE_PRINT_PLN,
              priceCurrency: 'PLN',
              availability: 'https://schema.org/InStock',
            },
          ],
        }}
      />

      <style>{`
        .cennik-pricing-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .cennik-pricing-card:hover { transform: translateY(-6px); }
        .cennik-popular-badge {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 8px 24px -8px rgba(245, 158, 11, 0.5);
        }
        .cennik-price sup { font-size: 0.45em; font-weight: 700; top: -0.7em; margin-right: 0.15em; color: #64748b; }
        .cennik-price .currency { font-size: 0.45em; font-weight: 700; color: #64748b; margin-left: 0.15em; }
      `}</style>

      <TopicNav />

      {/* Hero */}
      <section
        className="pt-28 pb-12 md:pt-36 md:pb-16"
        style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block bg-calm-100 text-calm-800 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
            <i className="fa-solid fa-tag mr-1.5" /> Cennik
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-calm-900 leading-tight mb-6">
            Jedna cena. Bez ukrytych opłat.
            <br className="hidden sm:block" /> Bajka, którą Twoje dziecko będzie chciało czytać.
          </h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Płacisz raz — dostajesz spersonalizowaną książeczkę terapeutyczną z imieniem, wyglądem i
            konkretnym wyzwaniem Twojego dziecka. Wybierz format, który Wam pasuje.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-calm-500" /> Płatność szyfrowana
            </span>
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-rotate-left text-calm-500" /> Gwarancja zwrotu 14 dni
            </span>
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-truck-fast text-calm-500" /> Wysyłka w 3–5 dni
            </span>
          </div>
        </div>
      </section>

      <PricingCards />

      {/* Co dostajesz */}
      <section id="co-dostajesz" className="py-20 md:py-28 bg-calm-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-4">
              Za co dokładnie płacisz?
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Każda bajka to nie generyczny tekst — to projekt psychoedukacyjny dopasowany do
              Twojego dziecka. Oto co wchodzi w cenę.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUE_ITEMS.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-3xl shadow-xl p-7 hover:shadow-2xl transition-shadow"
              >
                <div className="w-14 h-14 bg-calm-100 rounded-2xl flex items-center justify-center text-2xl mb-4">
                  {item.emoji}
                </div>
                <h3 className="text-lg font-bold text-calm-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ComparisonTable />

      {/* Gwarancja */}
      <section className="py-20 md:py-24 bg-calm-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block bg-magic-500/20 text-magic-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
                <i className="fa-solid fa-shield-halved mr-1.5" /> Nasza obietnica
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">
                14 dni gwarancji zwrotu pieniędzy
              </h2>
              <p className="text-lg text-calm-100 leading-relaxed mb-6">
                Wierzymy w to, co tworzymy. Jeśli bajka nie spełni Waszych oczekiwań — z dowolnego
                powodu — w ciągu 14 dni od zakupu zwrócimy Ci 100% wpłaconej kwoty. Bez pytań, bez
                procedur, bez kruczków.
              </p>
              <ul className="space-y-3 text-calm-100">
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-circle-check text-magic-400 mt-1" />
                  <span>Pełny zwrot kwoty w 5 dni roboczych</span>
                </li>
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-circle-check text-magic-400 mt-1" />
                  <span>Bez konieczności tłumaczenia powodu</span>
                </li>
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-circle-check text-magic-400 mt-1" />
                  <span>
                    Wystarczy mail na{' '}
                    <a
                      href="mailto:info@bajkoterapia.org"
                      className="text-magic-400 font-semibold hover:underline"
                    >
                      info@bajkoterapia.org
                    </a>
                  </span>
                </li>
              </ul>
            </div>

            <div className="relative flex justify-center">
              <div className="bg-white/10 backdrop-blur rounded-3xl p-10 border border-white/20 text-center max-w-sm">
                <div className="text-7xl mb-4">🛡️</div>
                <div className="text-5xl font-black mb-2">14 dni</div>
                <div className="text-magic-400 font-bold uppercase tracking-widest text-sm mb-4">
                  Bez ryzyka
                </div>
                <div className="border-t border-white/20 pt-4 text-sm text-calm-200">
                  Jeśli bajka nie zachwyci Waszej rodziny, zwracamy 100% kwoty.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Opinie / wartość */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-4">
              Czy {pdfPrice} to dużo za bajkę?
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Sprawdź, co rodzice mówią o stosunku ceny do efektów.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {PRICE_TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className={`bg-white rounded-3xl shadow-xl p-8 ${
                  t.featured ? 'border-2 border-magic-200' : ''
                }`}
              >
                <div className="flex gap-1 text-magic-400 mb-4" aria-label="5/5">
                  <i className="fa-solid fa-star" />
                  <i className="fa-solid fa-star" />
                  <i className="fa-solid fa-star" />
                  <i className="fa-solid fa-star" />
                  <i className="fa-solid fa-star" />
                </div>
                <p className="text-slate-600 italic leading-relaxed mb-5">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full ${t.avatarBg} flex items-center justify-center text-2xl`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-calm-900">{t.name}</div>
                    <div className="text-sm text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq-pricing" className="py-20 md:py-28 bg-calm-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-4">
              Pytania o cenę i płatność
            </h2>
            <p className="text-slate-500">Wszystko, co warto wiedzieć przed zamówieniem.</p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openFaq === item.id;
              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="font-bold text-calm-900 pr-4">{item.question}</span>
                    <i
                      className={`fa-solid fa-chevron-down text-calm-500 flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-slate-600 leading-relaxed">{item.answer}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-calm-100 via-white to-calm-50 rounded-3xl shadow-xl p-10 sm:p-16">
            <div className="text-5xl mb-6">📖✨</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-6">
              Zacznij od jednej bajki
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
              Wybór tematu i imienia zajmie Ci 3 minuty. Resztą zajmiemy się my.
            </p>
            <Link
              to="/katalog"
              onClick={() =>
                trackEvent('cta_create_book_clicked', { location: 'cennik_final_cta' })
              }
              className="inline-flex items-center gap-2 bg-magic-500 hover:bg-magic-600 text-white font-bold px-10 py-4 rounded-full text-lg transition-colors shadow-lg hover:shadow-xl no-underline"
            >
              <i className="fa-solid fa-wand-magic-sparkles" />
              Stwórz bajkę teraz
            </Link>
            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-slate-500 font-medium">
              <span>Od {pdfPrice}</span>
              <span>•</span>
              <span>Gwarancja zwrotu 14 dni</span>
              <span>•</span>
              <span>Gotowe w kilka minut</span>
            </div>
          </div>
        </div>
      </section>

      <TopicFooter />
    </div>
  );
}
