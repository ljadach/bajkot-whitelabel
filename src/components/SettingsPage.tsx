import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { useClerk } from '@clerk/clerk-react';
import { useTranslation, Trans } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { useToolPreferences } from '../hooks/useToolPreferences';
import { useAsyncAction } from '../hooks/useAsyncAction';

const SNOW_STORAGE_KEY = 'aitutoro-snow-enabled';

export function SettingsPage() {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [snowEnabled, setSnowEnabled] = useState(false);

  // Get the localized confirmation word
  const confirmWord = t('account.delete.confirmation.placeholder');

  useEffect(() => {
    setSnowEnabled(localStorage.getItem(SNOW_STORAGE_KEY) === 'true');
  }, []);

  const handleSnowToggle = () => {
    const newValue = !snowEnabled;
    setSnowEnabled(newValue);
    localStorage.setItem(SNOW_STORAGE_KEY, String(newValue));
    window.dispatchEvent(new Event('snow-toggle'));
  };

  const profile = useQuery(api.profiles.getCurrentProfile);
  const { preferences, toggleTool } = useToolPreferences(profile);

  const resetProfile = useMutation(api.profiles.resetProfile);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const { execute: handleReset, isLoading: isResetting } = useAsyncAction(async () => {
    await resetProfile();
    void navigate('/chat');
  });

  const deleteAccount = useMutation(api.profiles.deleteAccount);
  const { signOut } = useClerk();

  const handleDeleteAccount = async () => {
    if (confirmText !== confirmWord) return;

    setIsDeleting(true);
    try {
      await deleteAccount({});
      // Sign out after successful deletion
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <button onClick={() => void navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {tCommon('buttons.back')}
        </button>
        <h1 className="text-2xl font-semibold text-neutral-900 mb-8">{t('title')}</h1>

        {/* Appearance Section */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-neutral-100">
            <h2 className="text-lg font-medium text-neutral-900">{t('appearance.title')}</h2>
            <p className="text-sm text-neutral-500 mt-1">{t('appearance.description')}</p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-medium text-neutral-900">{t('appearance.snowEffect.title')}</h3>
                  <p className="text-sm text-neutral-500">{t('appearance.snowEffect.description')}</p>
                </div>
              </div>
              <button onClick={handleSnowToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${snowEnabled ? 'bg-orange-500' : 'bg-neutral-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${snowEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Learning Tools Section */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-neutral-100">
            <h2 className="text-lg font-medium text-neutral-900">{t('learningTools.title')}</h2>
            <p className="text-sm text-neutral-500 mt-1">{t('learningTools.description')}</p>
          </div>

          <div className="p-6 space-y-5">
            {[
              {
                key: 'glossatorMargin' as const,
                icon: (
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                ),
                bgClass: 'bg-amber-50',
              },
              {
                key: 'workbenchTabs' as const,
                icon: (
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58 3.11 1.06-6.22L2.34 7.7l6.24-.91L11.42 1.5l2.84 5.29 6.24.91-4.56 4.36 1.06 6.22z" />
                  </svg>
                ),
                bgClass: 'bg-indigo-50',
              },
              {
                key: 'feynmanOracle' as const,
                icon: (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                    />
                  </svg>
                ),
                bgClass: 'bg-emerald-50',
              },
              {
                key: 'chapterProbes' as const,
                icon: (
                  <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                ),
                bgClass: 'bg-violet-50',
              },
            ].map(({ key, icon, bgClass }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${bgClass} flex items-center justify-center`}>{icon}</div>
                  <div>
                    <h3 className="text-base font-medium text-neutral-900">{t(`learningTools.${key}.title`)}</h3>
                    <p className="text-sm text-neutral-500">{t(`learningTools.${key}.description`)}</p>
                  </div>
                </div>
                <button onClick={() => toggleTool(key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences[key] ? 'bg-orange-500' : 'bg-neutral-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <h2 className="text-lg font-medium text-neutral-900">{t('account.title')}</h2>
            <p className="text-sm text-neutral-500 mt-1">{t('account.description')}</p>
          </div>

          {/* Start Over */}
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-neutral-900">{t('account.startOver.title')}</h3>
                <p className="text-sm text-neutral-500 mt-1 mb-4">{t('account.startOver.warning')}</p>

                {!showResetConfirmation ? (
                  <button onClick={() => setShowResetConfirmation(true)} className="px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    {t('account.startOver.button')}
                  </button>
                ) : (
                  <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-800">{t('account.startOver.confirmation.title')}</p>
                        <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                          <li>{t('account.startOver.confirmation.items.profile')}</li>
                          <li>{t('account.startOver.confirmation.items.plan')}</li>
                          <li>{t('account.startOver.confirmation.items.progress')}</li>
                          <li>{t('account.startOver.confirmation.items.tools')}</li>
                        </ul>
                        <p className="text-sm text-amber-600 mt-3">{t('account.startOver.confirmation.preserved')}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setShowResetConfirmation(false)} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors">
                        {t('account.startOver.confirmation.cancelButton')}
                      </button>
                      <button onClick={() => void handleReset()} disabled={isResetting} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isResetting ? t('account.startOver.confirmation.resetting') : t('account.startOver.confirmation.confirmButton')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delete Account */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-medium text-neutral-900">{t('account.delete.title')}</h3>
                <p className="text-sm text-neutral-500 mt-1 mb-4">{t('account.delete.warning')}</p>

                {!showConfirmation ? (
                  <button onClick={() => setShowConfirmation(true)} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    {t('account.delete.button')}
                  </button>
                ) : (
                  <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800">{t('account.delete.confirmation.title')}</p>
                        <p className="text-sm text-red-600 mt-1">{t('account.delete.confirmation.description')}</p>
                        <ul className="text-sm text-red-600 mt-2 space-y-1 list-disc list-inside">
                          <li>{t('account.delete.confirmation.items.profile')}</li>
                          <li>{t('account.delete.confirmation.items.plan')}</li>
                          <li>{t('account.delete.confirmation.items.data')}</li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-red-800 mb-2">
                        <Trans i18nKey="account.delete.confirmation.typeConfirm" ns="settings" components={{ strong: <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded" /> }} />
                      </label>
                      <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={confirmWord} className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" autoComplete="off" />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowConfirmation(false);
                          setConfirmText('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors"
                      >
                        {t('account.delete.confirmation.cancelButton')}
                      </button>
                      <button
                        onClick={() => void handleDeleteAccount()}
                        disabled={confirmText !== confirmWord || isDeleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? t('account.delete.confirmation.deleting') : t('account.delete.confirmation.confirmButton')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* GDPR Info */}
        <div className="mt-6 p-4 bg-neutral-100 rounded-lg">
          <p className="text-xs text-neutral-500">{t('gdpr')}</p>
        </div>
      </div>
    </div>
  );
}
