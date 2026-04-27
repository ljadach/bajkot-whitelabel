import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  ageLabel,
  isOtherTopic,
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
}

// Pipeline supports ages 3-16 (see convex/lib/ageBracket.ts). Wizard caps
// at 12 to match the prototype copy / target audience.
const AGE_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
}: Props) {
  const { t } = useTranslation('book');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState('');

  const update = useCallback(
    <K extends keyof IntakeState>(key: K, value: IntakeState[K]) => {
      onChange({ ...intake, [key]: value });
      setError('');
    },
    [intake, onChange],
  );

  const updateAppearance = useCallback(
    <K extends keyof AppearanceData>(key: K, value: AppearanceData[K]) => {
      onChange({ ...intake, appearance: { ...intake.appearance, [key]: value } });
      setError('');
    },
    [intake, onChange],
  );

  const goToStep = (target: 1 | 2 | 3) => {
    setError('');
    setStep(target);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinish = () => {
    if (!intake.name.trim() || intake.name.trim().length < 2) {
      setError(t('wizard.errorName'));
      return;
    }
    if (!intake.age) {
      setError(t('wizard.errorAge'));
      return;
    }
    if (!intake.gender) {
      setError(t('wizard.errorGender'));
      return;
    }
    onSubmit();
  };

  const trimmedName = intake.name.trim();

  if (!intake.topic) {
    return null;
  }

  return (
    <section className="pt-28 pb-20 px-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('wizard.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
            {t('wizard.heading')}
          </h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
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
            {error && (
              <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {step === 1 && (
              <StepTopic topic={intake.topic} onNext={() => goToStep(2)} onChange={onChangeTopic} />
            )}

            {step === 2 && (
              <StepSituation
                value={intake.situation}
                onChangeValue={(v) => update('situation', v)}
                onBack={() => goToStep(1)}
                onNext={() => goToStep(3)}
                placeholder={situationPlaceholder(intake.topic, t)}
              />
            )}

            {step === 3 && (
              <StepChild
                intake={intake}
                onChangeName={(v) => update('name', v)}
                onChangeAge={(v) => update('age', v)}
                onChangeGender={(v) => update('gender', v)}
                onChangeAppearance={updateAppearance}
                onChangeToy={(v) => update('favoriteToy', v)}
                onBack={() => goToStep(2)}
                onSubmit={handleFinish}
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
  const emoji = isOtherTopic(topic) ? topic.emoji : topic.catalog.emoji;
  const title = isOtherTopic(topic) ? topic.shortTitle : topic.catalog.shortTitle;
  const desc = isOtherTopic(topic) ? topic.shortDesc : topic.catalog.shortDesc;

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
  value,
  onChangeValue,
  onBack,
  onNext,
  placeholder,
}: {
  value: string;
  onChangeValue: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  placeholder: string;
}) {
  const { t } = useTranslation('book');
  const showNudge = value.trim().length === 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-calm-900 mb-2">{t('wizard.situationHeading')}</h2>
        <p className="text-gray-500 text-sm">{t('wizard.situationHint')}</p>
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
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition"
        >
          {t('wizard.back')}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="w-2/3 bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-magic-500/30 transition"
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
  onChangeName,
  onChangeAge,
  onChangeGender,
  onChangeAppearance,
  onChangeToy,
  onBack,
  onSubmit,
  trimmedName,
}: {
  intake: IntakeState;
  onChangeName: (v: string) => void;
  onChangeAge: (v: number | null) => void;
  onChangeGender: (v: Gender) => void;
  onChangeAppearance: <K extends keyof AppearanceData>(key: K, value: AppearanceData[K]) => void;
  onChangeToy: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  trimmedName: string;
}) {
  const { t } = useTranslation('book');

  const submitLabel = trimmedName
    ? t('wizard.submitFor', { name: trimmedName })
    : t('wizard.submit');

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-calm-900 mb-2">{t('wizard.childHeading')}</h2>
        <p className="text-gray-500 text-sm">{t('wizard.childHint')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-calm-900 mb-2">
            {t('wizard.childName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={intake.name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder={t('wizard.childNamePlaceholder')}
            maxLength={30}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-calm-900 mb-2">
            {t('wizard.age')} <span className="text-red-500">*</span>
          </label>
          <select
            value={intake.age ?? ''}
            onChange={(e) => onChangeAge(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none transition font-semibold text-lg cursor-pointer"
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
        </div>
      </div>

      <div>
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
      </div>

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
  if (isOtherTopic(topic)) return t('wizard.situationPlaceholderOther');
  const key = CATEGORY_PLACEHOLDER_KEY[topic.category];
  return key ? t(key) : t('wizard.situationPlaceholder');
}
