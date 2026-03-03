import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Segment } from './landing/SegmentContext';
import { toast } from 'sonner';

interface LeadCaptureModalProps {
  segment: Segment;
  onClose: () => void;
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove?: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }

  const waitForTurnstile = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const maxWaitMs = 5000;

      const check = () => {
        if (window.turnstile) {
          resolve();
          return;
        }
        if (Date.now() - start > maxWaitMs) {
          reject(new Error('Turnstile API did not initialize in time'));
          return;
        }
        window.setTimeout(check, 50);
      };

      check();
    });

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => void waitForTurnstile().then(resolve).catch(reject), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')), { once: true });
      void waitForTurnstile()
        .then(resolve)
        .catch(() => {
          /* no-op: we'll still wait for load/error listeners above */
        });
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => void waitForTurnstile().then(resolve).catch(reject);
    script.onerror = () => reject(new Error('Failed to load Turnstile script'));
    document.head.appendChild(script);
  });
}

export function LeadCaptureModal({ segment, onClose }: LeadCaptureModalProps) {
  const { t, i18n } = useTranslation('segment-common');
  const submitLead = useAction(api.leads.submitLead);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const captchaEnabled = Boolean(turnstileSiteKey);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    role: '',
    message: '',
    website: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isCaptchaReady, setIsCaptchaReady] = useState(!captchaEnabled);
  const formStartedAtRef = useRef<number>(Date.now());
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Auto-close after success
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, onClose]);

  useEffect(() => {
    if (!captchaEnabled || !turnstileSiteKey || !captchaContainerRef.current) {
      return;
    }

    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !captchaContainerRef.current) {
          return;
        }

        if (turnstileWidgetIdRef.current && window.turnstile.remove) {
          window.turnstile.remove(turnstileWidgetIdRef.current);
          turnstileWidgetIdRef.current = null;
        }

        turnstileWidgetIdRef.current = window.turnstile.render(captchaContainerRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            if (cancelled) return;
            setCaptchaToken(token);
            setError(null);
          },
          'expired-callback': () => {
            if (cancelled) return;
            setCaptchaToken(null);
          },
          'error-callback': () => {
            if (cancelled) return;
            setCaptchaToken(null);
          },
        });

        setIsCaptchaReady(true);
      })
      .catch((scriptError) => {
        console.error('[LeadCaptureModal] Failed to initialize Turnstile:', scriptError);
        if (!cancelled) {
          setIsCaptchaReady(false);
        }
      });

    return () => {
      cancelled = true;
      if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [captchaEnabled, turnstileSiteKey]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    if (turnstileWidgetIdRef.current && window.turnstile?.reset) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (captchaEnabled && !captchaToken) {
      setError('Please complete the security verification.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        organization: formData.organization,
        role: formData.role,
        message: formData.message || undefined,
        segment,
        language: i18n.language,
        honeypot: formData.website || undefined,
        formStartedAt: formStartedAtRef.current,
        captchaToken: captchaToken || undefined,
      });

      if (result.success) {
        setShowSuccess(true);
        toast.success(t('leadForm.success'));
      } else {
        setError(result.error || t('leadForm.error'));
        if (captchaEnabled) {
          resetCaptcha();
        }
      }
    } catch (err) {
      console.error('[LeadCaptureModal] Submit error:', err);
      setError(t('leadForm.error'));
      if (captchaEnabled) {
        resetCaptcha();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slideUp" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <div>
            <h2 id="lead-modal-title" className="text-lg font-semibold text-neutral-900">
              {t('leadForm.title')}
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">{t('leadForm.subtitle')}</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {showSuccess ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{t('leadForm.successTitle', 'Thank you!')}</h3>
              <p className="text-neutral-500">{t('leadForm.success')}</p>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

              {/* Honeypot field (should stay empty) */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input type="text" id="website" name="website" autoComplete="off" tabIndex={-1} value={formData.website} onChange={handleChange} />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('leadForm.name')} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('leadForm.namePlaceholder')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('leadForm.email')} *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('leadForm.emailPlaceholder')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('leadForm.phone')}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('leadForm.phonePlaceholder')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('leadForm.organization')} *
                </label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  required
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder={t('leadForm.organizationPlaceholder')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('leadForm.role')} *
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  placeholder={t('leadForm.rolePlaceholder')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-1">
                  {t('leadForm.message')}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('leadForm.messagePlaceholder')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:opacity-50"
                />
              </div>

              {captchaEnabled && (
                <div className="space-y-2">
                  <div ref={captchaContainerRef} />
                  {!isCaptchaReady && <p className="text-xs text-neutral-500">Loading security verification...</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (captchaEnabled && (!isCaptchaReady || !captchaToken))}
                className="w-full px-4 py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 spinner border-white/30 border-t-white" />
                    {t('leadForm.submitting')}
                  </>
                ) : (
                  t('leadForm.submit')
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer - only show if not in success state */}
        {!showSuccess && (
          <div className="px-4 pb-4">
            <p className="text-xs text-neutral-400 text-center">{t('leadForm.privacy', 'Your data is encrypted and never shared with third parties.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
