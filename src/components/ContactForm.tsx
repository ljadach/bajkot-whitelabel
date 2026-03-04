import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

type InquiryType =
  | 'enterprise_sales'
  | 'technical_support'
  | 'partnerships'
  | 'press_media'
  | 'general';

const INQUIRY_TYPES: InquiryType[] = [
  'enterprise_sales',
  'technical_support',
  'partnerships',
  'press_media',
  'general',
];

export function ContactForm() {
  const { t, i18n } = useTranslation('contact');
  const submitContactForm = useAction(api.contact.submitContactForm);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiryType: 'general' as InquiryType,
    question: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitContactForm({
        name: formData.name,
        email: formData.email,
        inquiryType: formData.inquiryType,
        question: formData.question,
        language: i18n.language,
      });

      if (result.success) {
        setShowSuccess(true);
      } else {
        setError(result.error || t('form.error'));
      }
    } catch (err) {
      console.error('[ContactForm] Submit error:', err);
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
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">{t('success.title')}</h3>
        <p className="text-neutral-500 leading-relaxed">{t('success.body')}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-white rounded-xl border border-neutral-200 p-6 sm:p-8 space-y-5"
    >
      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-neutral-700 mb-1.5">
          {t('form.name')}
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          className="input"
          placeholder={t('form.namePlaceholder')}
          value={formData.name}
          onChange={handleChange}
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {t('form.email')}
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          className="input"
          placeholder={t('form.emailPlaceholder')}
          value={formData.email}
          onChange={handleChange}
        />
      </div>

      {/* Inquiry type */}
      <div>
        <label
          htmlFor="contact-inquiry"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {t('form.inquiryType')}
        </label>
        <div className="relative">
          <select
            id="contact-inquiry"
            name="inquiryType"
            required
            className="input appearance-none pr-10"
            value={formData.inquiryType}
            onChange={handleChange}
          >
            {INQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`form.inquiryOptions.${type}`)}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Question */}
      <div>
        <label
          htmlFor="contact-question"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          {t('form.question')}
        </label>
        <textarea
          id="contact-question"
          name="question"
          required
          rows={5}
          className="textarea"
          placeholder={t('form.questionPlaceholder')}
          value={formData.question}
          onChange={handleChange}
        />
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
        style={{ backgroundColor: 'var(--accent)' }}
        onMouseEnter={(e) => {
          if (!isSubmitting)
            (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent)';
        }}
      >
        {isSubmitting ? t('form.submitting') : t('form.submit')}
      </button>
    </form>
  );
}
