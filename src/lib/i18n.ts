import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/locales';

const isBrowser = typeof window !== 'undefined';

// Import all translation files
// English
import enCommon from '@/locales/en/common.json';
import enApp from '@/locales/en/app.json';
import enChat from '@/locales/en/chat.json';
import enVerification from '@/locales/en/verification.json';
import enSummary from '@/locales/en/summary.json';
import enPlan from '@/locales/en/plan.json';
import enPayment from '@/locales/en/payment.json';
import enComplete from '@/locales/en/complete.json';
import enSettings from '@/locales/en/settings.json';
import enDashboard from '@/locales/en/dashboard.json';
import enCourse from '@/locales/en/course.json';
import enCookies from '@/locales/en/cookies.json';
import enTeam from '@/locales/en/team.json';
import enSegmentCommon from '@/locales/en/segment-common.json';
import enSegmentBusiness from '@/locales/en/segment-business.json';
import enSegmentEdu from '@/locales/en/segment-edu.json';
import enSegmentExecutive from '@/locales/en/segment-executive.json';
import enPricing from '@/locales/en/pricing.json';
import enContact from '@/locales/en/contact.json';
import enFaq from '@/locales/en/faq.json';
import enCompareCommon from '@/locales/en/compare-common.json';
import enCompareChatgptVsClaude from '@/locales/en/compare-chatgpt-vs-claude.json';
import enCompareChatgptVsCopilot from '@/locales/en/compare-chatgpt-vs-copilot.json';
import enCompareChatgptVsGemini from '@/locales/en/compare-chatgpt-vs-gemini.json';
import enCompareClaudeVsGemini from '@/locales/en/compare-claude-vs-gemini.json';
import enCompareCopilotVsGemini from '@/locales/en/compare-copilot-vs-gemini.json';
import enCompareMidjourneyVsDalle from '@/locales/en/compare-midjourney-vs-dalle.json';
import enCompareHub from '@/locales/en/compare-hub.json';
import enToolsHub from '@/locales/en/tools-hub.json';
import enProductChatgpt from '@/locales/en/product-chatgpt.json';
import enProductClaude from '@/locales/en/product-claude.json';
import enProductGemini from '@/locales/en/product-gemini.json';
import enProductCopilot from '@/locales/en/product-copilot.json';
import enProductMidjourney from '@/locales/en/product-midjourney.json';
import enProductDalle from '@/locales/en/product-dalle.json';
import enProductGrok from '@/locales/en/product-grok.json';
import enProductNotebooklm from '@/locales/en/product-notebooklm.json';
import enProductPerplexity from '@/locales/en/product-perplexity.json';
import enGlossary from '@/locales/en/glossary.json';
import enSegmentIndividuals from '@/locales/en/segment-individuals.json';
import enSegmentFreelancers from '@/locales/en/segment-freelancers.json';
import enSegmentCareerChangers from '@/locales/en/segment-career-changers.json';
import enSegmentCreators from '@/locales/en/segment-creators.json';
import enSegmentPersonalProductivity from '@/locales/en/segment-personal-productivity.json';

// Polish
import plCommon from '@/locales/pl/common.json';
import plApp from '@/locales/pl/app.json';
import plChat from '@/locales/pl/chat.json';
import plVerification from '@/locales/pl/verification.json';
import plSummary from '@/locales/pl/summary.json';
import plPlan from '@/locales/pl/plan.json';
import plPayment from '@/locales/pl/payment.json';
import plComplete from '@/locales/pl/complete.json';
import plSettings from '@/locales/pl/settings.json';
import plDashboard from '@/locales/pl/dashboard.json';
import plCourse from '@/locales/pl/course.json';
import plCookies from '@/locales/pl/cookies.json';
import plTeam from '@/locales/pl/team.json';
import plSegmentCommon from '@/locales/pl/segment-common.json';
import plSegmentBusiness from '@/locales/pl/segment-business.json';
import plSegmentEdu from '@/locales/pl/segment-edu.json';
import plSegmentExecutive from '@/locales/pl/segment-executive.json';
import plPricing from '@/locales/pl/pricing.json';
import plContact from '@/locales/pl/contact.json';
import plFaq from '@/locales/pl/faq.json';
import plCompareCommon from '@/locales/pl/compare-common.json';
import plCompareChatgptVsClaude from '@/locales/pl/compare-chatgpt-vs-claude.json';
import plCompareChatgptVsCopilot from '@/locales/pl/compare-chatgpt-vs-copilot.json';
import plCompareChatgptVsGemini from '@/locales/pl/compare-chatgpt-vs-gemini.json';
import plCompareClaudeVsGemini from '@/locales/pl/compare-claude-vs-gemini.json';
import plCompareCopilotVsGemini from '@/locales/pl/compare-copilot-vs-gemini.json';
import plCompareMidjourneyVsDalle from '@/locales/pl/compare-midjourney-vs-dalle.json';
import plCompareHub from '@/locales/pl/compare-hub.json';
import plToolsHub from '@/locales/pl/tools-hub.json';
import plProductChatgpt from '@/locales/pl/product-chatgpt.json';
import plProductClaude from '@/locales/pl/product-claude.json';
import plProductGemini from '@/locales/pl/product-gemini.json';
import plProductCopilot from '@/locales/pl/product-copilot.json';
import plProductMidjourney from '@/locales/pl/product-midjourney.json';
import plProductDalle from '@/locales/pl/product-dalle.json';
import plProductGrok from '@/locales/pl/product-grok.json';
import plProductNotebooklm from '@/locales/pl/product-notebooklm.json';
import plProductPerplexity from '@/locales/pl/product-perplexity.json';
import plGlossary from '@/locales/pl/glossary.json';
import plSegmentIndividuals from '@/locales/pl/segment-individuals.json';
import plSegmentFreelancers from '@/locales/pl/segment-freelancers.json';
import plSegmentCareerChangers from '@/locales/pl/segment-career-changers.json';
import plSegmentCreators from '@/locales/pl/segment-creators.json';
import plSegmentPersonalProductivity from '@/locales/pl/segment-personal-productivity.json';

// German
import deCommon from '@/locales/de/common.json';
import deApp from '@/locales/de/app.json';
import deChat from '@/locales/de/chat.json';
import deVerification from '@/locales/de/verification.json';
import deSummary from '@/locales/de/summary.json';
import dePlan from '@/locales/de/plan.json';
import dePayment from '@/locales/de/payment.json';
import deComplete from '@/locales/de/complete.json';
import deSettings from '@/locales/de/settings.json';
import deDashboard from '@/locales/de/dashboard.json';
import deCourse from '@/locales/de/course.json';
import deCookies from '@/locales/de/cookies.json';
import deTeam from '@/locales/de/team.json';
import deSegmentCommon from '@/locales/de/segment-common.json';
import deSegmentBusiness from '@/locales/de/segment-business.json';
import deSegmentEdu from '@/locales/de/segment-edu.json';
import deSegmentExecutive from '@/locales/de/segment-executive.json';
import dePricing from '@/locales/de/pricing.json';
import deContact from '@/locales/de/contact.json';
import deFaq from '@/locales/de/faq.json';
import deCompareCommon from '@/locales/de/compare-common.json';
import deCompareChatgptVsClaude from '@/locales/de/compare-chatgpt-vs-claude.json';
import deCompareChatgptVsCopilot from '@/locales/de/compare-chatgpt-vs-copilot.json';
import deCompareChatgptVsGemini from '@/locales/de/compare-chatgpt-vs-gemini.json';
import deCompareClaudeVsGemini from '@/locales/de/compare-claude-vs-gemini.json';
import deCompareCopilotVsGemini from '@/locales/de/compare-copilot-vs-gemini.json';
import deCompareMidjourneyVsDalle from '@/locales/de/compare-midjourney-vs-dalle.json';
import deCompareHub from '@/locales/de/compare-hub.json';
import deToolsHub from '@/locales/de/tools-hub.json';
import deProductChatgpt from '@/locales/de/product-chatgpt.json';
import deProductClaude from '@/locales/de/product-claude.json';
import deProductGemini from '@/locales/de/product-gemini.json';
import deProductCopilot from '@/locales/de/product-copilot.json';
import deProductMidjourney from '@/locales/de/product-midjourney.json';
import deProductDalle from '@/locales/de/product-dalle.json';
import deProductGrok from '@/locales/de/product-grok.json';
import deProductNotebooklm from '@/locales/de/product-notebooklm.json';
import deProductPerplexity from '@/locales/de/product-perplexity.json';
import deGlossary from '@/locales/de/glossary.json';
import deSegmentIndividuals from '@/locales/de/segment-individuals.json';
import deSegmentFreelancers from '@/locales/de/segment-freelancers.json';
import deSegmentCareerChangers from '@/locales/de/segment-career-changers.json';
import deSegmentCreators from '@/locales/de/segment-creators.json';
import deSegmentPersonalProductivity from '@/locales/de/segment-personal-productivity.json';

const resources = {
  en: {
    common: enCommon,
    app: enApp,
    chat: enChat,
    verification: enVerification,
    summary: enSummary,
    plan: enPlan,
    payment: enPayment,
    complete: enComplete,
    settings: enSettings,
    dashboard: enDashboard,
    course: enCourse,
    cookies: enCookies,
    team: enTeam,
    'segment-common': enSegmentCommon,
    'segment-business': enSegmentBusiness,
    'segment-edu': enSegmentEdu,
    'segment-executive': enSegmentExecutive,
    pricing: enPricing,
    contact: enContact,
    faq: enFaq,
    'compare-common': enCompareCommon,
    'compare-chatgpt-vs-claude': enCompareChatgptVsClaude,
    'compare-chatgpt-vs-copilot': enCompareChatgptVsCopilot,
    'compare-chatgpt-vs-gemini': enCompareChatgptVsGemini,
    'compare-claude-vs-gemini': enCompareClaudeVsGemini,
    'compare-copilot-vs-gemini': enCompareCopilotVsGemini,
    'compare-midjourney-vs-dalle': enCompareMidjourneyVsDalle,
    'compare-hub': enCompareHub,
    'tools-hub': enToolsHub,
    'product-chatgpt': enProductChatgpt,
    'product-claude': enProductClaude,
    'product-gemini': enProductGemini,
    'product-copilot': enProductCopilot,
    'product-midjourney': enProductMidjourney,
    'product-dalle': enProductDalle,
    'product-grok': enProductGrok,
    'product-notebooklm': enProductNotebooklm,
    'product-perplexity': enProductPerplexity,
    glossary: enGlossary,
    'segment-individuals': enSegmentIndividuals,
    'segment-freelancers': enSegmentFreelancers,
    'segment-career-changers': enSegmentCareerChangers,
    'segment-creators': enSegmentCreators,
    'segment-personal-productivity': enSegmentPersonalProductivity,
  },
  pl: {
    common: plCommon,
    app: plApp,
    chat: plChat,
    verification: plVerification,
    summary: plSummary,
    plan: plPlan,
    payment: plPayment,
    complete: plComplete,
    settings: plSettings,
    dashboard: plDashboard,
    course: plCourse,
    cookies: plCookies,
    team: plTeam,
    'segment-common': plSegmentCommon,
    'segment-business': plSegmentBusiness,
    'segment-edu': plSegmentEdu,
    'segment-executive': plSegmentExecutive,
    pricing: plPricing,
    contact: plContact,
    faq: plFaq,
    'compare-common': plCompareCommon,
    'compare-chatgpt-vs-claude': plCompareChatgptVsClaude,
    'compare-chatgpt-vs-copilot': plCompareChatgptVsCopilot,
    'compare-chatgpt-vs-gemini': plCompareChatgptVsGemini,
    'compare-claude-vs-gemini': plCompareClaudeVsGemini,
    'compare-copilot-vs-gemini': plCompareCopilotVsGemini,
    'compare-midjourney-vs-dalle': plCompareMidjourneyVsDalle,
    'compare-hub': plCompareHub,
    'tools-hub': plToolsHub,
    'product-chatgpt': plProductChatgpt,
    'product-claude': plProductClaude,
    'product-gemini': plProductGemini,
    'product-copilot': plProductCopilot,
    'product-midjourney': plProductMidjourney,
    'product-dalle': plProductDalle,
    'product-grok': plProductGrok,
    'product-notebooklm': plProductNotebooklm,
    'product-perplexity': plProductPerplexity,
    glossary: plGlossary,
    'segment-individuals': plSegmentIndividuals,
    'segment-freelancers': plSegmentFreelancers,
    'segment-career-changers': plSegmentCareerChangers,
    'segment-creators': plSegmentCreators,
    'segment-personal-productivity': plSegmentPersonalProductivity,
  },
  de: {
    common: deCommon,
    app: deApp,
    chat: deChat,
    verification: deVerification,
    summary: deSummary,
    plan: dePlan,
    payment: dePayment,
    complete: deComplete,
    settings: deSettings,
    dashboard: deDashboard,
    course: deCourse,
    cookies: deCookies,
    team: deTeam,
    'segment-common': deSegmentCommon,
    'segment-business': deSegmentBusiness,
    'segment-edu': deSegmentEdu,
    'segment-executive': deSegmentExecutive,
    pricing: dePricing,
    contact: deContact,
    faq: deFaq,
    'compare-common': deCompareCommon,
    'compare-chatgpt-vs-claude': deCompareChatgptVsClaude,
    'compare-chatgpt-vs-copilot': deCompareChatgptVsCopilot,
    'compare-chatgpt-vs-gemini': deCompareChatgptVsGemini,
    'compare-claude-vs-gemini': deCompareClaudeVsGemini,
    'compare-copilot-vs-gemini': deCompareCopilotVsGemini,
    'compare-midjourney-vs-dalle': deCompareMidjourneyVsDalle,
    'compare-hub': deCompareHub,
    'tools-hub': deToolsHub,
    'product-chatgpt': deProductChatgpt,
    'product-claude': deProductClaude,
    'product-gemini': deProductGemini,
    'product-copilot': deProductCopilot,
    'product-midjourney': deProductMidjourney,
    'product-dalle': deProductDalle,
    'product-grok': deProductGrok,
    'product-notebooklm': deProductNotebooklm,
    'product-perplexity': deProductPerplexity,
    glossary: deGlossary,
    'segment-individuals': deSegmentIndividuals,
    'segment-freelancers': deSegmentFreelancers,
    'segment-career-changers': deSegmentCareerChangers,
    'segment-creators': deSegmentCreators,
    'segment-personal-productivity': deSegmentPersonalProductivity,
  },
};

const instance = i18n.use(initReactI18next);

// LanguageDetector uses localStorage/navigator — only activate in browser
if (isBrowser) {
  instance.use(LanguageDetector);
}

void instance.init({
  resources,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,

  // Namespaces
  ns: [
    'common',
    'app',
    'chat',
    'verification',
    'summary',
    'plan',
    'payment',
    'complete',
    'settings',
    'dashboard',
    'course',
    'cookies',
    'team',
    'segment-common',
    'segment-business',
    'segment-edu',
    'segment-executive',
    'pricing',
    'contact',
    'faq',
    'compare-common',
    'compare-chatgpt-vs-claude',
    'compare-chatgpt-vs-copilot',
    'compare-chatgpt-vs-gemini',
    'compare-claude-vs-gemini',
    'compare-copilot-vs-gemini',
    'compare-midjourney-vs-dalle',
    'compare-hub',
    'tools-hub',
    'product-chatgpt',
    'product-claude',
    'product-gemini',
    'product-copilot',
    'product-midjourney',
    'product-dalle',
    'product-grok',
    'product-notebooklm',
    'product-perplexity',
    'glossary',
    'segment-individuals',
    'segment-freelancers',
    'segment-career-changers',
    'segment-creators',
    'segment-personal-productivity',
  ],
  defaultNS: 'common',

  // Language detection
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
    lookupLocalStorage: 'preferredLanguage',
  },

  interpolation: {
    escapeValue: false, // React already escapes
  },

  react: {
    useSuspense: false, // Disable suspense for simpler loading
  },
});

export default i18n;
