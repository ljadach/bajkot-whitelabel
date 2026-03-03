/**
 * useLanguageSync - Syncs localStorage language preference to user profile after login.
 *
 * Problem: When user selects language before logging in, the preference is stored
 * in localStorage but updateProfile fails silently (no auth). This hook syncs
 * the preference to the profile once the user becomes authenticated.
 */

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { isSupported } from '@/locales';

const STORAGE_KEY = 'preferredLanguage';

export function useLanguageSync() {
  const { user, isLoaded } = useUser();
  const { i18n } = useTranslation();
  const updateProfile = useMutation(api.profiles.createOrUpdateProfile);
  const hasSynced = useRef(false);

  useEffect(() => {
    // Wait for Clerk to load and user to be authenticated
    if (!isLoaded || !user?.id || hasSynced.current) {
      return;
    }

    // Get language from localStorage (set by LanguageSwitcher)
    const storedLanguage = localStorage.getItem(STORAGE_KEY);

    // Only sync if there's a stored preference and it's valid
    if (!storedLanguage || !isSupported(storedLanguage)) {
      hasSynced.current = true;
      return;
    }

    // Sync to profile
    void (async () => {
      try {
        await updateProfile({ preferredLanguage: storedLanguage });
        console.debug('[useLanguageSync] Synced language to profile:', storedLanguage);

        // Also ensure i18n matches (in case it drifted)
        if (i18n.language?.split('-')[0] !== storedLanguage) {
          await i18n.changeLanguage(storedLanguage);
        }
      } catch (error) {
        console.warn('[useLanguageSync] Failed to sync language:', error);
      }
    })();

    hasSynced.current = true;
  }, [isLoaded, user?.id, updateProfile, i18n]);
}
