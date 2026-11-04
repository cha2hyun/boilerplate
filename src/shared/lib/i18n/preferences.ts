import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { z } from 'zod'
import { createPreferenceStorage } from '../preference-storage'

export const localeSchema = z.enum(['en-US', 'ko-KR'])
export const currencySchema = z.enum(['USD', 'KRW'])
export type AppLocale = z.infer<typeof localeSchema>
export type DisplayCurrency = z.infer<typeof currencySchema>
export const localePreferencesSchema = z.object({ locale: localeSchema, currency: currencySchema })
type LocalePreferences = z.infer<typeof localePreferencesSchema>
interface LocaleState extends LocalePreferences {
  setLocale: (locale: AppLocale) => void
  setCurrency: (currency: DisplayCurrency) => void
}
const defaults: LocalePreferences = { locale: 'en-US', currency: 'USD' }

export function createLocalePreferencesStore(storage: StateStorage = createPreferenceStorage()) {
  return create<LocaleState>()(
    persist(
      (set) => ({
        ...defaults,
        setLocale: (locale) => {
          set({ locale: localeSchema.parse(locale) })
        },
        setCurrency: (currency) => {
          set({ currency: currencySchema.parse(currency) })
        },
      }),
      {
        name: 'blueprint-locale-preferences',
        version: 1,
        storage: createJSONStorage<LocalePreferences>(() => storage),
        partialize: ({ locale, currency }) => ({ locale, currency }),
        migrate: () => defaults,
        merge: (persisted, current) => {
          const parsed = localePreferencesSchema.safeParse(persisted)
          return { ...current, ...(parsed.success ? parsed.data : defaults) }
        },
      },
    ),
  )
}

export const useLocalePreferences = createLocalePreferencesStore()
