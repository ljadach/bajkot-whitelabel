import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConsent } from '@lib/telemetry';

export function CookieBanner() {
  const { t } = useTranslation('cookies');
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { consentStatus, acceptAll, rejectAll, setCustomConsent, isAnalyticsEnabled } =
    useConsent();

  useEffect(() => {
    // Show banner if no consent has been given
    if (!consentStatus) {
      setIsVisible(true);
    }
  }, [consentStatus]);

  const handleAccept = () => {
    acceptAll();
    setIsVisible(false);
  };

  const handleReject = () => {
    rejectAll();
    setIsVisible(false);
  };

  const handleSaveSettings = (analytics: boolean) => {
    setCustomConsent(analytics);
    setIsVisible(false);
    setShowSettings(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-line shadow-lg">
      <div className="max-w-5xl mx-auto p-6">
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
