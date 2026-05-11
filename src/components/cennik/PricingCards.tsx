import { Link } from 'react-router';
import { BOOK_PRICE_PDF_PLN, BOOK_PRICE_PRINT_PLN } from '../../lib/pricing';
import { trackEvent } from '../../lib/telemetry';

export function PricingCards() {
  return (
    <section id="pakiety" className="pb-20 md:pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 items-stretch max-w-4xl mx-auto">
          {/* PDF */}
          <div className="cennik-pricing-card bg-white rounded-3xl shadow-xl p-8 flex flex-col border border-calm-100">
            <div className="text-4xl mb-3">📱</div>
            <h3 className="text-2xl font-extrabold text-calm-900 mb-1">Bajka PDF</h3>
            <p className="text-sm text-slate-500 mb-6">Idealna na początek — gotowa od ręki</p>

            <div className="mb-6">
              <div className="cennik-price text-5xl font-black text-calm-900">
                {BOOK_PRICE_PDF_PLN}
                <span className="currency">zł</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Cena za jedną spersonalizowaną bajkę</p>
            </div>

            <ul className="space-y-3 text-slate-700 mb-8 flex-1">
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-calm-500 mt-1" />
                <span>
                  Pełna, spersonalizowana bajka <strong>w PDF</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-calm-500 mt-1" />
                <span>
                  Bohater z <strong>imieniem i wyglądem</strong> Twojego dziecka
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-calm-500 mt-1" />
                <span>
                  Wybór z <strong>35 tematów terapeutycznych</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-calm-500 mt-1" />
                <span>
                  Książeczka z <strong>4–6 rozdziałami i ilustracjami</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-calm-500 mt-1" />
                <span>
                  Dedykowane <strong>pytania do rozmowy z dzieckiem</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-calm-500 mt-1" />
                <span>
                  <strong>Gotowe w ~15 minut</strong>, na maila
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-slate-400">
                <i className="fa-solid fa-xmark mt-1" />
                <span>Druk i wysyłka</span>
              </li>
            </ul>

            <Link
              to="/katalog"
              onClick={() => trackEvent('cta_create_book_clicked', { location: 'cennik_pdf_card' })}
              className="block text-center w-full bg-white border-2 border-magic-500 text-magic-600 hover:bg-magic-500 hover:text-white font-bold px-6 py-3.5 rounded-full transition-colors no-underline"
            >
              Wybieram PDF
            </Link>
          </div>

          {/* PDF + Druk (popular) */}
          <div className="cennik-pricing-card relative bg-white rounded-3xl shadow-2xl p-8 flex flex-col border-2 border-magic-500 md:scale-[1.02]">
            <span className="cennik-popular-badge absolute -top-4 left-1/2 -translate-x-1/2 text-white text-xs font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full whitespace-nowrap">
              <i className="fa-solid fa-star mr-1" /> Najczęściej wybierany
            </span>

            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-2xl font-extrabold text-calm-900 mb-1">PDF + Druk</h3>
            <p className="text-sm text-slate-500 mb-6">
              Prawdziwa książka, do której wraca się co wieczór
            </p>

            <div className="mb-6">
              <div className="cennik-price text-5xl font-black text-calm-900">
                {BOOK_PRICE_PRINT_PLN}
                <span className="currency">zł</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">PDF + drukowana książeczka z dostawą</p>
            </div>

            <ul className="space-y-3 text-slate-700 mb-8 flex-1">
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-magic-500 mt-1" />
                <span>
                  <strong>Wszystko z pakietu PDF</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-magic-500 mt-1" />
                <span>
                  <strong>Profesjonalny druk</strong> w pełnym kolorze, format A5
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-magic-500 mt-1" />
                <span>
                  Twarda, lakierowana <strong>okładka</strong> z imieniem dziecka
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-magic-500 mt-1" />
                <span>
                  Strona dedykacyjna <strong>„Ta książka należy do…"</strong>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-magic-500 mt-1" />
                <span>
                  <strong>Wysyłka kurierska</strong> w 3–5 dni roboczych
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <i className="fa-solid fa-check text-magic-500 mt-1" />
                <span>
                  Pamiątka, którą <strong>można podarować</strong> w prezencie
                </span>
              </li>
              <li className="flex items-start gap-2.5 text-magic-600">
                <i className="fa-solid fa-gift mt-1" />
                <span>
                  <strong>Bezpłatna eko-koperta prezentowa</strong>
                </span>
              </li>
            </ul>

            <Link
              to="/katalog"
              onClick={() =>
                trackEvent('cta_create_book_clicked', { location: 'cennik_print_card' })
              }
              className="block text-center w-full bg-magic-500 hover:bg-magic-600 text-white font-extrabold px-6 py-3.5 rounded-full shadow-lg shadow-magic-500/30 transition-colors no-underline"
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-1.5" /> Zamawiam książkę
            </Link>
          </div>
        </div>

        {/* Trust line */}
        <div className="mt-10 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm font-semibold text-slate-500">
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-lock text-calm-500" /> Płatność SSL 256-bit
          </span>
          <span className="flex items-center gap-2">
            <i className="fa-brands fa-cc-visa text-calm-500 text-xl" />
          </span>
          <span className="flex items-center gap-2">
            <i className="fa-brands fa-cc-mastercard text-calm-500 text-xl" />
          </span>
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-mobile-screen-button text-calm-500" /> BLIK
          </span>
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-building-columns text-calm-500" /> Przelewy24
          </span>
          <span className="flex items-center gap-2">
            <i className="fa-brands fa-paypal text-calm-500 text-xl" />
          </span>
        </div>
      </div>
    </section>
  );
}
