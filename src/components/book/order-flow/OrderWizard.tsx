import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Topic } from '../../../../convex/lib/topics';
import { FieldError } from './FieldError';
import { errorBorderClass } from './fieldStyles';
import { ageLabel, type AppearanceData, type Gender, type IntakeState } from './types';

type WizardStep = 'situation' | 'child';

interface Props {
  intake: IntakeState;
  onChange: (next: IntakeState) => void;
  /** Controlled by the flow — the step lives in the URL (?krok=). */
  step: WizardStep;
  /** Situation → child, called once the required fields validate. */
  onNext: () => void;
  /** Back to the topic picker. */
  onChangeTopic: () => void;
  /**
   * Hands the child-field validator to the parent, so the submit button in
   * the checkout below still gets per-field errors and the
   * scroll-to-first-missing-field behaviour.
   */
  onRegisterValidateChild?: (validate: () => boolean) => void;
}

/** Per-field validation errors for the required child fields. */
interface ChildFieldErrors {
  name?: string;
  age?: string;
  gender?: string;
}

// Age list 2-12. The pipeline maps age 2 to the smallest bracket ('3-5') in
// convex/lib/ageBracket.ts.
const AGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Mirrors the problemDetail cap in convex/bookPipeline.ts validateOrderInput —
// without the client-side cap the backend rejects the whole submit.
const SITUATION_MAX = 500;

const EYE_OPTIONS = ['Niebieskie', 'Zielone', 'Brązowe', 'Szare'];
const HAIR_COLOR_OPTIONS = ['Blond', 'Brązowe', 'Czarne', 'Rude'];
const HAIR_LENGTH_OPTIONS = ['Krótkie', 'Średnie', 'Długie'];

/**
 * The order form's two screens:
 *  - situation: name, age, gender (required) and the free-text description
 *  - child: appearance, glasses, outfit, favourite toy (all optional); the
 *    checkout rendered below it owns the only submit button
 */
export function OrderWizard({
  intake,
  onChange,
  step,
  onNext,
  onChangeTopic,
  onRegisterValidateChild,
}: Props) {
  const { t } = useTranslation('book');
  const [fieldErrors, setFieldErrors] = useState<ChildFieldErrors>({});
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const ageRef = useRef<HTMLSelectElement | null>(null);
  const genderRef = useRef<HTMLDivElement | null>(null);

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
    setFieldErrors({});
    formCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [step]);

  const update = useCallback(
    <K extends keyof IntakeState>(key: K, value: IntakeState[K]) => {
      onChange({ ...intake, [key]: value });
      // Clear only the edited field's error — dropping all of them resized
      // the card mid-typing.
      if (key === 'name' || key === 'age' || key === 'gender') {
        const field = key as keyof ChildFieldErrors;
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
      }
    },
    [intake, onChange],
  );

  const updateAppearance = useCallback(
    <K extends keyof AppearanceData>(key: K, value: AppearanceData[K]) => {
      onChange({ ...intake, appearance: { ...intake.appearance, [key]: value } });
    },
    [intake, onChange],
  );

  /** True when name, age and gender are filled; otherwise marks and scrolls
   *  to the first missing one. Guards situation → child and, via
   *  `onRegisterValidateChild`, the checkout's submit button. */
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

  const handleNext = useCallback(() => {
    if (!validateChild()) return;
    onNext();
  }, [validateChild, onNext]);

  useEffect(() => {
    onRegisterValidateChild?.(validateChild);
  }, [onRegisterValidateChild, validateChild]);

  // Ctrl/Cmd+Enter moves on from the situation screen.
  useEffect(() => {
    if (step !== 'situation') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      handleNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, handleNext]);

  if (!intake.topic) {
    return null;
  }

  return (
    <section
      className={`pt-28 px-6 bg-gray-50 ${step === 'child' ? 'pb-6' : 'pb-20 min-h-screen'}`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-accent-ink font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('wizard.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-primary-900 mb-3">
            {t('wizard.heading')}
          </h1>
          {/* The chosen topic stays visible, with a way back to the picker. */}
          <p className="text-primary-700 text-base font-semibold">
            {t('wizard.topicLabel')}{' '}
            <span className="text-accent-ink">{intake.topic.catalog.shortTitle}</span>{' '}
            <button
              type="button"
              onClick={onChangeTopic}
              className="ml-1 text-sm text-primary-ink underline underline-offset-2 hover:text-primary-900"
            >
              {t('wizard.changeTopic')}
            </button>
          </p>
        </div>

        <div
          ref={formCardRef}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden scroll-mt-24"
        >
          <div className="p-6 md:p-10">
            {step === 'situation' ? (
              <StepSituation
                intake={intake}
                value={intake.situation}
                onChangeValue={(v) => update('situation', v)}
                onChangeName={(v) => update('name', v)}
                onChangeAge={(v) => update('age', v)}
                onChangeGender={(v) => update('gender', v)}
                onNext={handleNext}
                placeholder={situationPlaceholder(intake.topic, t)}
                fieldErrors={fieldErrors}
                nameRef={nameRef}
                ageRef={ageRef}
                genderRef={genderRef}
              />
            ) : (
              <StepChild
                intake={intake}
                onChangeAppearance={updateAppearance}
                onChangeToy={(v) => update('favoriteToy', v)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Situation: who the book is for + what's going on ─────

function StepSituation({
  intake,
  value,
  onChangeValue,
  onChangeName,
  onChangeAge,
  onChangeGender,
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
          <label className="block text-sm font-bold text-primary-900 mb-2">
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
            className={`w-full p-4 bg-gray-50 border-2 rounded-2xl focus:border-accent-500 focus:bg-white outline-none transition font-semibold text-lg ${errorBorderClass(
              !!fieldErrors.name,
            )}`}
          />
          <FieldError message={fieldErrors.name} />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary-900 mb-2">
            {t('wizard.age')} <span className="text-red-500">*</span>
          </label>
          <select
            ref={ageRef}
            value={intake.age ?? ''}
            onChange={(e) => onChangeAge(e.target.value ? Number(e.target.value) : null)}
            aria-invalid={!!fieldErrors.age}
            className={`w-full p-4 bg-gray-50 border-2 rounded-2xl focus:border-accent-500 outline-none transition font-semibold text-lg cursor-pointer ${errorBorderClass(
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
        <label className="block text-sm font-bold text-primary-900 mb-3">
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
              <div className="p-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition text-center peer-checked:border-accent-500 peer-checked:bg-accent-50">
                <div className="text-4xl mb-2">{g === 'boy' ? '👦' : '👧'}</div>
                <div className="font-bold text-primary-900">
                  {g === 'boy' ? t('wizard.genderBoy') : t('wizard.genderGirl')}
                </div>
              </div>
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.gender} />
      </div>
      <div>
        <label className="block text-sm font-bold text-primary-900 mb-2">
          {t('wizard.situationLabel')}
        </label>
        <textarea
          rows={6}
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          placeholder={placeholder}
          maxLength={SITUATION_MAX}
          className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-accent-500 focus:bg-white outline-none transition font-semibold text-base resize-none"
        />
        {value.length >= SITUATION_MAX * 0.8 && (
          <p
            className={`text-sm mt-2 text-right ${
              value.length >= SITUATION_MAX ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {value.length}/{SITUATION_MAX}
          </p>
        )}
        {showNudge && (
          <p className="text-sm text-accent-ink mt-2">
            <i className="fa-solid fa-lightbulb mr-1" />
            {t('wizard.situationNudge')}
          </p>
        )}
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={onNext}
          className="w-full bg-accent-500 hover:bg-accent-600 text-on-accent font-bold py-4 rounded-2xl text-lg shadow-lg shadow-accent-500/30 transition"
        >
          {t('wizard.nextChild')} <i className="fa-solid fa-arrow-right ml-2" />
        </button>
      </div>
    </div>
  );
}

// ── Child: appearance details (all optional) ─────────────

function StepChild({
  intake,
  onChangeAppearance,
  onChangeToy,
}: {
  intake: IntakeState;
  onChangeAppearance: <K extends keyof AppearanceData>(key: K, value: AppearanceData[K]) => void;
  onChangeToy: (v: string) => void;
}) {
  const { t } = useTranslation('book');

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
            className="w-6 h-6 accent-accent-500 border-gray-300 rounded"
          />
          <span className="font-bold text-primary-900">{t('wizard.glasses')}</span>
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-primary-900 mb-2">
            {t('wizard.toy')} <span className="text-gray-400">{t('wizard.toyOptional')}</span>
          </label>
          <input
            type="text"
            value={intake.favoriteToy}
            onChange={(e) => onChangeToy(e.target.value)}
            placeholder={t('wizard.toyPlaceholder')}
            maxLength={100}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-accent-500 focus:bg-white outline-none transition font-semibold"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary-900 mb-2">
            {t('wizard.outfit')} <span className="text-gray-400">{t('wizard.outfitOptional')}</span>
          </label>
          <input
            type="text"
            value={intake.appearance.outfitText}
            onChange={(e) => onChangeAppearance('outfitText', e.target.value)}
            placeholder={t('wizard.outfitPlaceholder')}
            maxLength={120}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-accent-500 focus:bg-white outline-none transition font-semibold"
          />
          <p className="text-xs text-gray-400 mt-1">{t('wizard.outfitHint')}</p>
        </div>
      </div>
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
      <label className="block text-sm font-bold text-primary-900 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-accent-500 outline-none transition font-semibold cursor-pointer"
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

// Catalog category → fallback placeholder key.
const CATEGORY_PLACEHOLDER_KEY: Record<string, string> = {
  sen: 'wizard.situationPlaceholderSen',
  emocje: 'wizard.situationPlaceholderEmocje',
  higiena: 'wizard.situationPlaceholderHigiena',
  relacje: 'wizard.situationPlaceholderRelacje',
  leki: 'wizard.situationPlaceholderLeki',
  trudne: 'wizard.situationPlaceholderTrudne',
  roznorodnosc: 'wizard.situationPlaceholderRoznorodnosc',
};

function situationPlaceholder(topic: Topic, t: TFunction): string {
  // Per-problem placeholder first; the category one when a problem has none.
  const perProblemKey = `wizard.situationPlaceholderByProblem.${topic.problemId}`;
  const perProblem = t(perProblemKey);
  if (perProblem && perProblem !== perProblemKey) return perProblem;
  const key = CATEGORY_PLACEHOLDER_KEY[topic.category];
  return key ? t(key) : t('wizard.situationPlaceholder');
}
