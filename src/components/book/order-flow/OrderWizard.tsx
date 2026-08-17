import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { trackEvent, useStepTransitionTracker } from '../../../lib/telemetry';
import { genitiveOrSelf } from '../../../lib/childNameInflect';
import { BOOK_PRICE_PDF_PLN, BOOK_PRICE_PRINT_PLN, formatPricePLN } from '../../../lib/pricing';
import { FieldError } from './FieldError';
import { errorBorderClass } from './fieldStyles';
import {
  ageLabel,
  type AppearanceData,
  type Gender,
  type IntakeState,
  type SelectedTopic,
} from './types';

interface Props {
  intake: IntakeState;
  onChange: (next: IntakeState) => void;
  onSubmit: () => void;
  /** Auth flow: route to catalog. Landing flow: route back to topic page. */
  onChangeTopic: () => void;
  /** Show progress nav (auth flow). Hidden when landing pre-selects topic. */
  showProgressNav?: boolean;
  /**
   * Skip the "confirm your topic" step. On a topic landing page the parent
   * already chose the problem by being on that URL, so re-confirming it is a
   * dead click between the CTA and the actual form.
   */
  skipTopicStep?: boolean;
  /**
   * Controlled step. When provided (with onStepChange) the parent owns the
   * step — the landing flow uses this to keep its progress header and the
   * rendered step from ever disagreeing. Uncontrolled otherwise (auth flow).
   */
  step?: 1 | 2 | 3;
  onStepChange?: (step: 1 | 2 | 3) => void;
  /**
   * Landing flow: the child step and the checkout share one screen, so the
   * wizard's own "Chcę dedykowaną książkę!" row would be a second CTA above
   * the real one. The checkout below supplies the only submit button.
   */
  hideChildSubmit?: boolean;
  /**
   * Hands the child-field validator to the parent, so a submit button living
   * outside this component still gets per-field errors and the scroll-to-first
   * -missing-field behaviour instead of a generic "fill in the form".
   */
  onRegisterValidateChild?: (validate: () => boolean) => void;
}

/** Per-field validation errors for the child step. */
interface ChildFieldErrors {
  name?: string;
  age?: string;
  gender?: string;
}

// Spec section 3.4 mandates age list 2-12. Pipeline maps age 2 to the
// smallest bracket ('3-5') in convex/lib/ageBracket.ts.
const AGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const EYE_OPTIONS = ['Niebieskie', 'Zielone', 'Brązowe', 'Szare'];
const HAIR_COLOR_OPTIONS = ['Blond', 'Brązowe', 'Czarne', 'Rude'];
const HAIR_LENGTH_OPTIONS = ['Krótkie', 'Średnie', 'Długie'];

/**
 * 3-step intake wizard mirroring `#screen-wizard` from
 * docs/protos_v2/Bajkoterapia-Nowy-Flow.html.
 *
 * Step 1: confirm selected topic (with "Zmień temat" link)
 * Step 2: situation (free text)
 * Step 3: child details — name, age, gender, eyes, hair, glasses, outfit, toy
 */
export function OrderWizard({
  intake,
  onChange,
  onSubmit,
  onChangeTopic,
  showProgressNav = true,
  skipTopicStep = false,
  step: controlledStep,
  onStepChange,
  hideChildSubmit = false,
  onRegisterValidateChild,
}: Props) {
  const { t } = useTranslation('book');
  const [internalStep, setInternalStep] = useState<1 | 2 | 3>(skipTopicStep ? 2 : 1);
  const step = controlledStep ?? internalStep;
  const [fieldErrors, setFieldErrors] = useState<ChildFieldErrors>({});
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const ageRef = useRef<HTMLSelectElement | null>(null);
  const genderRef = useRef<HTMLDivElement | null>(null);

  // Fires `order_form_step_viewed` and `order_form_step_completed` with
  // durationMs so we can analyse drop-off per step (spec section 7.1).
  useStepTransitionTracker(step, { surface: 'order_wizard' });

  // Scroll to the top of the form card AFTER the new step has rendered.
  // Doing it inside the click handler measured the old layout (React hasn't
  // flushed yet), so the smooth scroll landed mid-step and then the card
  // resized under the animation — the "jumping form" bug.
  const skipStepScroll = useRef(true);
  useEffect(() => {
    if (skipStepScroll.current) {
      skipStepScroll.current = false;
      return;
    }
    formCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [step]);

  // Marks the first real edit — the funnel step that means "started filling
  // the form", as opposed to merely viewing it (`order_form_step_viewed`).
  const startedRef = useRef(false);
  const markStarted = useCallback(
    (field: string) => {
      if (startedRef.current) return;
      startedRef.current = true;
      trackEvent('order_started', { surface: 'order_wizard', firstField: field, step });
    },
    [step],
  );

  const update = useCallback(
    <K extends keyof IntakeState>(key: K, value: IntakeState[K]) => {
      markStarted(String(key));
      onChange({ ...intake, [key]: value });
      // Clear only the edited field's error — dropping all of them resized
      // the card mid-typing (the old single-banner behavior).
      if (key === 'name' || key === 'age' || key === 'gender') {
        setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
      }
    },
    [intake, onChange, markStarted],
  );

  const updateAppearance = useCallback(
    <K extends keyof AppearanceData>(key: K, value: AppearanceData[K]) => {
      markStarted(`appearance.${String(key)}`);
      onChange({ ...intake, appearance: { ...intake.appearance, [key]: value } });
    },
    [intake, onChange, markStarted],
  );

  const goToStep = useCallback(
    (target: 1 | 2 | 3) => {
      setFieldErrors({});
      setInternalStep(target);
      onStepChange?.(target);
    },
    [onStepChange],
  );

  /** True when the required child fields (name, age, gender — all on the
   *  situation step) are filled; otherwise marks and scrolls to the first
   *  missing one. Guards the step-1 → step-2 transition, the wizard's own CTA
   *  and, via `onRegisterValidateChild`, a submit button rendered outside. */
  const validateChild = useCallback((): boolean => {
    const errors: ChildFieldErrors = {};
    if (!intake.name.trim() || intake.name.trim().length < 2) {
      errors.name = t('wizard.errorName');
    }
    if (!intake.age) {
      errors.age = t('wizard.errorAge');
    }
    if (!intake.gender) {
      errors.gender = t('wizard.errorGender');
    }
    if (errors.name || errors.age || errors.gender) {
      setFieldErrors(errors);
      // Take the parent straight to the first missing field instead of a
      // banner rendered screens above the submit button.
      const target = errors.name ? nameRef.current : errors.age ? ageRef.current : null;
      if (target) {
        target.scrollIntoView({ behavior: 'auto', block: 'center' });
        target.focus({ preventScroll: true });
      } else {
        genderRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      return false;
    }
    return true;
  }, [intake, t]);

  const handleFinish = useCallback(() => {
    if (!validateChild()) return;
    onSubmit();
  }, [validateChild, onSubmit]);

  /** Leaving the situation step means the required child fields are on screen
   *  right there — validate before moving on rather than at submit. */
  const handleWhoNext = useCallback(() => {
    if (!validateChild()) return;
    goToStep(3);
  }, [validateChild, goToStep]);

  useEffect(() => {
    onRegisterValidateChild?.(validateChild);
  }, [onRegisterValidateChild, validateChild]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (step === 1) goToStep(2);
      else if (step === 2) handleWhoNext();
      else handleFinish();
      // step 1 is unreachable when skipTopicStep is set; the branch is harmless.
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, goToStep, handleWhoNext, handleFinish]);

  const trimmedName = intake.name.trim();

  if (!intake.topic) {
    return null;
  }

  return (
    <section className={`pt-28 px-6 bg-gray-50 ${hideChildSubmit ? 'pb-6' : 'pb-20 min-h-screen'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('wizard.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-3">
            {t('wizard.heading')}
          </h1>
          {/* Repeat the selected topic in the header so parents always see
              which problem the wizard is configured for (4.6). */}
          <p className="text-calm-700 text-base font-semibold">
            {t('wizard.topicLabel')}{' '}
            <span className="text-magic-600">{intake.topic.catalog.shortTitle}</span>
          </p>
        </div>

        <div
          ref={formCardRef}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden scroll-mt-24"
        >
          {showProgressNav && (
            <div className="bg-calm-50 px-6 py-4 border-b border-calm-100 flex justify-between items-center text-xs md:text-sm font-bold text-gray-400 gap-2 flex-wrap">
              <span className={step === 1 ? 'text-magic-600' : 'text-calm-500'}>
                1. {t('wizard.navTopic')}
              </span>
              <i className="fa-solid fa-chevron-right text-calm-200" />
              <span
                className={
                  step === 2 ? 'text-magic-600' : step > 2 ? 'text-calm-500' : 'text-gray-400'
                }
              >
                2. {t('wizard.navSituation')}
              </span>
              <i className="fa-solid fa-chevron-right text-calm-200" />
              <span className={step === 3 ? 'text-magic-600' : 'text-gray-400'}>
                3. {t('wizard.navChild')}
              </span>
            </div>
          )}

          <div className="p-6 md:p-10">
            {step === 1 && (
              <StepTopic topic={intake.topic} onNext={() => goToStep(2)} onChange={onChangeTopic} />
            )}

            {step === 2 && (
              <StepSituation
                intake={intake}
                value={intake.situation}
                onChangeValue={(v) => update('situation', v)}
                onChangeName={(v) => update('name', v)}
                onChangeAge={(v) => update('age', v)}
                onChangeGender={(v) => update('gender', v)}
                onBack={skipTopicStep ? undefined : () => goToStep(1)}
                onNext={handleWhoNext}
                placeholder={situationPlaceholder(intake.topic, t)}
                fieldErrors={fieldErrors}
                nameRef={nameRef}
                ageRef={ageRef}
                genderRef={genderRef}
              />
            )}

            {step === 3 && (
              <StepChild
                intake={intake}
                onChangeAppearance={updateAppearance}
                onChangeToy={(v) => update('favoriteToy', v)}
                onBack={() => goToStep(2)}
                onSubmit={handleFinish}
                hideSubmit={hideChildSubmit}
                trimmedName={trimmedName}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Step 1: confirm topic ────────────────────────────

function StepTopic({
  topic,
  onNext,
  onChange,
}: {
  topic: SelectedTopic;
  onNext: () => void;
  onChange: () => void;
}) {
  const { t } = useTranslation('book');
  const emoji = topic.catalog.emoji;
  const title = topic.catalog.shortTitle;
  const desc = topic.catalog.shortDesc;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-calm-900 mb-2">
          {t('wizard.selectedTopicHeading')}
        </h2>
        <p className="text-gray-500 text-sm">{t('wizard.selectedTopicHint')}</p>
      </div>

      <div className="bg-calm-50 rounded-2xl p-6 border-2 border-calm-500">
        <div className="flex items-start gap-4">
          <div className="text-3xl">{emoji}</div>
          <div className="flex-1">
            <h3 className="font-bold text-calm-900 text-lg">{title}</h3>
            <p className="text-gray-600 text-sm mt-1">{desc}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onChange}
        className="text-calm-500 hover:text-calm-800 font-bold text-sm transition"
      >
        <i className="fa-solid fa-arrow-left mr-1" /> {t('wizard.changeTopic')}
      </button>

      <div className="pt-4">
        <button
          type="button"
          onClick={onNext}
          className="w-full bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-magic-500/30 transition"
        >
          {t('wizard.nextSituation')} <i className="fa-solid fa-arrow-right ml-2" />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: situation ────────────────────────────────

function StepSituation({
  intake,
  value,
  onChangeValue,
  onChangeName,
  onChangeAge,
  onChangeGender,
  onBack,
  onNext,
  placeholder,
  fieldErrors,
  nameRef,
  ageRef,
  genderRef,
}: {
  intake: IntakeState;
  value: string;
  onChangeValue: (v: string) => void;
  onChangeName: (v: string) => void;
  onChangeAge: (v: number | null) => void;
  onChangeGender: (v: Gender) => void;
  /** Omitted when the topic step is skipped — there is nowhere to go back to. */
  onBack?: () => void;
  onNext: () => void;
  placeholder: string;
  fieldErrors: ChildFieldErrors;
  nameRef: RefObject<HTMLInputElement | null>;
  ageRef: RefObject<HTMLSelectElement | null>;
  genderRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation('book');
  const showNudge = value.trim().length === 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Who the book is for comes first: three trivial fields the parent
          answers in seconds, before the one question that costs real effort.
          The appearance details stay on the next step. */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-calm-900 mb-2">
            {t('wizard.childName')} <span className="text-red-500">*</span>
          </label>
          <input
            ref={nameRef}
            type="text"
            value={intake.name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder={t('wizard.childNamePlaceholder')}
            maxLength={30}
            aria-invalid={!!fieldErrors.name}
            className={`w-full p-4 bg-gray-50 border-2 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-lg ${errorBorderClass(
              !!fieldErrors.name,
            )}`}
          />
          <FieldError message={fieldErrors.name} />
        </div>
        <div>
          <label className="block text-sm font-bold text-calm-900 mb-2">
            {t('wizard.age')} <span className="text-red-500">*</span>
          </label>
          <select
            ref={ageRef}
            value={intake.age ?? ''}
            onChange={(e) => onChangeAge(e.target.value ? Number(e.target.value) : null)}
            aria-invalid={!!fieldErrors.age}
            className={`w-full p-4 bg-gray-50 border-2 rounded-2xl focus:border-magic-500 outline-none transition font-semibold text-lg cursor-pointer ${errorBorderClass(
              !!fieldErrors.age,
            )}`}
          >
            <option value="" disabled>
              {t('wizard.agePlaceholder')}
            </option>
            {AGE_OPTIONS.map((age) => (
              <option key={age} value={age}>
                {ageLabel(age)}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.age} />
        </div>
      </div>

      <div ref={genderRef} className="scroll-mt-24">
        <label className="block text-sm font-bold text-calm-900 mb-3">
          {t('wizard.gender')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          {(['boy', 'girl'] as const).map((g) => (
            <label key={g} className="cursor-pointer relative">
              <input
                type="radio"
                name="gender"
                value={g}
                checked={intake.gender === g}
                onChange={() => onChangeGender(g)}
                className="peer sr-only"
              />
              <div className="p-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition text-center peer-checked:border-magic-500 peer-checked:bg-amber-50">
                <div className="text-4xl mb-2">{g === 'boy' ? '👦' : '👧'}</div>
                <div className="font-bold text-calm-900">
                  {g === 'boy' ? t('wizard.genderBoy') : t('wizard.genderGirl')}
                </div>
              </div>
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.gender} />
      </div>
      <div>
        <label className="block text-sm font-bold text-calm-900 mb-2">
          {t('wizard.situationLabel')}
        </label>
        <textarea
          rows={6}
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-base resize-none"
        />
        {showNudge && (
          <p className="text-sm text-magic-600 mt-2">
            <i className="fa-solid fa-lightbulb mr-1" />
            {t('wizard.situationNudge')}
          </p>
        )}
      </div>

      <div className="flex gap-4 pt-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition"
          >
            {t('wizard.back')}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className={`${onBack ? 'w-2/3' : 'w-full'} bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-magic-500/30 transition`}
        >
          {t('wizard.nextChild')} <i className="fa-solid fa-arrow-right ml-2" />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: child details (consolidated) ─────────────

function StepChild({
  intake,
  onChangeAppearance,
  onChangeToy,
  onBack,
  onSubmit,
  hideSubmit,
  trimmedName,
}: {
  intake: IntakeState;
  onChangeAppearance: <K extends keyof AppearanceData>(key: K, value: AppearanceData[K]) => void;
  onChangeToy: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  hideSubmit?: boolean;
  trimmedName: string;
}) {
  const { t } = useTranslation('book');

  const submitLabel = trimmedName
    ? t('wizard.submitFor', { nameGen: genitiveOrSelf(trimmedName) })
    : t('wizard.submit');

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid md:grid-cols-3 gap-6">
        <SelectField
          label={t('wizard.eyeColor')}
          value={intake.appearance.eyeColor}
          options={EYE_OPTIONS}
          onChange={(v) => onChangeAppearance('eyeColor', v)}
        />
        <SelectField
          label={t('wizard.hairColor')}
          value={intake.appearance.hairColor}
          options={HAIR_COLOR_OPTIONS}
          onChange={(v) => onChangeAppearance('hairColor', v)}
        />
        <SelectField
          label={t('wizard.hairLength')}
          value={intake.appearance.hairLength}
          options={HAIR_LENGTH_OPTIONS}
          onChange={(v) => onChangeAppearance('hairLength', v)}
        />
      </div>

      <div className="flex items-center">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={intake.appearance.glasses}
            onChange={(e) => onChangeAppearance('glasses', e.target.checked)}
            className="w-6 h-6 text-magic-500 border-gray-300 rounded focus:ring-magic-500"
          />
          <span className="font-bold text-calm-900">{t('wizard.glasses')}</span>
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-calm-900 mb-2">
            {t('wizard.toy')} <span className="text-gray-400">{t('wizard.toyOptional')}</span>
          </label>
          <input
            type="text"
            value={intake.favoriteToy}
            onChange={(e) => onChangeToy(e.target.value)}
            placeholder={t('wizard.toyPlaceholder')}
            maxLength={100}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-calm-900 mb-2">
            {t('wizard.outfit')} <span className="text-gray-400">{t('wizard.outfitOptional')}</span>
          </label>
          <input
            type="text"
            value={intake.appearance.outfitText}
            onChange={(e) => onChangeAppearance('outfitText', e.target.value)}
            placeholder={t('wizard.outfitPlaceholder')}
            maxLength={120}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold"
          />
          <p className="text-xs text-gray-400 mt-1">{t('wizard.outfitHint')}</p>
        </div>
      </div>

      {/* Hidden when the checkout shares this screen — it owns the only CTA. */}
      {!hideSubmit && (
        <>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition"
            >
              {t('wizard.back')}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="w-2/3 bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-magic-500/30 transition"
            >
              {submitLabel} <i className="fa-solid fa-arrow-right ml-2" />
            </button>
          </div>

          {/* The preview screen is gone from the flow, so this is where the
              parent learns that clicking is not a purchase: the book is
              generated first, the buy/format decision comes after it. */}
          <div className="mt-4 flex gap-3 rounded-2xl bg-magic-50 border border-magic-100 p-4">
            <i className="fa-solid fa-circle-info text-magic-500 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-calm-700 leading-relaxed">
              <span className="font-bold text-calm-900">{t('wizard.submitNoteHeading')}</span>{' '}
              {t('wizard.submitNote', {
                pdfPrice: formatPricePLN(BOOK_PRICE_PDF_PLN),
                printPrice: formatPricePLN(BOOK_PRICE_PRINT_PLN),
              })}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-calm-900 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none transition font-semibold cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// Map prototype categories to translation key suffixes.
const CATEGORY_PLACEHOLDER_KEY: Record<string, string> = {
  sen: 'wizard.situationPlaceholderSen',
  emocje: 'wizard.situationPlaceholderEmocje',
  higiena: 'wizard.situationPlaceholderHigiena',
  relacje: 'wizard.situationPlaceholderRelacje',
  leki: 'wizard.situationPlaceholderLeki',
  trudne: 'wizard.situationPlaceholderTrudne',
  roznorodnosc: 'wizard.situationPlaceholderRoznorodnosc',
};

function situationPlaceholder(topic: SelectedTopic, t: TFunction): string {
  // Per-problem placeholder takes precedence (spec section 3.3). Falls back to
  // category placeholder if a problem-specific one isn't translated yet.
  if (topic.problemId) {
    const perProblemKey = `wizard.situationPlaceholderByProblem.${topic.problemId}`;
    const perProblem = t(perProblemKey);
    if (perProblem && perProblem !== perProblemKey) return perProblem;
  }
  const key = CATEGORY_PLACEHOLDER_KEY[topic.category];
  return key ? t(key) : t('wizard.situationPlaceholder');
}
