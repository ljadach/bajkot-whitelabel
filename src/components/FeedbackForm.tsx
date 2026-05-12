import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function FeedbackForm() {
  const { t, i18n } = useTranslation('feedback');
  const submitFeedback = useAction(api.feedback.submitFeedback);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitFeedback({
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim(),
        language: i18n.language,
      });
      if (result.success) {
        setShowSuccess(true);
      } else {
        setError(result.error || t('form.error'));
      }
    } catch (err) {
      console.error('[FeedbackForm] submit error', err);
      setError(t('form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">{t('success.heading')}</h3>
        <p className="text-neutral-500 leading-relaxed">{t('success.body')}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 space-y-5"
    >
      <div>
        <label
          htmlFor="feedback-email"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {t('form.email')}
        </label>
        <input
          id="feedback-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('form.emailPlaceholder')}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div>
        <label
          htmlFor="feedback-phone"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {t('form.phone')}
        </label>
        <input
          id="feedback-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('form.phonePlaceholder')}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div>
        <label
          htmlFor="feedback-message"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {t('form.message')}
        </label>
        <textarea
          id="feedback-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('form.messagePlaceholder')}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-magic-500 hover:bg-magic-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? t('form.submitting') : t('form.submit')}
      </button>
    </form>
  );
}
