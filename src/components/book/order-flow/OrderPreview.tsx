import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../../lib/telemetry';
import { genitiveOrSelf } from '../../../lib/childNameInflect';
import type { IntakeState, OrderFormat } from './types';

interface Props {
  intake: IntakeState;
  onChangeFormat: (fmt: OrderFormat) => void;
  onContinue: () => void;
  onBack: () => void;
  /** Admin-only diagnostic toggles. Box is hidden entirely for regular users. */
  isAdmin?: boolean;
  /** When checked AND admin clicks CTA, skip Stripe entirely. */
  skipStripe?: boolean;
  /** Propagates `skipQaReviews` to the backend (fast mode). */
  skipQa?: boolean;
  /** Replaces Gemini image gen with rasterized ASCII PNG. */
  fastImage?: boolean;
  onChangeSkipStripe?: (next: boolean) => void;
  onChangeSkipQa?: (next: boolean) => void;
  onChangeFastImage?: (next: boolean) => void;
}

/**
 * "Co otrzymasz?" preview screen — mirrors `#screen-preview` from
 * docs/protos_v2/Bajkoterapia-Nowy-Flow.html.
 */
export function OrderPreview({
  intake,
  onChangeFormat,
  onContinue,
  onBack,
  isAdmin = false,
  skipStripe = false,
  skipQa = false,
  fastImage = false,
  onChangeSkipStripe,
  onChangeSkipQa,
  onChangeFastImage,
}: Props) {
  const { t } = useTranslation('book');

  useEffect(() => {
    trackEvent('preview_viewed', { format: intake.format });
    // Fire-on-mount; format prop reads stale-but-correct on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const trimmedName = intake.name.trim();
  const topicTitle = intake.topic ? intake.topic.catalog.shortTitle : '';

  const nameGen = genitiveOrSelf(trimmedName);

  // Split around {{nameGen}} so the inflected name can be wrapped in <strong>
  // without going through dangerouslySetInnerHTML.
  const NAME_TOKEN = '\u0000NAME\u0000';
  const subheadingTemplate = trimmedName
    ? t('previewScreen.subheading', { nameGen: NAME_TOKEN })
    : t('previewScreen.subheadingFallback');
  const tokenIdx = subheadingTemplate.indexOf(NAME_TOKEN);
  const subheadingBefore =
    tokenIdx >= 0 ? subheadingTemplate.slice(0, tokenIdx) : subheadingTemplate;
  const subheadingAfter =
    tokenIdx >= 0 ? subheadingTemplate.slice(tokenIdx + NAME_TOKEN.length) : '';

  const bookTitle = trimmedName
    ? t('previewScreen.bookTitleFor', { nameGen })
    : t('previewScreen.bookTitleFallback');

  const cta = trimmedName
    ? t('previewScreen.ctaOrder', { nameGen })
    : t('previewScreen.ctaOrderFallback');

  return (
    <section className="pt-28 pb-20 px-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('previewScreen.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
            {t('previewScreen.heading')}
          </h1>
          <p className="text-gray-600 text-lg">
            {subheadingBefore}
            {trimmedName && <strong className="text-calm-800">{nameGen}</strong>}
            {subheadingAfter}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Product mock */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-calm-500 to-calm-800 rounded-3xl shadow-2xl p-8 text-white text-center aspect-[3/4] flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-4 left-4 text-6xl">✨</div>
                <div className="absolute bottom-4 right-4 text-6xl">🌟</div>
              </div>
              <div className="text-6xl mb-4">📖</div>
              <h2 className="text-2xl font-black mb-2">{bookTitle}</h2>
              {topicTitle && <p className="text-calm-100 text-sm">{topicTitle}</p>}
              <div className="mt-4 bg-white/20 rounded-full px-4 py-1 text-sm font-bold">
                {t('previewScreen.bookBadge')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniCard emoji="📝" label={t('previewScreen.miniDedication')} />
              <MiniCard emoji="🎨" label={t('previewScreen.miniIllustrations')} />
              <MiniCard emoji="💬" label={t('previewScreen.miniDiscussion')} />
            </div>
          </div>

          {/* Description & Pricing */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
              <h3 className="text-xl font-black text-calm-900 mb-4">
                {t('previewScreen.includesHeading')}
              </h3>
              <ul className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <li key={n} className="flex items-start gap-3">
                    <i className="fa-solid fa-check-circle text-green-500 mt-1" />
                    <span className="text-gray-700">
                      <strong>
                        {t(`previewScreen.include${n}Title` as 'previewScreen.include1Title')}
                      </strong>{' '}
                      {t(`previewScreen.include${n}Body` as 'previewScreen.include1Body')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
              <h3 className="text-xl font-black text-calm-900 mb-4">
                {t('previewScreen.formatHeading')}
              </h3>
              <div className="space-y-3">
                <FormatRadio
                  value="pdf"
                  selected={intake.format}
                  onSelect={onChangeFormat}
                  emoji="📱"
                  title={t('previewScreen.formatPdf')}
                  hint={t('previewScreen.formatPdfHint')}
                  price={t('previewScreen.formatPdfPrice')}
                />
                <FormatRadio
                  value="pdf_print"
                  selected={intake.format}
                  onSelect={onChangeFormat}
                  emoji="📚"
                  title={t('previewScreen.formatPrint')}
                  hint={t('previewScreen.formatPrintHint')}
                  price={t('previewScreen.formatPrintPrice')}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onBack}
                className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition"
              >
                <i className="fa-solid fa-arrow-left mr-2" /> {t('previewScreen.back')}
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="w-2/3 bg-magic-500 hover:bg-magic-600 text-white font-extrabold py-4 rounded-2xl text-lg shadow-xl shadow-magic-500/30 transition transform hover:-translate-y-1"
              >
                <i className="fa-solid fa-wand-magic-sparkles mr-2" /> {cta}
              </button>
            </div>

            {/* Admin-only diagnostic toggles. Hidden in production for regular
                users — exposing skipStripe to anonymous landing visitors meant
                anyone could trigger a pipeline without paying. */}
            {isAdmin && (
              <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  {t('checkout.devHeading')}
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipStripe}
                    onChange={(e) => onChangeSkipStripe?.(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-amber-900 font-semibold">
                    {t('checkout.devSkipStripe')}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipQa}
                    onChange={(e) => onChangeSkipQa?.(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-amber-900 font-semibold">
                    {t('checkout.devSkipQa')}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fastImage}
                    onChange={(e) => onChangeFastImage?.(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-amber-900 font-semibold">
                    {t('checkout.devSkipVisual')}
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-16">
          <h2 className="text-2xl font-black text-calm-900 text-center mb-8">
            {t('previewScreen.testimonialsHeading')}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial
              avatar="👩"
              avatarBg="bg-pink-100"
              name={t('previewScreen.testimonial1Name')}
              role={t('previewScreen.testimonial1Role')}
              quote={t('previewScreen.testimonial1Quote')}
            />
            <Testimonial
              avatar="👩‍⚕️"
              avatarBg="bg-calm-100"
              name={t('previewScreen.testimonial2Name')}
              role={t('previewScreen.testimonial2Role')}
              quote={t('previewScreen.testimonial2Quote')}
            />
            <Testimonial
              avatar="👨"
              avatarBg="bg-green-100"
              name={t('previewScreen.testimonial3Name')}
              role={t('previewScreen.testimonial3Role')}
              quote={t('previewScreen.testimonial3Quote')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniCard({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-gradient-to-br from-calm-100 to-white rounded-2xl p-4 text-center border border-calm-200 shadow-sm">
      <div className="text-2xl mb-1">{emoji}</div>
      <p className="text-xs font-bold text-calm-800">{label}</p>
    </div>
  );
}

function FormatRadio({
  value,
  selected,
  onSelect,
  emoji,
  title,
  hint,
  price,
}: {
  value: OrderFormat;
  selected: OrderFormat;
  onSelect: (v: OrderFormat) => void;
  emoji: string;
  title: string;
  hint: string;
  price: string;
}) {
  const checked = selected === value;
  return (
    <label className="cursor-pointer relative block">
      <input
        type="radio"
        name="preview-format"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <div
        className={`p-4 border-2 rounded-2xl flex items-center justify-between transition ${
          checked ? 'border-magic-500 bg-amber-50' : 'border-gray-100 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">{emoji}</div>
          <div>
            <div className="font-bold text-calm-900">{title}</div>
            <div className="text-sm text-gray-500">{hint}</div>
          </div>
        </div>
        <div className="text-2xl font-black text-calm-900">{price}</div>
        {checked && (
          <i className="fa-solid fa-circle-check text-magic-500 absolute top-4 right-4 text-lg" />
        )}
      </div>
    </label>
  );
}

function Testimonial({
  avatar,
  avatarBg,
  name,
  role,
  quote,
}: {
  avatar: string;
  avatarBg: string;
  name: string;
  role: string;
  quote: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-12 h-12 ${avatarBg} rounded-full flex items-center justify-center text-2xl`}
        >
          {avatar}
        </div>
        <div>
          <div className="font-bold text-calm-900">{name}</div>
          <div className="text-sm text-gray-500">{role}</div>
        </div>
      </div>
      <div className="flex gap-1 text-magic-500 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <i key={s} className="fa-solid fa-star" />
        ))}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{quote}</p>
    </div>
  );
}
