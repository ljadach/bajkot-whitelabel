interface CtaButton {
  label: string;
  onClick: () => void;
}

interface LandingCtaProps {
  headline: string;
  description: string;
  primaryCta: CtaButton;
  secondaryCta?: CtaButton;
  buttonClass?: string;
}

export function LandingCta({
  headline,
  description,
  primaryCta,
  secondaryCta,
  buttonClass = 'btn-segment',
}: LandingCtaProps) {
  return (
    <section className="bg-neutral-900 py-16 sm:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-5 tracking-tight">
          {headline}
        </h2>
        <p className="text-neutral-400 mb-10 max-w-xl mx-auto leading-relaxed">{description}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={primaryCta.onClick} className={`${buttonClass} text-lg`}>
            {primaryCta.label}
          </button>
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition-all"
            >
              {secondaryCta.label}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
