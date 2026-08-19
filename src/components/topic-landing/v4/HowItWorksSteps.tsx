import { HOW_IT_WORKS } from '../../../data/lpContent';

/**
 * The numbered three-step list from the homepage "Jak to działa" section.
 * Shared so /problem/:slug can open its video section with exactly the same
 * block in exactly the same formatting (2026-08-19).
 */
export function HowItWorksSteps({ className = '' }: { className?: string }) {
  return (
    <ol className={`grid md:grid-cols-3 gap-6 list-none p-0 m-0 ${className}`}>
      {HOW_IT_WORKS.map((step, i) => (
        <li key={step.title} className="flex gap-3 items-start">
          <span className="shrink-0 w-7 h-7 rounded-full bg-lp-navy text-white font-black text-sm flex items-center justify-center">
            {i + 1}
          </span>
          <div>
            <b className="block text-lp-navy">{step.title}</b>
            <span className="text-sm text-lp-ink-soft">{step.body}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
