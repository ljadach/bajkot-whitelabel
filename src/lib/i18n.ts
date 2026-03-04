import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Polish only
import plCommon from '@/locales/pl/common.json';
import plApp from '@/locales/pl/app.json';
import plCookies from '@/locales/pl/cookies.json';
import plContact from '@/locales/pl/contact.json';
import plFaq from '@/locales/pl/faq.json';
import plBook from '@/locales/pl/book.json';

const resources = {
  pl: {
    common: plCommon,
    app: plApp,
    cookies: plCookies,
    contact: plContact,
    faq: plFaq,
    book: plBook,
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: 'pl',
  fallbackLng: 'pl',
  supportedLngs: ['pl'],

  ns: ['common', 'app', 'cookies', 'contact', 'faq', 'book'],
  defaultNS: 'common',

  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },
});

export default i18n;
