import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { proseComponents } from '@/lib/markdownComponents';

interface QuickAnswerProps {
  namespace: string;
}

export function QuickAnswer({ namespace }: QuickAnswerProps) {
  const { t } = useTranslation(namespace);

  return (
    <div className="comparison-quick-answer" id="quick-answer">
      <ReactMarkdown components={proseComponents}>{t('quickAnswer.body')}</ReactMarkdown>
    </div>
  );
}
