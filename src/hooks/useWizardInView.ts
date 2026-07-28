import { useEffect, useState } from 'react';

/**
 * True while the inline wizard (#kreator) is in the viewport — used by navs
 * to hide their "Stwórz Bajkę" CTA when the same button is right below.
 * Pages without a #kreator anchor report false.
 */
export function useWizardInView(deps: unknown[] = []): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const target = document.getElementById('kreator');
    if (!target) {
      setInView(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(target);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return inView;
}
