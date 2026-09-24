import { Fragment, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { BOOK_PRICE_PDF_PLN, BOOK_PRICE_PRINT_PLN, formatPricePLN } from '../../../lib/pricing';
import { usePartner } from '../../../hooks/usePartner';
import { clauseLinkHref, consentClauses, type ClausePart } from '../../../lib/consents';
import { FieldError } from './FieldError';
import { errorBorderClass } from './fieldStyles';
import type { CheckoutFormState, IntakeState, OrderFormat, ShippingAddress } from './types';

export interface CheckoutSubmitPayload {
  email: string;
  format: OrderFormat;
  shippingAddress?: ShippingAddress;
  /** GDPR consent flags — both required for submission to succeed. */
  consents: {
    termsAccepted: boolean;
    specialDataAccepted: boolean;
  };
}

interface Props {
  intake: IntakeState;
  /** Controlled by the parent flow — see `CheckoutFormState`. */
  value: CheckoutFormState;
  onChange: (next: CheckoutFormState) => void;
  onSubmit: (payload: CheckoutSubmitPayload) => Promise<void> | void;
  onBack: () => void;
  /** Order start in flight. */
  isSubmitting: boolean;
  /** Server error to show above the form. */
  externalError?: string | null;
  /**
   * Runs before this screen's own validation and blocks submit when it returns
   * false. The flow uses it to validate the child fields above.
   */
  beforeSubmit?: () => boolean;
}

/**
 * Last part of the order form, rendered under the appearance fields: e-mail,
 * shipping address (print orders), consents and the submit button. Nothing
 * is paid here — the book is generated first, payment comes on the preview.
 */
export function OrderCheckout({
  intake,
  value,
  onChange,
  onSubmit,
  onBack,
  isSubmitting,
  externalError,
  beforeSubmit,
}: Props) {
  const { t } = useTranslation('book');
  const partner = usePartner();
  const clauses = consentClauses(partner);
  const { email, termsAccepted, specialDataAccepted, address } = value;
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'email' | keyof ShippingAddress, string>>
  >({});
  const emailRef = useRef<HTMLInputElement>(null);
  const addressSectionRef = useRef<HTMLDivElement>(null);

  const isPrint = intake.format === 'pdf_print';

  const updateAddress = <K extends keyof ShippingAddress>(key: K, val: ShippingAddress[K]) => {
    onChange({ ...value, address: { ...address, [key]: val } });
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async () => {
    // Fields above this block (the child step) come first: their own
    // validator marks and scrolls to whatever is missing up there.
    if (beforeSubmit && !beforeSubmit()) return;
    // Validate inline, per field — a single banner at the top of the card
    // scrolled the user away from the field they had to fix.
    const errors: typeof fieldErrors = {};
    if (!email.trim() || !email.includes('@')) {
      errors.email = t('checkout.errorEmail');
    }
    if (isPrint) {
      for (const key of ['fullName', 'phone', 'street', 'zip', 'city'] as const) {
        if (!address[key].trim()) errors[key] = t('checkout.errorFieldRequired');
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.email) {
        emailRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
        emailRef.current?.focus({ preventScroll: true });
      } else {
        addressSectionRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
      return;
    }
    // Consents guard — normally unreachable, the submit button is disabled
    // until both are checked.
    if (!termsAccepted || !specialDataAccepted) return;
    await onSubmit({
      email: email.trim(),
      format: intake.format,
      shippingAddress: isPrint ? address : undefined,
      consents: { termsAccepted, specialDataAccepted },
    });
  };

  // Server errors (pipeline start) surface as a banner — scroll it into view
  // and announce via aria-live.
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!externalError) return;
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [externalError]);

  const renderClause = (parts: ClausePart[]) =>
    parts.map((part, i) => {
      const href = clauseLinkHref(partner, part.link);
      return href ? (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-ink font-semibold underline hover:opacity-80"
        >
          {part.text}
        </a>
      ) : (
        <Fragment key={i}>{part.text}</Fragment>
      );
    });

  return (
    <section className="pb-20 px-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 space-y-8">
          {externalError && (
            <div
              ref={errorRef}
              role="alert"
              aria-live="polite"
              className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium"
            >
              {externalError}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-primary-900 mb-2">
              {t('checkout.email')} <span className="text-red-500">*</span>
            </label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => {
                onChange({ ...value, email: e.target.value });
                setFieldErrors((prev) => (prev.email ? { ...prev, email: undefined } : prev));
              }}
              placeholder={t('checkout.emailPlaceholder')}
              aria-invalid={!!fieldErrors.email}
              className={`w-full p-4 bg-gray-50 border-2 rounded-2xl focus:border-accent-500 focus:bg-white outline-none transition font-semibold text-lg ${errorBorderClass(
                !!fieldErrors.email,
              )}`}
            />
            <FieldError message={fieldErrors.email} />
            <p className="text-xs text-gray-400 mt-1">{t('checkout.emailHint')}</p>
          </div>

          {/* Address fields (when PDF+Print) */}
          {isPrint && (
            <div ref={addressSectionRef} className="space-y-4 animate-fadeIn scroll-mt-24">
              <h4 className="font-bold text-primary-900">{t('checkout.addressHeading')}</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <AddressField
                  label={t('checkout.addressFullName')}
                  placeholder={t('checkout.addressFullNamePlaceholder')}
                  value={address.fullName}
                  onChange={(v) => updateAddress('fullName', v)}
                  error={fieldErrors.fullName}
                />
                <AddressField
                  label={t('checkout.addressPhone')}
                  placeholder={t('checkout.addressPhonePlaceholder')}
                  value={address.phone}
                  onChange={(v) => updateAddress('phone', v)}
                  type="tel"
                  error={fieldErrors.phone}
                />
              </div>
              <AddressField
                label={t('checkout.addressStreet')}
                placeholder={t('checkout.addressStreetPlaceholder')}
                value={address.street}
                onChange={(v) => updateAddress('street', v)}
                error={fieldErrors.street}
              />
              <div className="grid grid-cols-3 gap-4">
                <AddressField
                  label={t('checkout.addressZip')}
                  placeholder={t('checkout.addressZipPlaceholder')}
                  value={address.zip}
                  onChange={(v) => updateAddress('zip', v)}
                  error={fieldErrors.zip}
                />
                <div className="col-span-2">
                  <AddressField
                    label={t('checkout.addressCity')}
                    placeholder={t('checkout.addressCityPlaceholder')}
                    value={address.city}
                    onChange={(v) => updateAddress('city', v)}
                    error={fieldErrors.city}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Consents — both required to enable submit. Wording and the
              data controller come from the partner theme. */}
          <fieldset className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 space-y-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-widest text-primary-ink">
              {t('checkout.consentsHeading')}
            </legend>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => onChange({ ...value, termsAccepted: e.target.checked })}
                aria-required="true"
                className="w-5 h-5 mt-1 shrink-0 accent-accent-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                <span className="text-red-500 font-bold mr-1" aria-hidden>
                  *
                </span>
                {renderClause(clauses.terms)}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={specialDataAccepted}
                onChange={(e) => onChange({ ...value, specialDataAccepted: e.target.checked })}
                aria-required="true"
                className="w-5 h-5 mt-1 shrink-0 accent-accent-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                <span className="text-red-500 font-bold mr-1" aria-hidden>
                  *
                </span>
                {renderClause(clauses.specialData)}
              </span>
            </label>
          </fieldset>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition disabled:opacity-50"
            >
              <i className="fa-solid fa-arrow-left mr-2" /> {t('checkout.back')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !termsAccepted || !specialDataAccepted}
              aria-busy={isSubmitting}
              className="w-2/3 bg-accent-500 hover:bg-accent-600 text-on-accent font-extrabold py-4 rounded-2xl text-lg shadow-xl shadow-accent-500/30 transition transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
            >
              {isSubmitting ? (
                <i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />
              ) : (
                <i className="fa-solid fa-wand-magic-sparkles mr-2" aria-hidden="true" />
              )}
              {isSubmitting ? t('checkout.submitting') : t('checkout.submit')}
            </button>
          </div>

          <div className="flex gap-3 rounded-2xl bg-primary-50 border border-primary-100 p-4">
            <i className="fa-solid fa-circle-info text-primary-ink mt-0.5" aria-hidden="true" />
            <p className="text-sm text-primary-800 leading-relaxed">
              <span className="font-bold text-primary-900">{t('checkout.noPaymentNowTitle')}</span>
              <br />
              <Trans
                i18nKey="checkout.noPaymentNowBody"
                ns="book"
                values={{
                  pdfPrice: formatPricePLN(BOOK_PRICE_PDF_PLN),
                  printPrice: formatPricePLN(BOOK_PRICE_PRINT_PLN),
                }}
                components={{ strong: <strong className="font-bold text-primary-900" /> }}
              />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AddressField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-primary-900 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`w-full p-4 bg-gray-50 border-2 rounded-2xl focus:border-accent-500 focus:bg-white outline-none transition font-semibold ${errorBorderClass(
          !!error,
        )}`}
      />
      <FieldError message={error} />
    </div>
  );
}
