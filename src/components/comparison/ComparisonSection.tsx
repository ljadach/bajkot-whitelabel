import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { proseComponents } from '@/lib/markdownComponents';
import { VerdictBox } from './VerdictBox';

interface ComparisonSectionProps {
  id: string;
  title: string;
  body: string;
  verdict?: { text: string; winner: 'a' | 'b' | 'tie' };
  toolA: string;
  toolB: string;
}

export function ComparisonSection({ id, title, body, verdict, toolA, toolB }: ComparisonSectionProps) {
  return (
    <section id={id} className="comparison-section">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-4 tracking-tight">{title}</h2>
      <div className="prose-enterprise">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={proseComponents}>
          {body}
        </ReactMarkdown>
      </div>
      {verdict && <VerdictBox text={verdict.text} winner={verdict.winner} toolA={toolA} toolB={toolB} />}
    </section>
  );
}
