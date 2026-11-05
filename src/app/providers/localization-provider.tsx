import { useLayoutEffect, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n, useLocalePreferences } from '@/shared/lib/i18n'

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const locale = useLocalePreferences((state) => state.locale)
  useLayoutEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
    if (i18n.language !== locale) void i18n.changeLanguage(locale)
  }, [locale])
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
