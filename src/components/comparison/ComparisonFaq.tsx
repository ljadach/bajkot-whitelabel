import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPageFaqItems, type FaqItemData } from '../../lib/faqHelpers';

interface ComparisonFaqProps {
  pageKey: string;
}

export function ComparisonFaq({ pageKey }: ComparisonFaqProps) {
  const { t: tc } = useTranslation('compare-common');
  const { t: tFaq } = useTranslation('faq');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const allItems = tFaq('items', { returnObjects: true }) as Record<string, FaqItemData>;
  const faqItems = getPageFaqItems(allItems, pageKey);

  if (faqItems.length === 0) return null;

  return (
    <section id="faq" className="comparison-section">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-6 tracking-tight">{tc('faq.title')}</h2>
      <div className="space-y-3">
        {faqItems.map((item) => (
          <div key={item.id} className="faq-card">
            <button
              onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
              className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-neutral-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-expanded={openFaq === item.id}
              aria-controls={`faq-answer-${item.id}`}
            >
              <span className="font-semibold text-neutral-900 pr-4">{item.question}</span>
              <svg className={`w-5 h-5 text-neutral-400 transition-transform flex-shrink-0 ${openFaq === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openFaq === item.id && (
              <div id={`faq-answer-${item.id}`} className="px-5 pb-5 bg-white">
                <p className="text-neutral-600 leading-[1.7] text-[15px]">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
