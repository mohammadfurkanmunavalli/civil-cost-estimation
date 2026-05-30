import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import hi from './hi.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng: localStorage.getItem('global_language') || localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

// Update document direction on language change
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = 'ltr'
  document.documentElement.lang = lng
  localStorage.setItem('lang', lng)
})

// Apply initial direction
const initialLang = localStorage.getItem('global_language') || localStorage.getItem('lang') || 'en'
document.documentElement.dir = 'ltr'
document.documentElement.lang = initialLang

export default i18n
