import en from '@/shared/lib/i18n/locales/en-US/common'
import ko from '@/shared/lib/i18n/locales/ko-KR/common'
import { localePreferenceStorage } from '@/shared/config/preference-keys'

type Locale = 'en-US' | 'ko-KR'

function isLocale(value: unknown): value is Locale {
  return value === 'en-US' || value === 'ko-KR'
}

function storedLocale(): Locale | undefined {
  try {
    const raw = window.localStorage.getItem(localePreferenceStorage.key)
    if (!raw || raw.length > 4_096) return
    const saved: unknown = JSON.parse(raw)
    if (
      !saved ||
      typeof saved !== 'object' ||
      !('version' in saved) ||
      saved.version !== localePreferenceStorage.version
    ) {
      return
    }
    if (!('state' in saved) || !saved.state || typeof saved.state !== 'object') return
    const state = saved.state
    if ('locale' in state && isLocale(state.locale)) return state.locale
  } catch {
    // Corrupt or blocked storage cannot prevent recovery.
  }
}

export function getErrorCopy(variant: 'app' | 'startup') {
  // LocalizationProvider writes an exact locale after a successful commit. Initial HTML uses "en".
  const documentLocale = document.documentElement.lang
  const locale = isLocale(documentLocale) ? documentLocale : (storedLocale() ?? 'en-US')
  const common = locale === 'ko-KR' ? ko : en
  return { locale, copy: variant === 'startup' ? common.startup : common.appError }
}
