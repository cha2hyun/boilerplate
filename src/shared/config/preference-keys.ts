import { storageKeys } from './product'

/** Safe to import before providers or preference stores initialize. */
export const localePreferenceStorage = {
  key: storageKeys.localePreferences,
  version: 1,
} as const
