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
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
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

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-ink text-center mb-1">{t('order.heading')}</h1>
      <p className="text-sm text-muted text-center mb-6">{t('subtitle')}</p>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {stepLabels.map((label, i) => (
          <div
            key={i}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-colors ${
              i === step
                ? 'bg-accent text-white'
                : i < step
                  ? 'bg-success text-white'
                  : 'bg-bg-muted text-muted'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Step 1: Child */}
      {step === 0 && (
        <div className="rounded-xl border border-line bg-bg p-6">
          <h2 className="text-base font-semibold text-accent mb-4">
            {t('order.sectionAboutChild')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">
                {t('order.childName')}
              </label>
              <input
                type="text"
                value={form.childName}
                onChange={(e) => update('childName', e.target.value)}
                placeholder={t('order.childNamePlaceholder')}
                maxLength={30}
                className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  {t('order.age')}
                </label>
                <select
                  value={form.ageBracket}
                  onChange={(e) => update('ageBracket', e.target.value as FormData['ageBracket'])}
                  className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
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
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  {t('order.gender')}
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => update('gender', e.target.value as FormData['gender'])}
                  className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
                >
                  <option value="boy">{t('order.genderBoy')}</option>
                  <option value="girl">{t('order.genderGirl')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Problem */}
      {step === 1 && (
        <div className="rounded-xl border border-line bg-bg p-6">
          <h2 className="text-base font-semibold text-accent mb-4">{t('order.sectionTopic')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">
                {t('order.problemCategory')}
              </label>
              <select
                value={form.problemCategory}
                onChange={(e) => {
                  update('problemCategory', e.target.value as ProblemCategory);
                  update('problemId', '');
                }}
                className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
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
              <label className="block text-sm font-semibold text-ink mb-1">
                {t('order.problem')}
              </label>
              <select
                value={form.problemId}
                onChange={(e) => update('problemId', e.target.value as ProblemId)}
                disabled={!form.problemCategory}
                className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none disabled:opacity-50"
              >
                <option value="">{t('order.problemPlaceholder')}</option>
                {filteredProblems.map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.title_pl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">
                {t('order.problemDetail')}
              </label>
              <textarea
                value={form.problemDetail}
                onChange={(e) => update('problemDetail', e.target.value)}
                placeholder={t('order.problemDetailPlaceholder')}
                maxLength={500}
                rows={3}
                className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none resize-y"
              />
              <p className="mt-1 text-xs text-muted">{t('order.problemDetailHint')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Appearance */}
      {step === 2 && (
        <div className="rounded-xl border border-line bg-bg p-6">
          <h2 className="text-base font-semibold text-accent mb-4">
            {t('order.sectionAppearance')}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  {t('order.hairColor')}
                </label>
                <select
                  value={form.hairColor}
                  onChange={(e) => update('hairColor', e.target.value)}
                  className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
                >
                  {Object.entries(HAIR_COLORS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  {t('order.hairStyle')}
                </label>
                <select
                  value={form.hairStyle}
                  onChange={(e) => update('hairStyle', e.target.value)}
                  className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
                >
                  {Object.entries(HAIR_STYLES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  {t('order.eyeColor')}
                </label>
                <select
                  value={form.eyeColor}
                  onChange={(e) => update('eyeColor', e.target.value)}
                  className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
                >
                  {Object.entries(EYE_COLORS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  {t('order.skinTone')}
                </label>
                <select
                  value={form.skinTone}
                  onChange={(e) => update('skinTone', e.target.value)}
                  className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
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
              <label className="block text-sm font-semibold text-ink mb-1">
                {t('order.outfit')}
              </label>
              <select
                value={form.outfit}
                onChange={(e) => update('outfit', e.target.value)}
                className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
              >
                {Object.entries(OUTFITS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-ink">{t('order.glasses')}</label>
              <button
                type="button"
                role="switch"
                aria-checked={form.glasses}
                onClick={() => update('glasses', !form.glasses)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  form.glasses ? 'bg-accent' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    form.glasses ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </button>
              <span className="text-sm text-muted">
                {form.glasses ? t('order.glassesYes') : t('order.glassesNo')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Guide */}
      {step === 3 && (
        <div className="rounded-xl border border-line bg-bg p-6">
          <h2 className="text-base font-semibold text-accent mb-4">{t('order.sectionGuide')}</h2>
          <p className="text-sm text-muted mb-4">{t('order.guideDescription')}</p>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              {t('order.favoriteToy')}
            </label>
            <input
              type="text"
              value={form.favoriteToy}
              onChange={(e) => update('favoriteToy', e.target.value)}
              placeholder={t('order.favoriteToyPlaceholder')}
              maxLength={100}
              className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">{t('order.favoriteToyHint')}</p>
          </div>
        </div>
      )}

      {/* Step 5: Summary */}
      {step === 4 && (
        <div className="rounded-xl border border-line bg-bg p-6">
          <h2 className="text-base font-semibold text-accent mb-4">{t('order.sectionSummary')}</h2>
          <div className="space-y-2">
            <SummaryRow label={t('order.childName')} value={form.childName} />
            <SummaryRow label={t('order.age')} value={form.ageBracket} />
            <SummaryRow
              label={t('order.gender')}
              value={form.gender === 'boy' ? t('order.genderBoy') : t('order.genderGirl')}
            />
            <SummaryRow
              label={t('order.problem')}
              value={form.problemId ? PROBLEMS[form.problemId]?.title_pl : '—'}
            />
            {form.problemDetail && (
              <SummaryRow label={t('order.problemDetail')} value={form.problemDetail} />
            )}
            <SummaryRow
              label={t('order.hairColor')}
              value={HAIR_COLORS[form.hairColor as keyof typeof HAIR_COLORS] ?? form.hairColor}
            />
            <SummaryRow
              label={t('order.hairStyle')}
              value={HAIR_STYLES[form.hairStyle as keyof typeof HAIR_STYLES] ?? form.hairStyle}
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
            {form.favoriteToy && (
              <SummaryRow label={t('order.favoriteToy')} value={form.favoriteToy} />
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-ink mb-1">{t('order.email')}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder={t('order.emailPlaceholder')}
              className="w-full rounded-lg border-2 border-line bg-bg px-3 py-2.5 text-base focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">{t('order.emailHint')}</p>
          </div>

          {/* Dev tools: fast mode + batch export (only visible in dev) */}
          {import.meta.env.DEV && (
            <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Dev tools</p>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.skipQaReviews}
                  onChange={(e) => update('skipQaReviews', e.target.checked)}
                  className="shrink-0"
                />
                <span className="text-xs text-neutral-600">
                  FAST mode — pomija QA reviews (A4, A8, A10)
                </span>
              </label>
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

          <label className="flex items-start gap-3 mt-4 rounded-lg bg-amber-50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.disclaimer}
              onChange={(e) => update('disclaimer', e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-neutral-600">{t('order.disclaimer')}</span>
          </label>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="flex-1 rounded-lg bg-bg-muted px-4 py-3.5 text-base font-semibold text-ink-secondary hover:bg-neutral-200 transition-colors"
          >
            {t('order.back')}
          </button>
        )}
        {step < FORM_STEPS.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="flex-1 rounded-lg bg-accent px-4 py-3.5 text-base font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            {t('order.next')}
          </button>
        )}
        {step === FORM_STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!form.disclaimer || isSubmitting}
            className="flex-1 rounded-lg bg-success px-4 py-3.5 text-base font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('order.submitting') : t('order.submit')}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start rounded-lg bg-bg-subtle px-3 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink text-right max-w-[60%]">{value}</span>
    </div>
  );
}
