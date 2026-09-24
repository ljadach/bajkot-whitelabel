import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Polish only — the book pipeline writes Polish stories.
import plBook from '@/locales/pl/book.json';

void i18n.use(initReactI18next).init({
  resources: { pl: { book: plBook } },
  lng: 'pl',
  fallbackLng: 'pl',
  supportedLngs: ['pl'],

  ns: ['book'],
  defaultNS: 'book',

  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },
});
