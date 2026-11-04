import { describe, expect, it } from 'vitest'
import { createPreferenceStorage } from '../preference-storage'
import { createLocalePreferencesStore, type AppLocale, type DisplayCurrency } from './preferences'

const storageKey = 'blueprint-locale-preferences'

describe('locale and display currency preferences', () => {
  it('defaults to English and USD and persists both selections independently', () => {
    const storage = createPreferenceStorage(null)
    const preferences = createLocalePreferencesStore(storage)
    expect(preferences.getState()).toMatchObject({ locale: 'en-US', currency: 'USD' })

    preferences.getState().setLocale('ko-KR')
    expect(preferences.getState()).toMatchObject({ locale: 'ko-KR', currency: 'USD' })
    preferences.getState().setCurrency('KRW')
    expect(preferences.getState()).toMatchObject({ locale: 'ko-KR', currency: 'KRW' })
    preferences.getState().setLocale('en-US')
    expect(preferences.getState()).toMatchObject({ locale: 'en-US', currency: 'KRW' })

    const reloaded = createLocalePreferencesStore(storage)
    expect(reloaded.getState()).toMatchObject({ locale: 'en-US', currency: 'KRW' })
    reloaded.getState().setCurrency('USD')
    expect(reloaded.getState()).toMatchObject({ locale: 'en-US', currency: 'USD' })
  })

  it('persists only the validated preferences, excluding actions and exchange-rate data', async () => {
    const storage = createPreferenceStorage(null)
    const preferences = createLocalePreferencesStore(storage)
    preferences.getState().setCurrency('KRW')
    const saved = await storage.getItem(storageKey)
    expect(JSON.parse(saved ?? '{}')).toEqual({
      state: { locale: 'en-US', currency: 'KRW' },
      version: 1,
    })
  })

  it.each([
    '{invalid JSON',
    JSON.stringify({ state: { locale: 'ja-JP', currency: 'KRW' }, version: 1 }),
    JSON.stringify({ state: { locale: 'ko-KR', currency: 'EUR' }, version: 1 }),
    JSON.stringify({ state: { locale: 'ko-KR' }, version: 1 }),
    JSON.stringify({ state: null, version: 1 }),
    JSON.stringify({ state: { locale: 'ko-KR', currency: 'KRW' }, version: 0 }),
  ])('recovers from corrupt or unsupported persisted state: %s', async (saved) => {
    const storage = createPreferenceStorage(null)
    await storage.setItem(storageKey, saved)
    const preferences = createLocalePreferencesStore(storage)
    expect(preferences.getState()).toMatchObject({ locale: 'en-US', currency: 'USD' })

    preferences.getState().setLocale('ko-KR')
    preferences.getState().setCurrency('KRW')
    expect(createLocalePreferencesStore(storage).getState()).toMatchObject({
      locale: 'ko-KR',
      currency: 'KRW',
    })
  })

  it('rejects unsupported runtime values without changing the last valid selection', () => {
    const preferences = createLocalePreferencesStore(createPreferenceStorage(null))
    preferences.getState().setLocale('ko-KR')
    preferences.getState().setCurrency('KRW')
    expect(() => {
      preferences.getState().setLocale('ja-JP' as AppLocale)
    }).toThrow()
    expect(() => {
      preferences.getState().setCurrency('EUR' as DisplayCurrency)
    }).toThrow()
    expect(preferences.getState()).toMatchObject({ locale: 'ko-KR', currency: 'KRW' })
  })

  it('keeps selections usable for the session when browser storage is blocked', () => {
    const storage = createPreferenceStorage({
      getItem() {
        throw new DOMException('Storage blocked', 'SecurityError')
      },
      setItem() {
        throw new DOMException('Storage blocked', 'SecurityError')
      },
      removeItem() {
        throw new DOMException('Storage blocked', 'SecurityError')
      },
    })
    const preferences = createLocalePreferencesStore(storage)
    preferences.getState().setLocale('ko-KR')
    preferences.getState().setCurrency('KRW')
    expect(createLocalePreferencesStore(storage).getState()).toMatchObject({
      locale: 'ko-KR',
      currency: 'KRW',
    })
  })
})
