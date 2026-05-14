import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../../lib/telemetry';
import { genitiveOrSelf } from '../../../lib/childNameInflect';
import type { IntakeState, OrderFormat } from './types';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
}

const INITIAL_ADDRESS: ShippingAddress = {
  fullName: '',
  phone: '',
  street: '',
  zip: '',
  city: '',
};

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
  onChangeFormat: (fmt: OrderFormat) => void;
  onSubmit: (payload: CheckoutSubmitPayload) => Promise<void> | void;
  onBack: () => void;
  /** External submitting flag (Stripe redirect / pipeline start in flight). */
  isSubmitting: boolean;
  /** External error string. */
  externalError?: string | null;
}

/**
 * "Ostatni krok!" checkout screen — mirrors `#screen-checkout` from
 * docs/protos_v2/Bajkoterapia-Nowy-Flow.html.
 */
export function OrderCheckout({
  intake,
  onChangeFormat,
  onSubmit,
  onBack,
  isSubmitting,
  externalError,
}: Props) {
  const { t } = useTranslation('book');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [specialDataAccepted, setSpecialDataAccepted] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>(INITIAL_ADDRESS);
  const [error, setError] = useState('');

  useEffect(() => {
    trackEvent('checkout_viewed', { format: intake.format });
    // mount-only — format change is captured separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeFormat = (fmt: OrderFormat) => {
    trackEvent('checkout_format_changed', { format: fmt });
    onChangeFormat(fmt);
  };

  const trimmedName = intake.name.trim();
  const productName = trimmedName
    ? t('checkout.summaryProductFor', { nameGen: genitiveOrSelf(trimmedName) })
    : t('checkout.summaryProduct');
  const topicLine = intake.topic ? intake.topic.catalog.shortTitle : '';
  const isPrint = intake.format === 'pdf_print';
  const price = isPrint ? t('previewScreen.formatPrintPrice') : t('previewScreen.formatPdfPrice');

  const updateAddress = <K extends keyof ShippingAddress>(key: K, val: ShippingAddress[K]) => {
    setAddress((prev) => ({ ...prev, [key]: val }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError(t('checkout.errorEmail'));
      return;
    }
    if (!termsAccepted) {
      setError(t('checkout.errorConsentTerms'));
      return;
    }
    if (!specialDataAccepted) {
      setError(t('checkout.errorConsentSpecial'));
      return;
    }
    if (isPrint) {
      const a = address;
      if (
        !a.fullName.trim() ||
        !a.phone.trim() ||
        !a.street.trim() ||
        !a.zip.trim() ||
        !a.city.trim()
      ) {
        setError(t('checkout.errorAddress'));
        return;
      }
    }
    setError('');
    trackEvent('checkout_submit_clicked', { format: intake.format });
    await onSubmit({
      email: email.trim(),
      format: intake.format,
      shippingAddress: isPrint ? address : undefined,
      consents: { termsAccepted, specialDataAccepted },
    });
  };

  const displayError = externalError || error;

  // Submit lives below the fold, so a validation error at the top of the form
  // would otherwise stay invisible. Scroll the message into view (and announce
  // it to screen readers via aria-live below) whenever it changes.
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!displayError) return;
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [displayError]);

  return (
    <section className="pt-28 pb-20 px-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-magic-500 font-bold uppercase tracking-widest text-sm mb-2 block">
            {t('checkout.kicker')}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-calm-900 mb-4">
            {t('checkout.heading')}
          </h1>
          <p className="text-gray-600 text-lg">{t('checkout.subheading')}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 space-y-8">
          {displayError && (
            <div
              ref={errorRef}
              role="alert"
              aria-live="polite"
              className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium"
            >
              {displayError}
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-calm-50 rounded-2xl p-6 border border-calm-100">
            <h3 className="font-bold text-calm-900 mb-3">{t('checkout.summaryHeading')}</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-calm-900">{productName}</p>
                {topicLine && <p className="text-sm text-gray-500">{topicLine}</p>}
              </div>
              <p className="text-2xl font-black text-calm-900">{price}</p>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-calm-900 mb-2">
              {t('checkout.email')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('checkout.emailPlaceholder')}
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold text-lg"
            />
            <p className="text-xs text-gray-400 mt-1">{t('checkout.emailHint')}</p>
          </div>

          {/* Delivery option */}
          <div>
            <label className="block text-sm font-bold text-calm-900 mb-3">
              {t('checkout.deliveryHeading')}
            </label>
            <div className="space-y-3">
              <DeliveryRadio
                value="pdf"
                selected={intake.format}
                onSelect={handleChangeFormat}
                emoji="📱"
                label={t('checkout.deliveryPdf')}
                price={t('previewScreen.formatPdfPrice')}
              />
              <DeliveryRadio
                value="pdf_print"
                selected={intake.format}
                onSelect={handleChangeFormat}
                emoji="📚"
                label={t('checkout.deliveryPrint')}
                price={t('previewScreen.formatPrintPrice')}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
              <i className="fa-solid fa-circle-info text-calm-500 mr-1" />
              {t('checkout.printDispatchNote')}
            </p>
          </div>

          {/* Address fields (when PDF+Print) */}
          {isPrint && (
            <div className="space-y-4 animate-fadeIn">
              <h4 className="font-bold text-calm-900">{t('checkout.addressHeading')}</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <AddressField
                  label={t('checkout.addressFullName')}
                  placeholder={t('checkout.addressFullNamePlaceholder')}
                  value={address.fullName}
                  onChange={(v) => updateAddress('fullName', v)}
                />
                <AddressField
                  label={t('checkout.addressPhone')}
                  placeholder={t('checkout.addressPhonePlaceholder')}
                  value={address.phone}
                  onChange={(v) => updateAddress('phone', v)}
                  type="tel"
                />
              </div>
              <AddressField
                label={t('checkout.addressStreet')}
                placeholder={t('checkout.addressStreetPlaceholder')}
                value={address.street}
                onChange={(v) => updateAddress('street', v)}
              />
              <div className="grid grid-cols-3 gap-4">
                <AddressField
                  label={t('checkout.addressZip')}
                  placeholder={t('checkout.addressZipPlaceholder')}
                  value={address.zip}
                  onChange={(v) => updateAddress('zip', v)}
                />
                <div className="col-span-2">
                  <AddressField
                    label={t('checkout.addressCity')}
                    placeholder={t('checkout.addressCityPlaceholder')}
                    value={address.city}
                    onChange={(v) => updateAddress('city', v)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Consents — RODO-compliant. Both required to enable submit. */}
          <fieldset className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 space-y-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-widest text-calm-500">
              {t('checkout.consentsHeading')}
            </legend>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                aria-required="true"
                className="w-5 h-5 mt-1 shrink-0 text-magic-500 border-gray-300 rounded focus:ring-magic-500"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                <span className="text-red-500 font-bold mr-1" aria-hidden>
                  *
                </span>
                {t('checkout.consentTermsPrefix')}{' '}
                <a
                  href="/regulamin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-magic-600 font-semibold underline hover:text-magic-700"
                >
                  {t('checkout.consentTermsLink')}
                </a>{' '}
                {t('checkout.consentTermsMiddle')}{' '}
                <a
                  href="/polityka-prywatnosci"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-magic-600 font-semibold underline hover:text-magic-700"
                >
                  {t('checkout.consentPrivacyLink')}
                </a>
                {t('checkout.consentTermsSuffix')}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={specialDataAccepted}
                onChange={(e) => setSpecialDataAccepted(e.target.checked)}
                aria-required="true"
                className="w-5 h-5 mt-1 shrink-0 text-magic-500 border-gray-300 rounded focus:ring-magic-500"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                <span className="text-red-500 font-bold mr-1" aria-hidden>
                  *
                </span>
                {t('checkout.consentSpecialData')}
              </span>
            </label>
          </fieldset>

          {/* Pay button */}
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
              className="w-2/3 bg-magic-500 hover:bg-magic-600 text-white font-extrabold py-4 rounded-2xl text-lg shadow-xl shadow-magic-500/30 transition transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
            >
              {isSubmitting ? (
                <i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true" />
              ) : (
                <i className="fa-solid fa-lock mr-2" aria-hidden="true" />
              )}
              {isSubmitting ? t('checkout.submitting') : t('checkout.submit')}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            <i className="fa-solid fa-shield-halved mr-1" /> {t('checkout.secureNote')}
          </p>
        </div>
      </div>
    </section>
  );
}

function DeliveryRadio({
  value,
  selected,
  onSelect,
  emoji,
  label,
  price,
}: {
  value: OrderFormat;
  selected: OrderFormat;
  onSelect: (v: OrderFormat) => void;
  emoji: string;
  label: string;
  price: string;
}) {
  const checked = selected === value;
  return (
    <label className="cursor-pointer relative block">
      <input
        type="radio"
        name="checkout-delivery"
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
          <div className="text-xl">{emoji}</div>
          <span className="font-bold text-calm-900">{label}</span>
        </div>
        <span className="font-black text-calm-900">{price}</span>
        {checked && (
          <i className="fa-solid fa-circle-check text-magic-500 absolute top-4 right-4" />
        )}
      </div>
    </label>
  );
}

function AddressField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-calm-900 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-magic-500 focus:bg-white outline-none transition font-semibold"
      />
    </div>
  );
}
