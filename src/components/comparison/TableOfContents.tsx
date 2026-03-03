import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface TocItem {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  namespace: string;
}

export function TableOfContents({ namespace }: TableOfContentsProps) {
  const { t } = useTranslation(namespace);
  const { t: tc } = useTranslation('compare-common');
  const [activeId, setActiveId] = useState<string>('');

  // Build TOC items from article structure
  const sections = t('sections', { returnObjects: true }) as { id: string; title: string }[];
  const sectionsArr = Array.isArray(sections) ? sections : [];
  const sectionIds = sectionsArr.map((s) => s.id).join(',');

  const tocItems: TocItem[] = useMemo(
    () => [
      { id: 'quick-answer', label: 'TL;DR' },
      { id: 'context', label: t('context.title') },
      { id: 'comparison-table', label: t('table.title') },
      ...sectionsArr.map((s) => ({ id: s.id, label: s.title })),
      { id: 'use-cases', label: tc('useCases.title') },
      { id: 'faq', label: tc('faq.title') },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tc, sectionIds]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
    );

    for (const item of tocItems) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [tocItems]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="comparison-toc" aria-label="Table of contents">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">{tc('toc.title')}</p>
      <ul className="space-y-1">
        {tocItems.map((item) => (
          <li key={item.id}>
            <button onClick={() => handleClick(item.id)} className={`comparison-toc-item ${activeId === item.id ? 'comparison-toc-item--active' : ''}`}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
