import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'
import { useLocalePreferences } from './preferences'

export const i18n = createInstance()
export const i18nReady = i18n.use(initReactI18next).init({
  resources,
  lng: useLocalePreferences.getState().locale,
  supportedLngs: ['en-US', 'ko-KR'],
  fallbackLng: 'en-US',
  load: 'currentOnly',
  defaultNS: 'common',
  ns: Object.keys(resources['en-US']),
  initAsync: false,
  returnNull: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})
