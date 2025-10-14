import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
import enTranslations from './locales/en.json';
import frCATranslations from './locales/fr-CA.json';

const resources = {
  en: {
    translation: enTranslations
  },
  'fr-CA': {
    translation: frCATranslations
  },
  'fr': {
    translation: frCATranslations // Use fr-CA for base fr fallback
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || 'en', // Default to stored language or English
    debug: false, // Disable debug in production
    
    interpolation: {
      escapeValue: false // React already handles escaping
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    
    // Support Canadian French - include base 'fr' to prevent warnings
    supportedLngs: ['en', 'fr', 'fr-CA'],
    load: 'all',
    nonExplicitSupportedLngs: false
  });

// Listen for language changes and update localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;

