import { useTranslation } from 'react-i18next';

interface TableRow {
  feature: string;
  toolA: string;
  toolB: string;
  winner?: 'a' | 'b' | 'tie';
}

interface ComparisonTableProps {
  namespace: string;
  toolA: string;
  toolB: string;
}

export function ComparisonTable({ namespace, toolA, toolB }: ComparisonTableProps) {
  const { t } = useTranslation(namespace);
  const { t: tc } = useTranslation('compare-common');
  const rows = t('table.rows', { returnObjects: true }) as TableRow[];
  const rowsArr: TableRow[] = Array.isArray(rows) ? rows : [];

  return (
    <section id="comparison-table" className="comparison-section">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-4 tracking-tight">{t('table.title')}</h2>
      <p className="text-[15px] text-neutral-600 mb-6">{t('table.summary')}</p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto mb-4">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="comparison-table__th">{tc('table.columnFeature')}</th>
              <th className="comparison-table__th">
                <span className="tool-badge tool-badge--a">{toolA}</span>
              </th>
              <th className="comparison-table__th">
                <span className="tool-badge tool-badge--b">{toolB}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rowsArr.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                <td className="comparison-table__td font-medium text-neutral-900">{row.feature}</td>
                <td className={`comparison-table__td ${row.winner === 'a' ? 'comparison-table__cell-winner' : ''}`}>{row.toolA}</td>
                <td className={`comparison-table__td ${row.winner === 'b' ? 'comparison-table__cell-winner' : ''}`}>{row.toolB}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3 mb-4">
        {rowsArr.map((row, i) => (
          <div key={i} className="comparison-card">
            <div className="comparison-card__feature">{row.feature}</div>
            <div className="comparison-card__values">
              <div className={`comparison-card__value ${row.winner === 'a' ? 'comparison-card__value--winner' : ''}`}>
                <span className="tool-badge tool-badge--a tool-badge--sm">{toolA}</span>
                <span>{row.toolA}</span>
              </div>
              <div className={`comparison-card__value ${row.winner === 'b' ? 'comparison-card__value--winner' : ''}`}>
                <span className="tool-badge tool-badge--b tool-badge--sm">{toolB}</span>
                <span>{row.toolB}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-neutral-500 italic">{t('table.caption')}</p>
    </section>
  );
}
