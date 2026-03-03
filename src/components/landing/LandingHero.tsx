import { emphasizeText } from './emphasisUtils';

interface CtaButton {
  label: string;
  onClick: () => void;
}

interface LandingHeroProps {
  headline: string;
  subheadline: string;
  primaryCta: CtaButton;
  secondaryCta?: CtaButton;
  buttonClass?: string;
}

export function LandingHero({ headline, subheadline, primaryCta, secondaryCta, buttonClass = 'btn-segment' }: LandingHeroProps) {
  return (
    <section className="segment-hero hero-section w-full relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="hero-headline text-3xl sm:text-4xl lg:text-5xl mb-6 leading-[1.15]">{headline}</h1>
          <p className="text-neutral-600 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">{emphasizeText(subheadline, 'font-semibold text-neutral-700')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={primaryCta.onClick} className={`${buttonClass} text-lg`}>
              {primaryCta.label}
            </button>
            {secondaryCta && (
              <button onClick={secondaryCta.onClick} className="btn-segment-secondary">
                {secondaryCta.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
