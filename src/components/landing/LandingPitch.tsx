import { emphasizeText } from './emphasisUtils';

interface LandingPitchProps {
  headline: string;
  body: string;
  /** Visual variant for alternating sections */
  variant?: 'default' | 'muted';
}

export function LandingPitch({ headline, body, variant = 'default' }: LandingPitchProps) {
  // If body contains explicit paragraph breaks, use them;
  // otherwise auto-group sentences into 2-sentence paragraphs
  const paragraphs: string[] = body.includes('\n\n')
    ? body.split('\n\n').filter((p) => p.trim())
    : (() => {
        const sentences = body.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜÀÁÂÃÉÈÊËÍÌÎÏÓÒÔÕÚÙÛÜÇ])/);
        const result: string[] = [];
        for (let i = 0; i < sentences.length; i += 2) {
          const chunk = sentences.slice(i, i + 2).join(' ');
          if (chunk.trim()) result.push(chunk);
        }
        return result;
      })();

  const bgClass = variant === 'muted' ? 'bg-neutral-50/50' : 'bg-white';

  return (
    <section className={`${bgClass} section-spacing`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-8 text-center tracking-tight">
          {headline}
        </h2>
        <div className="space-y-5">
          {paragraphs.map((para, index) => {
            // Check if paragraph contains bullet items (lines starting with "- ")
            const lines = para.split('\n');
            const hasBullets = lines.some((l) => l.startsWith('- '));

            if (hasBullets) {
              const intro = lines.filter((l) => !l.startsWith('- '));
              const bullets = lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
              return (
                <div key={index}>
                  {intro.length > 0 && intro[0].trim() && (
                    <p className="text-neutral-600 leading-[1.8] text-base sm:text-[17px] mb-3">
                      {emphasizeText(intro.join(' '))}
                    </p>
                  )}
                  <ul className="space-y-2 ml-1">
                    {bullets.map((bullet, bi) => (
                      <li
                        key={bi}
                        className="text-neutral-600 leading-[1.8] text-base sm:text-[17px] flex gap-2"
                      >
                        <span className="text-neutral-400 mt-0.5">•</span>
                        <span>{emphasizeText(bullet)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            return (
              <p key={index} className="text-neutral-600 leading-[1.8] text-base sm:text-[17px]">
                {emphasizeText(para)}
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}
