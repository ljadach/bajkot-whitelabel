import type { Components } from 'react-markdown';

/**
 * Prose-style markdown components for long-form content.
 * Used in: SummaryStep, HandbookContent, ReaderView, QuickTipWidget
 */
export const proseComponents: Components = {
  h1: ({ children }) => <h1 className="mb-4 text-xl font-semibold text-neutral-900">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-6 text-lg font-semibold text-neutral-900">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-medium text-neutral-800">{children}</h3>,
  p: ({ children }) => <p className="mb-4 text-[15px] leading-relaxed text-neutral-600">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1.5 pl-5 text-neutral-600">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-neutral-600">{children}</ol>,
  li: ({ children }) => <li className="text-[15px] leading-relaxed">{children}</li>,
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm text-neutral-800">{children}</code>;
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }) => <pre className="mb-4 overflow-x-auto rounded-lg bg-neutral-900 p-4 text-sm text-neutral-100">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="mb-4 border-l-2 border-neutral-200 pl-4 italic text-neutral-500">{children}</blockquote>,
  strong: ({ children }) => <strong className="font-semibold text-neutral-800">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-neutral-100">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-neutral-50/50">{children}</tr>,
  th: ({ children }) => <th className="px-4 py-2.5 font-semibold text-neutral-700">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2.5 text-neutral-600">{children}</td>,
};

/**
 * Inline markdown components for cards (no margins, compact).
 * Used in: PlanStep OutlineCard
 */
export const inlineComponents: Components = {
  p: ({ children }) => <span>{children}</span>,
  strong: ({ children }) => <strong className="font-semibold text-neutral-800">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">{children}</code>,
};
