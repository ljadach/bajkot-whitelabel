import { useState } from 'react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface LandingFaqProps {
  /** FAQ items to display */
  faqItems: FaqItem[];
  /** Section title */
  title: string;
}

export function LandingFaq({ faqItems, title }: LandingFaqProps) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const allFaqItems = faqItems;

  return (
    <section className="bg-neutral-50/50 section-spacing">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center mb-10 tracking-tight">{title}</h2>
        <div className="space-y-3">
          {allFaqItems.map((item) => (
            <div key={item.id} className="faq-card">
              <button onClick={() => toggleFaq(item.id)} className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-neutral-50 transition-colors" aria-expanded={openFaq === item.id}>
                <span className="font-semibold text-neutral-900 pr-4">{item.question}</span>
                <svg className={`w-5 h-5 text-neutral-400 transition-transform flex-shrink-0 ${openFaq === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === item.id && (
                <div className="px-5 pb-5 bg-white">
                  <p className="text-neutral-600 leading-[1.7] text-[15px]">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
