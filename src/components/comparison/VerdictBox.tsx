import { useTranslation } from 'react-i18next';

interface VerdictBoxProps {
  text: string;
  winner: 'a' | 'b' | 'tie';
  toolA: string;
  toolB: string;
}

export function VerdictBox({ text, winner, toolA, toolB }: VerdictBoxProps) {
  const { t } = useTranslation('compare-common');
  const label = winner === 'tie' ? t('verdict.tie') : winner === 'a' ? `${toolA} ${t('verdict.wins')}` : `${toolB} ${t('verdict.wins')}`;

  return (
    <div className={`comparison-verdict comparison-verdict--${winner}`}>
      <span className="comparison-verdict__label">{t('verdict.label')}:</span> {label}. {text}
    </div>
  );
}
