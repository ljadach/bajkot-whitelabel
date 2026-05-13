import { COMPARISON_ROWS } from '../../data/cennik';
import { BOOK_PRICE_PDF_PLN, BOOK_PRICE_PRINT_PLN, formatPricePLN } from '../../lib/pricing';

const pdfPrice = formatPricePLN(BOOK_PRICE_PDF_PLN);
const printPrice = formatPricePLN(BOOK_PRICE_PRINT_PLN);

export function ComparisonTable() {
  return (
    <section id="porownanie" className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-calm-900 mb-4">
            Co znajdziesz w którym pakiecie?
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Pełna lista funkcji w jednym miejscu — bez kombinowania.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-calm-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-calm-50 border-b border-calm-100 text-calm-900">
                  <th className="py-5 px-5 sm:px-7 font-bold text-sm uppercase tracking-wider">
                    Co dostajesz
                  </th>
                  <th className="py-5 px-4 text-center font-bold text-sm">
                    <div>📱 PDF</div>
                    <div className="text-magic-600 font-extrabold text-base mt-1">{pdfPrice}</div>
                  </th>
                  <th className="py-5 px-4 text-center font-bold text-sm bg-magic-50">
                    <div>📚 PDF + Druk</div>
                    <div className="text-magic-600 font-extrabold text-base mt-1">{printPrice}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {COMPARISON_ROWS.map((row, idx) => {
                  const isLast = idx === COMPARISON_ROWS.length - 1;
                  return (
                    <tr key={row.label} className={isLast ? '' : 'border-b border-calm-100'}>
                      <td className="py-4 px-5 sm:px-7 font-semibold">{row.label}</td>
                      <td className="text-center">
                        <ComparisonCell value={row.pdf} variant="pdf" />
                      </td>
                      <td className="text-center bg-magic-50/40">
                        <ComparisonCell value={row.print} variant="print" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Wszystkie ceny są cenami końcowymi.
        </p>
      </div>
    </section>
  );
}

function ComparisonCell({ value, variant }: { value: string; variant: 'pdf' | 'print' }) {
  if (value === 'check') {
    const color = variant === 'pdf' ? 'text-calm-500' : 'text-magic-500';
    return <i className={`fa-solid fa-circle-check ${color} text-xl`} aria-label="Tak" />;
  }
  if (value === 'minus') {
    return <i className="fa-solid fa-minus text-slate-300 text-xl" aria-label="Nie" />;
  }
  return <span className="text-slate-700 text-sm font-bold">{value}</span>;
}
