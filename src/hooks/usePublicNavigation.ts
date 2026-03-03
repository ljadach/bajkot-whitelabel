import { useNavigate } from 'react-router';
import type { SupportedLang } from './useLangFromUrl';

interface NavigationOptions {
  scrollToTop?: boolean;
}

export function usePublicNavigation(lang: SupportedLang, options: NavigationOptions = {}) {
  const navigate = useNavigate();
  const { scrollToTop = false } = options;

  const afterNavigate = () => {
    if (scrollToTop) {
      document.querySelector('main')?.scrollTo(0, 0);
    }
  };

  const handleSignUp = () => {
    void navigate(`/${lang}/`, { state: { showSignIn: true } });
    afterNavigate();
  };

  const handleContact = () => {
    void navigate(`/${lang}/about/contact`);
    afterNavigate();
  };

  const handlePricing = () => {
    void navigate(`/${lang}/pricing`);
    afterNavigate();
  };

  return { handleSignUp, handleContact, handlePricing };
}
