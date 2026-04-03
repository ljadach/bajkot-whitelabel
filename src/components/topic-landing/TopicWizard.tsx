import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { captureTokenFromUrl, getAccessToken, hasAccessToken } from '../../hooks/useAccessToken';
import { HAIR_COLORS, HAIR_STYLES, EYE_COLORS, SKIN_TONES, OUTFITS } from '../../lib/bookData';
import type { Topic } from '../../data/topics';

// ── Wizard config (derived from canonical bookData) ──

const toOptions = (record: Record<string, string>) =>
  Object.entries(record).map(([value, label]) => ({ value, label }));

const AGE_OPTIONS = [
  { value: '3-5', label: '3 - 5 lat (Prostszy język)' },
  { value: '6-8', label: '6 - 8 lat (Bardziej rozbudowana treść)' },
] as const;

const GENDER_OPTIONS = [
  { value: 'boy', label: 'Chłopiec', emoji: '👦' },
  { value: 'girl', label: 'Dziewczynka', emoji: '👧' },
] as const;

const HAIR_COLOR_OPTIONS = toOptions(HAIR_COLORS);
const HAIR_STYLE_OPTIONS = toOptions(HAIR_STYLES);
const EYE_COLOR_OPTIONS = toOptions(EYE_COLORS);
const SKIN_TONE_OPTIONS = toOptions(SKIN_TONES);
const OUTFIT_OPTIONS = toOptions(OUTFITS);

// ── Form state ──────────────────────────────────────

interface WizardForm {
  childName: string;
  age: '3-5' | '6-8' | '';
  gender: 'boy' | 'girl' | '';
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  glasses: boolean;
  outfit: string;
  problemDetail: string;
  favoriteToy: string;
  email: string;
  consent: boolean;
}

const INITIAL_FORM: WizardForm = {
  childName: '',
  age: '',
  gender: '',
  hairColor: 'blond',
  hairStyle: 'krotkie_proste',
  eyeColor: 'niebieskie',
  skinTone: 'jasna',
  glasses: false,
  outfit: 'bluza_dinozaur',
  problemDetail: '',
  favoriteToy: '',
  email: '',
  consent: false,
};

const STEP_LABELS = ['1. Bohater', '2. Wygląd', '3. Misja', '4. Finalizacja'];

// ── Component ───────────────────────────────────────

export function TopicWizard({ topic }: { topic: Topic }) {
  const navigate = useNavigate();
  const startLandingOrder = useAction(api.bookPipeline.startLandingOrder);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => captureTokenFromUrl(), []);

  const update = useCallback(<K extends keyof WizardForm>(key: K, val: WizardForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setError('');
  }, []);

  const goToStep = useCallback(
    (target: number) => {
      if (target > step) {
        if (step === 0) {
          if (!form.childName.trim() || !form.age || !form.gender) {
            setError('Uzupełnij imię, wiek i płeć dziecka.');
            return;
          }
        }
      }
      setError('');
      setStep(target);
      document.getElementById('kreator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [step, form.childName, form.age, form.gender],
  );

  const handleSubmit = useCallback(async () => {
    if (!hasAccessToken()) {
      setError('Brak tokenu dostępu. Wejdź na stronę z poprawnym linkiem.');
      return;
    }
    if (!form.email || !form.email.includes('@')) {
      setError('Podaj poprawny adres e-mail.');
      return;
    }
    if (!form.consent) {
      setError('Musisz zaakceptować warunki edukacyjne.');
      return;
    }
    if (!topic.problemId) {
      setError('Ten temat nie ma przypisanego problemu.');
      return;
    }

    setShowLoading(true);
    setError('');

    try {
      const { orderId } = await startLandingOrder({
        accessToken: getAccessToken()!,
        childName: form.childName.trim(),
        ageBracket: form.age as '3-5' | '6-8',
        gender: form.gender as 'boy' | 'girl',
        problemId: topic.problemId,
        problemDetail: form.problemDetail || undefined,
        favoriteToy: form.favoriteToy || undefined,
        glasses: form.glasses,
        hairColor: form.hairColor,
        hairStyle: form.hairStyle,
        eyeColor: form.eyeColor,
        skinTone: form.skinTone,
        outfit: form.outfit,
        email: form.email,
      });

      void navigate(`/landing/book/${orderId}/progress`);
    } catch (err) {
      setShowLoading(false);
      setError(err instanceof Error ? err.message : 'Wystąpił błąd. Spróbuj ponownie.');
    }
  }, [form, topic, startLandingOrder, navigate]);

  return (
    <section id="kreator" className="py-24 px-6 bg-gray-50 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            Kreator Magii
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
            Stwórz Bajkę dla swojego dziecka
          </h2>
          <p className="text-gray-600 text-lg">
            Wypełnij ten prosty formularz w 2 minuty. Twoja bajka zostanie przez nas przygotowana.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Progress */}
          <div className="bg-calm-50 px-6 py-4 border-b border-calm-100 flex justify-between items-center text-xs md:text-sm font-bold text-gray-400">
            {STEP_LABELS.map((label, i) => (
              <span
                key={i}
                className={
                  i === step ? 'text-magic-600' : i < step ? 'text-calm-900' : 'text-gray-400'
                }
              >
                {label}
              </span>
            ))}
          </div>

          <div className="p-6 md:p-10">
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Step 1: Bohater */}
            {step === 0 && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h3 className="text-2xl font-bold text-calm-900 mb-2">
                    Kim jest główny bohater?
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Te dane pozwolą AI dopasować język opowieści do poziomu Twojego dziecka.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      Imię dziecka <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.childName}
                      onChange={(e) => update('childName', e.target.value)}
                      placeholder="np. Jaś, Zosia"
                      maxLength={30}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-2">
                      Wiek <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.age}
                      onChange={(e) => update('age', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none transition font-semibold text-lg cursor-pointer"
                    >
                      <option value="" disabled>
                        Wybierz wiek...
                      </option>
                      {AGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-3">
                    Płeć dziecka <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {GENDER_OPTIONS.map((g) => (
                      <label key={g.value} className="cursor-pointer relative">
                        <input
                          type="radio"
                          name="gender"
                          value={g.value}
                          checked={form.gender === g.value}
                          onChange={() => update('gender', g.value)}
                          className="peer sr-only"
                        />
                        <div className="p-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition text-center peer-checked:border-magic-500 peer-checked:bg-amber-50">
                          <div className="text-4xl mb-2">{g.emoji}</div>
                          <div className="font-bold text-calm-900">{g.label}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="w-full bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-magic-500/30 transition"
                  >
                    Dalej: Wygląd <i className="fa-solid fa-arrow-right ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Wygląd */}
            {step === 1 && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h3 className="text-2xl font-bold text-calm-900 mb-2">Stwórzmy awatara</h3>
                  <p className="text-gray-500 text-sm">
                    Ograniczamy opcje ubioru do konkretnych &quot;Kotwic Wizualnych&quot;, aby
                    ilustracje w książce były idealnie spójne na każdej stronie!
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-3">
                      Kolor włosów <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.hairColor}
                      onChange={(e) => update('hairColor', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold"
                    >
                      {HAIR_COLOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-3">
                      Rodzaj włosów <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.hairStyle}
                      onChange={(e) => update('hairStyle', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold"
                    >
                      {HAIR_STYLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-3">
                      Kolor oczu <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.eyeColor}
                      onChange={(e) => update('eyeColor', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold"
                    >
                      {EYE_COLOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-calm-900 mb-3">Karnacja</label>
                    <select
                      value={form.skinTone}
                      onChange={(e) => update('skinTone', e.target.value)}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold"
                    >
                      {SKIN_TONE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.glasses}
                      onChange={(e) => update('glasses', e.target.checked)}
                      className="w-6 h-6 text-magic-500 border-gray-300 rounded focus:ring-magic-500"
                    />
                    <span className="font-bold text-calm-900">Dziecko nosi okulary</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-3">
                    Ulubiony strój <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.outfit}
                    onChange={(e) => update('outfit', e.target.value)}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold"
                  >
                    {OUTFIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => goToStep(0)}
                    className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition"
                  >
                    Wróć
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="w-2/3 bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl shadow-lg transition"
                  >
                    Dalej: Misja <i className="fa-solid fa-arrow-right ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Misja — problem pre-selected, only detail & toy */}
            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <h3 className="text-2xl font-bold text-calm-900 mb-2">
                    Z jakim wyzwaniem się mierzycie?
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Temat bajki został dobrany na podstawie tej strony. Możesz doprecyzować
                    szczegóły poniżej.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-2">
                    Doprecyzowanie problemu (Opcjonalnie)
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Np. &quot;Budzi się 3 razy w nocy i przychodzi do naszego łóżka&quot;
                  </p>
                  <textarea
                    value={form.problemDetail}
                    onChange={(e) => update('problemDetail', e.target.value)}
                    rows={2}
                    maxLength={150}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-2">
                    Ulubiona zabawka lub zwierzątko (Opcjonalnie)
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    AI &quot;ożywi&quot; ten przedmiot, czyniąc go mądrym Przewodnikiem.
                  </p>
                  <input
                    type="text"
                    value={form.favoriteToy}
                    onChange={(e) => update('favoriteToy', e.target.value)}
                    placeholder="np. Pluszowy Piesek, Świecący Robot"
                    maxLength={100}
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition"
                  >
                    Wróć
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="w-2/3 bg-magic-500 hover:bg-magic-600 text-white font-bold py-4 rounded-2xl shadow-lg transition"
                  >
                    Dalej: Zakończ <i className="fa-solid fa-arrow-right ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Finalizacja */}
            {step === 3 && (
              <div className="space-y-8 animate-fadeIn">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
                    <i className="fa-solid fa-wand-sparkles" />
                  </div>
                  <h3 className="text-2xl font-bold text-calm-900 mb-2">Mamy wszystko!</h3>
                  <p className="text-gray-500 text-sm">
                    Podaj e-mail, na który wyślemy gotową książeczkę w formacie PDF.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-calm-900 mb-2">
                    Adres E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="twoj.email@domena.pl"
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 outline-none font-semibold text-lg text-center"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => update('consent', e.target.checked)}
                      className="mt-1 w-5 h-5 text-magic-500 border-gray-300 rounded focus:ring-magic-500"
                    />
                    <span className="text-sm text-calm-900 leading-relaxed">
                      Rozumiem, że bajka jest wsparciem edukacyjnym generowanym przez AI, a nie
                      kliniczną poradą medyczną. Zobowiązuję się do przeczytania bajki przed
                      pokazaniem jej dziecku. <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition"
                  >
                    Wróć
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={showLoading}
                    className="w-2/3 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-500/30 transition text-lg flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {showLoading ? 'Generuję...' : 'PŁACĘ I GENERUJĘ (39 zł)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {showLoading && (
        <div className="fixed inset-0 bg-calm-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-magic-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <i className="fa-solid fa-wand-magic-sparkles text-magic-600 text-3xl animate-pulse" />
              <div className="absolute inset-0 border-4 border-magic-400/30 border-t-magic-600 rounded-full animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-calm-900 mb-2">Trwa magia...</h3>
            <p className="text-sm text-gray-500 mb-6">{topic.loadingMessage}</p>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-magic-500 h-2 rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
