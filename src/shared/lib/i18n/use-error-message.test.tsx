import type { PropsWithChildren } from 'react'
import { renderHook } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api'
import { resources } from './resources'
import { useErrorMessage } from './use-error-message'

describe('localized request outcomes', () => {
  it.each(['en-US', 'ko-KR'] as const)(
    'preserves uncertain-write guidance in %s without changing read failures',
    async (locale) => {
      const instance = createInstance()
      await instance.init({ resources, lng: locale, initAsync: false })
      const wrapper = ({ children }: PropsWithChildren) => (
        <I18nextProvider i18n={instance}>{children}</I18nextProvider>
      )
      const { result } = renderHook(useErrorMessage, { wrapper })
      const messages = resources[locale].common.errors

      for (const code of ['NETWORK_ERROR', 'INVALID_RESPONSE'] as const) {
        expect(result.current(new ApiError('Unconfirmed', code, null, true))).toBe(
          messages.uncertainWrite,
        )
      }
      expect(result.current(new ApiError('Read failed', 'NETWORK_ERROR'))).toBe(messages.network)
      expect(result.current(new ApiError('Read failed', 'INVALID_RESPONSE', 200))).toBe(
        messages.invalidResponse,
      )
      expect(result.current(new ApiError('Write stalled', 'TIMEOUT', null, true))).toBe(
        messages.timeoutWrite,
      )
      expect(result.current(new ApiError('Read stalled', 'TIMEOUT'))).toBe(messages.timeout)
    },
  )
})
