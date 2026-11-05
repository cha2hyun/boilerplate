import { StrictMode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { i18n, useLocalePreferences, useTranslation } from '@/shared/lib/i18n'
import { localePreferenceStorage } from '@/shared/config/preference-keys'
import { LocalizationProvider } from './localization-provider'

function SampleLabel() {
  const { t } = useTranslation('workspace')
  return <p>{t('common.sample')}</p>
}

beforeEach(async () => {
  useLocalePreferences.setState({ locale: 'en-US', currency: 'USD' })
  await i18n.changeLanguage('en-US')
})

afterEach(async () => {
  cleanup()
  useLocalePreferences.setState({ locale: 'en-US', currency: 'USD' })
  await i18n.changeLanguage('en-US')
  localStorage.removeItem(localePreferenceStorage.key)
})

it('avoids redundant startup language events while applying actual preference changes', async () => {
  const languageChanged = vi.fn()
  i18n.on('languageChanged', languageChanged)
  try {
    render(
      <StrictMode>
        <LocalizationProvider>
          <SampleLabel />
        </LocalizationProvider>
      </StrictMode>,
    )
    expect(screen.getByText('Sample')).toBeVisible()
    expect(document.documentElement.lang).toBe('en-US')
    expect(languageChanged).not.toHaveBeenCalled()

    act(() => {
      useLocalePreferences.getState().setLocale('ko-KR')
    })
    expect(await screen.findByText('샘플')).toBeVisible()
    expect(document.documentElement.lang).toBe('ko-KR')
    expect(document.documentElement.dir).toBe('ltr')
    expect(languageChanged).toHaveBeenCalledExactlyOnceWith('ko-KR')
  } finally {
    i18n.off('languageChanged', languageChanged)
  }
})
