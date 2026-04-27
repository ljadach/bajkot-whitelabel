import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import {
  PROBLEMS,
  PROBLEM_CATEGORIES,
  AGE_BRACKETS,
  HAIR_COLORS,
  HAIR_STYLES,
  EYE_COLORS,
  SKIN_TONES,
  OUTFITS,
  type ProblemCategory,
  type ProblemId,
} from '@lib/bookData';

const FORM_STEPS = ['child', 'problem', 'appearance', 'guide', 'summary'] as const;

interface FormData {
  childName: string;
  ageBracket: '3-5' | '6-8' | '9+';
  gender: 'boy' | 'girl';
  problemCategory: ProblemCategory | '';
  problemId: ProblemId | '';
  problemDetail: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  outfit: string;
  glasses: boolean;
  favoriteToy: string;
  email: string;
  disclaimer: boolean;
  skipQaReviews: boolean;
}

const initialForm: FormData = {
  childName: '',
  ageBracket: '3-5',
  gender: 'boy',
  problemCategory: '',
  problemId: '',
  problemDetail: '',
  hairColor: 'blond',
  hairStyle: 'krotkie_proste',
  eyeColor: 'niebieskie',
  skinTone: 'jasna',
  outfit: 'bluza_dinozaur',
  glasses: false,
  favoriteToy: '',
  email: '',
  disclaimer: false,
  skipQaReviews: false,
};

export function BookOrderForm() {
  const { t } = useTranslation('book');
  const navigate = useNavigate();
  const startOrder = useAction(api.bookPipeline.startOrder);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chosenStyleExport, setChosenStyleExport] = useState<'A' | 'B'>('A');
  const [jsonCopied, setJsonCopied] = useState(false);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const filteredProblems = useMemo(() => {
    if (!form.problemCategory) return [];
    return Object.entries(PROBLEMS).filter(([, p]) => p.category === form.problemCategory);
  }, [form.problemCategory]);

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!form.childName.trim() || form.childName.trim().length < 2) {
        setError(t('order.validationName'));
        return false;
      }
    }
    if (step === 1) {
      if (!form.problemId) {
        setError(t('order.validationProblem'));
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setError('');
    setStep((s) => Math.min(s + 1, FORM_STEPS.length - 1));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const copyProfileJson = useCallback(() => {
    const profile = {
      childName: form.childName.trim(),
      ageBracket: form.ageBracket,
      gender: form.gender,
      problemId: form.problemId,
      ...(form.problemDetail ? { problemDetail: form.problemDetail } : {}),
      ...(form.favoriteToy ? { favoriteToy: form.favoriteToy } : {}),
      hairColor: form.hairColor,
      hairStyle: form.hairStyle,
      eyeColor: form.eyeColor,
      skinTone: form.skinTone,
      outfit: form.outfit,
      glasses: form.glasses,
      ...(form.email ? { email: form.email } : {}),
      chosenStyle: chosenStyleExport,
    };
    void navigator.clipboard.writeText(JSON.stringify(profile, null, 2)).then(() => {
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    });
  }, [form, chosenStyleExport]);

  const handleSubmit = async () => {
    if (!form.disclaimer || isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      const result = await startOrder({
        childName: form.childName.trim(),
        ageBracket: form.ageBracket,
        gender: form.gender,
        problemId: form.problemId as string,
        problemDetail: form.problemDetail || undefined,
        favoriteToy: form.favoriteToy || undefined,
        glasses: form.glasses,
        hairColor: form.hairColor,
        hairStyle: form.hairStyle,
        eyeColor: form.eyeColor,
        skinTone: form.skinTone,
        outfit: form.outfit,
        email: form.email || undefined,
        skipQaReviews: form.skipQaReviews || undefined,
      });
      void navigate(`/book/${result.orderId}/progress`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsSubmitting(false);
    }
  };

  const stepLabels = [
    t('order.stepChild'),
    t('order.stepProblem'),
    t('order.stepAppearance'),
    t('order.stepGuide'),
    t('order.stepSummary'),
  ];

  const trimmedName = form.childName.trim();
  const submitLabel = isSubmitting
    ? t('order.submitting')
    : trimmedName
      ? t('order.submitFor', { name: trimmedName })
      : t('order.submit');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('order.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
            {t('order.heading')}
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            {t('order.subheading')}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Progress strip */}
          <div className="bg-calm-50 px-4 sm:px-6 py-4 border-b border-calm-100 flex justify-between items-center gap-2 text-[11px] sm:text-xs md:text-sm font-bold text-gray-400 overflow-x-auto">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
                <span
                  className={
                    i === step ? 'text-magic-600' : i < step ? 'text-calm-700' : 'text-gray-400'
                  }
                >
                  {i + 1}. {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <i className="fa-solid fa-chevron-right text-calm-200 text-[10px]" />
                )}
              </div>
            ))}
          </div>

          <div className="p-6 md:p-10">
            {error && (
              <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Step 1: Child */}
            {step === 0 && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-2xl font-bold text-calm-900 mb-2">
                    {t('order.sectionAboutChild')}
                  </h2>
                  <p className="text-gray-500 text-sm">{t('order.sectionAboutChildHint')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      {t('order.childName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.childName}
                      onChange={(e) => update('childName', e.target.value)}
                      placeholder={t('order.childNamePlaceholder')}
                      maxLength={30}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      {t('order.age')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.ageBracket}
                      onChange={(e) =>
                        update('ageBracket', e.target.value as FormData['ageBracket'])
                      }
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none transition font-semibold text-lg cursor-pointer"
                    >
                      {AGE_BRACKETS.map((ab) => (
                        <option key={ab} value={ab}>
                          {t(
                            `order.ageBracket${ab.replace('-', '').replace('+', '')}` as 'order.ageBracket35',
                          )}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-3">
                    {t('order.gender')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {(['boy', 'girl'] as const).map((g) => (
                      <label key={g} className="cursor-pointer relative">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={form.gender === g}
                          onChange={() => update('gender', g)}
                          className="peer sr-only"
                        />
                        <div className="p-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition text-center peer-checked:border-magic-500 peer-checked:bg-amber-50">
                          <div className="text-4xl mb-2">{g === 'boy' ? '👦' : '👧'}</div>
                          <div className="font-bold text-calm-900">
                            {g === 'boy' ? t('order.genderBoy') : t('order.genderGirl')}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Problem */}
            {step === 1 && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-2xl font-bold text-calm-900 mb-2">
                    {t('order.sectionTopic')}
                  </h2>
                  <p className="text-gray-500 text-sm">{t('order.sectionTopicHint')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      {t('order.problemCategory')}
                    </label>
                    <select
                      value={form.problemCategory}
                      onChange={(e) => {
                        update('problemCategory', e.target.value as ProblemCategory);
                        update('problemId', '');
                      }}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none transition font-semibold cursor-pointer"
                    >
                      <option value="">{t('order.problemCategoryPlaceholder')}</option>
                      {Object.entries(PROBLEM_CATEGORIES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      {t('order.problem')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.problemId}
                      onChange={(e) => update('problemId', e.target.value as ProblemId)}
                      disabled={!form.problemCategory}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none transition font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">{t('order.problemPlaceholder')}</option>
                      {filteredProblems.map(([key, p]) => (
                        <option key={key} value={key}>
                          {p.title_pl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-2">
                    {t('order.problemDetail')}
                  </label>
                  <textarea
                    value={form.problemDetail}
                    onChange={(e) => update('problemDetail', e.target.value)}
                    placeholder={t('order.problemDetailPlaceholder')}
                    maxLength={500}
                    rows={5}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-base resize-none"
                  />
                  <p className="mt-2 text-sm text-magic-600 font-semibold">
                    <i className="fa-solid fa-lightbulb mr-1" />
                    {t('order.problemDetailHint')}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Appearance */}
            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-2xl font-bold text-calm-900 mb-2">
                    {t('order.sectionAppearance')}
                  </h2>
                  <p className="text-gray-500 text-sm">{t('order.sectionAppearanceHint')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      {t('order.hairColor')}
                    </label>
                    <select
                      value={form.hairColor}
                      onChange={(e) => update('hairColor', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold cursor-pointer"
                    >
                      {Object.entries(HAIR_COLORS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      {t('order.hairStyle')}
                    </label>
                    <select
                      value={form.hairStyle}
                      onChange={(e) => update('hairStyle', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold cursor-pointer"
                    >
                      {Object.entries(HAIR_STYLES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      {t('order.eyeColor')}
                    </label>
                    <select
                      value={form.eyeColor}
                      onChange={(e) => update('eyeColor', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold cursor-pointer"
                    >
                      {Object.entries(EYE_COLORS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      {t('order.skinTone')}
                    </label>
                    <select
                      value={form.skinTone}
                      onChange={(e) => update('skinTone', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold cursor-pointer"
                    >
                      {Object.entries(SKIN_TONES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-2">
                    {t('order.outfit')}
                  </label>
                  <select
                    value={form.outfit}
                    onChange={(e) => update('outfit', e.target.value)}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold cursor-pointer"
                  >
                    {Object.entries(OUTFITS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.glasses}
                      onChange={(e) => update('glasses', e.target.checked)}
                      className="w-6 h-6 text-magic-500 border-gray-300 rounded focus:ring-magic-500"
                    />
                    <span className="font-bold text-calm-900">{t('order.glasses')} 👓</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 4: Guide */}
            {step === 3 && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h2 className="text-2xl font-bold text-calm-900 mb-2">
                    {t('order.sectionGuide')}
                  </h2>
                  <p className="text-gray-500 text-sm">{t('order.guideDescription')}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-2">
                    {t('order.favoriteToy')}
                  </label>
                  <input
                    type="text"
                    value={form.favoriteToy}
                    onChange={(e) => update('favoriteToy', e.target.value)}
                    placeholder={t('order.favoriteToyPlaceholder')}
                    maxLength={100}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-lg"
                  />
                  <p className="mt-2 text-xs text-gray-500">{t('order.favoriteToyHint')}</p>
                </div>

                {/* What you'll receive — informational preview, no submission */}
                <div className="bg-calm-50 border border-calm-100 rounded-3xl p-6">
                  <h3 className="text-lg font-black text-calm-900 mb-4">
                    <i className="fa-solid fa-gift text-magic-500 mr-2" />
                    {t('preview.includesHeading')}
                  </h3>
                  <ul className="space-y-2.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <li key={n} className="flex items-start gap-3">
                        <i className="fa-solid fa-check-circle text-green-500 mt-1 shrink-0" />
                        <span className="text-sm text-gray-700">
                          <strong className="text-calm-900">{t(`preview.include${n}Title`)}</strong>{' '}
                          — {t(`preview.include${n}Body`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Step 5: Summary */}
            {step === 4 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                    <i className="fa-solid fa-wand-sparkles" />
                  </div>
                  <h2 className="text-2xl font-bold text-calm-900 mb-2">
                    {t('order.sectionSummary')}
                  </h2>
                  <p className="text-gray-500 text-sm">{t('order.sectionSummaryHint')}</p>
                </div>

                <div className="space-y-3">
                  <SummaryGroup label={t('order.summaryChild')} icon="fa-user">
                    <SummaryRow label={t('order.childName')} value={form.childName} />
                    <SummaryRow label={t('order.age')} value={form.ageBracket} />
                    <SummaryRow
                      label={t('order.gender')}
                      value={form.gender === 'boy' ? t('order.genderBoy') : t('order.genderGirl')}
                    />
                  </SummaryGroup>

                  <SummaryGroup label={t('order.summaryProblem')} icon="fa-book-open">
                    <SummaryRow
                      label={t('order.problem')}
                      value={form.problemId ? PROBLEMS[form.problemId]?.title_pl : '—'}
                    />
                    {form.problemDetail && (
                      <SummaryRow label={t('order.problemDetail')} value={form.problemDetail} />
                    )}
                  </SummaryGroup>

                  <SummaryGroup label={t('order.summaryAppearance')} icon="fa-palette">
                    <SummaryRow
                      label={t('order.hairColor')}
                      value={
                        HAIR_COLORS[form.hairColor as keyof typeof HAIR_COLORS] ?? form.hairColor
                      }
                    />
                    <SummaryRow
                      label={t('order.hairStyle')}
                      value={
                        HAIR_STYLES[form.hairStyle as keyof typeof HAIR_STYLES] ?? form.hairStyle
                      }
                    />
                    <SummaryRow
                      label={t('order.eyeColor')}
                      value={EYE_COLORS[form.eyeColor as keyof typeof EYE_COLORS] ?? form.eyeColor}
                    />
                    <SummaryRow
                      label={t('order.skinTone')}
                      value={SKIN_TONES[form.skinTone as keyof typeof SKIN_TONES] ?? form.skinTone}
                    />
                    <SummaryRow
                      label={t('order.outfit')}
                      value={OUTFITS[form.outfit as keyof typeof OUTFITS] ?? form.outfit}
                    />
                    <SummaryRow
                      label={t('order.glasses')}
                      value={form.glasses ? t('order.glassesYes') : t('order.glassesNo')}
                    />
                  </SummaryGroup>

                  <SummaryGroup label={t('order.summaryGuide')} icon="fa-hat-wizard">
                    {form.favoriteToy ? (
                      <SummaryRow label={t('order.favoriteToy')} value={form.favoriteToy} />
                    ) : (
                      <p className="text-xs text-gray-500 px-1 py-1">{t('order.summaryNoToy')}</p>
                    )}
                  </SummaryGroup>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-2">
                    {t('order.email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder={t('order.emailPlaceholder')}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-lg"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('order.emailHint')}</p>
                </div>

                {/* Dev-only batch export */}
                {import.meta.env.DEV && (
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-3">
                    <p className="text-xs font-semibold text-neutral-500 mb-2">Dev tools</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={chosenStyleExport}
                        onChange={(e) => setChosenStyleExport(e.target.value as 'A' | 'B')}
                        className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm"
                      >
                        <option value="A">Styl A (collage)</option>
                        <option value="B">Styl B (akwarela)</option>
                      </select>
                      <button
                        type="button"
                        onClick={copyProfileJson}
                        className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
                      >
                        {jsonCopied ? 'Skopiowano!' : 'Kopiuj profil JSON'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.disclaimer}
                      onChange={(e) => update('disclaimer', e.target.checked)}
                      className="mt-1 w-5 h-5 text-magic-500 border-gray-300 rounded focus:ring-magic-500 shrink-0"
                    />
                    <span className="text-sm text-calm-900 leading-relaxed">
                      {t('order.disclaimer')} <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>

                {/* Fast mode toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.skipQaReviews}
                    onChange={(e) => update('skipQaReviews', e.target.checked)}
                    className="shrink-0"
                  />
                  <span className="text-xs text-neutral-500">
                    <span className="font-semibold text-amber-600">FAST</span> — pomiń recenzje QA
                  </span>
                </label>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-4 pt-8">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition"
                >
                  <i className="fa-solid fa-arrow-left mr-2" />
                  {t('order.back')}
                </button>
              )}
              {step < FORM_STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={goNext}
                  className={`${step === 0 ? 'w-full' : 'w-2/3'} bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-magic-500/30 transition`}
                >
                  {t('order.next')}
                  <i className="fa-solid fa-arrow-right ml-2" />
                </button>
              )}
              {step === FORM_STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!form.disclaimer || isSubmitting}
                  className="w-2/3 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-500/30 transition text-lg flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isSubmitting && <i className="fa-solid fa-wand-magic-sparkles" />}
                  {submitLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-calm-50 rounded-2xl p-4 border border-calm-100">
      <h3 className="font-bold text-calm-900 text-sm mb-3 flex items-center gap-2">
        <i className={`fa-solid ${icon} text-calm-500`} />
        {label}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-calm-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}
