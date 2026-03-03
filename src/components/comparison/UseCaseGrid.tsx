import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { proseComponents } from '@/lib/markdownComponents';

interface UseCase {
  role: string;
  recommendation: string;
  tool: 'a' | 'b' | 'either';
}

interface UseCaseGridProps {
  namespace: string;
  toolA: string;
  toolB: string;
}

function toolBadgeClass(tool: 'a' | 'b' | 'either') {
  if (tool === 'a') return 'tool-badge tool-badge--a';
  if (tool === 'b') return 'tool-badge tool-badge--b';
  return 'tool-badge tool-badge--either';
}

function toolLabel(tool: 'a' | 'b' | 'either', toolA: string, toolB: string) {
  if (tool === 'a') return toolA;
  if (tool === 'b') return toolB;
  return 'Either';
}

export function UseCaseGrid({ namespace, toolA, toolB }: UseCaseGridProps) {
  const { t } = useTranslation(namespace);
  const { t: tc } = useTranslation('compare-common');
  const items = t('useCases.items', { returnObjects: true }) as UseCase[];
  const itemsArr: UseCase[] = Array.isArray(items) ? items : [];

  return (
    <section id="use-cases" className="comparison-section">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-6 tracking-tight">{tc('useCases.title')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {itemsArr.map((item, i) => (
          <div key={i} className="usecase-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-900 text-sm">{item.role}</h3>
              <span className={toolBadgeClass(item.tool)}>{toolLabel(item.tool, toolA, toolB)}</span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">{item.recommendation}</p>
          </div>
        ))}
      </div>

      {/* "Use both" callout */}
      <div className="comparison-quick-answer mb-6">
        <p className="font-semibold text-neutral-900 mb-2">{tc('useCases.useBothTitle')}</p>
        <div className="prose-enterprise">
          <ReactMarkdown components={proseComponents}>{t('useCases.useBothBody')}</ReactMarkdown>
        </div>
      </div>

      <div className="prose-enterprise">
        <ReactMarkdown components={proseComponents}>{t('useCases.outro')}</ReactMarkdown>
      </div>
    </section>
  );
}
