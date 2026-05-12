import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConsent } from '@lib/telemetry';

export function CookieBanner() {
  const { t } = useTranslation('cookies');
  const [showSettings, setShowSettings] = useState(false);
  const { consentStatus, acceptAll, rejectAll, setCustomConsent, dismiss, isAnalyticsEnabled } =
    useConsent();

  const handleAccept = () => acceptAll();
  const handleReject = () => rejectAll();
  const handleSaveSettings = (analytics: boolean) => {
    setCustomConsent(analytics);
    setShowSettings(false);
  };
  const handleDismiss = () => {
    dismiss();
    setShowSettings(false);
  };

  // Visibility is derived from consentStatus — no local mirror state that
  // could fall out of sync. `undefined` = pre-hydration (skip the banner to
  // avoid a flash before localStorage is read). Anything other than `null`
  // means the user already decided. Banner shows only when status === null.
  if (consentStatus !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-line shadow-lg">
      <div className="max-w-5xl mx-auto p-6 relative">
        <button
          onClick={handleDismiss}
          aria-label={t('buttons.close')}
          className="absolute top-3 right-3 text-muted hover:text-ink transition-colors p-1.5 rounded-full hover:bg-gray-100"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
        {!showSettings ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-ink mb-2">{t('title')}</h3>
              <p className="text-sm text-muted leading-relaxed">{t('description')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 text-muted hover:text-accent border border-line rounded-container transition-colors text-sm font-medium"
              >
                {t('buttons.settings')}
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-muted hover:text-ink border border-line rounded-container transition-colors text-sm font-medium"
              >
                {t('buttons.rejectAll')}
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-accent text-white rounded-container hover:bg-accent-hover transition-colors text-sm font-semibold"
              >
                {t('buttons.accept')}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h3 className="font-semibold text-ink mb-3">{t('settingsTitle')}</h3>
              <p className="text-sm text-muted mb-6">{t('settingsDescription')}</p>

              <div className="space-y-4">
                {/* Essential Cookies - Always On */}
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-container border border-line">
                  <div className="flex-1">
                    <h4 className="font-medium text-ink mb-1">{t('essential.title')}</h4>
                    <p className="text-sm text-muted">{t('essential.description')}</p>
                  </div>
                  <div className="ml-4">
                    <div className="px-3 py-1 bg-green-100 text-green-800 rounded-chip text-xs font-semibold">
                      {t('essential.badge')}
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies - Optional */}
                <div className="flex items-start justify-between p-4 bg-white rounded-container border border-line">
                  <div className="flex-1">
                    <h4 className="font-medium text-ink mb-1">{t('analytics.title')}</h4>
                    <p className="text-sm text-muted">{t('analytics.description')}</p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="analytics-toggle"
                        defaultChecked={isAnalyticsEnabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-muted hover:text-ink border border-line rounded-container transition-colors text-sm font-medium"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={() => {
                  const analyticsToggle = document.getElementById(
                    'analytics-toggle',
                  ) as HTMLInputElement;
                  handleSaveSettings(analyticsToggle?.checked || false);
                }}
                className="px-6 py-2 bg-accent text-white rounded-container hover:bg-accent-hover transition-colors text-sm font-semibold"
              >
                {t('buttons.savePreferences')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
