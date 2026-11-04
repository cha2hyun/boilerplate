import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ExchangeRateContext } from './exchange-rate-context'
import { convertUsdAmount } from './money'
import { useLocalePreferences } from './preferences'
import { useFormatters } from './use-formatters'

beforeEach(() => {
  useLocalePreferences.setState({ locale: 'en-US', currency: 'USD' })
})

afterEach(() => {
  act(() => {
    useLocalePreferences.setState({ locale: 'en-US', currency: 'USD' })
  })
  localStorage.removeItem('blueprint-locale-preferences')
})

describe('reactive display formatting and USD conversion', () => {
  it('updates numbers and UTC dates on locale changes without changing currency', () => {
    const { result } = renderHook(useFormatters)
    expect(result.current.formatNumber(100400, { notation: 'compact' })).toBe('100.4K')
    expect(result.current.formatDate('2026-11-04')).toBe('Nov 4')

    act(() => {
      useLocalePreferences.getState().setLocale('ko-KR')
    })
    expect(result.current.formatNumber(100400, { notation: 'compact' })).toBe('10만')
    expect(result.current.formatDate('2026-11-04')).toBe('11월 4일')
    expect(result.current.formatDate('2026-11-04T00:15:00+09:00')).toBe('11월 3일')
    expect(result.current.formatMoney(2.5, { showCurrency: false })).toBe('2.50')
    expect(useLocalePreferences.getState().currency).toBe('USD')
    expect(result.current.formatNumber(100400, { locale: 'en-US', notation: 'compact' })).toBe(
      '100.4K',
    )
    expect(result.current.formatDate('2026-11-04', { locale: 'en-US' })).toBe('Nov 4')
  })

  it('converts cents at the caller boundary and reacts to currency and reference-rate updates', () => {
    let rate: number | null = 1200
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ExchangeRateContext value={rate}>{children}</ExchangeRateContext>
    )
    const { result, rerender } = renderHook(useFormatters, { wrapper })
    const orderAmountInCents = 250
    expect(result.current.formatMoney(orderAmountInCents / 100)).toBe('$2.50')

    act(() => {
      useLocalePreferences.getState().setCurrency('KRW')
    })
    expect(result.current.formatMoney(orderAmountInCents / 100)).toBe('₩3,000')
    expect(useLocalePreferences.getState().locale).toBe('en-US')
    rate = 1260
    rerender()
    expect(result.current.formatMoney(orderAmountInCents / 100)).toBe('₩3,150')
    rate = null
    rerender()
    expect(result.current.formatMoney(orderAmountInCents / 100)).toBe('—')

    act(() => {
      useLocalePreferences.getState().setCurrency('USD')
    })
    expect(result.current.formatMoney(orderAmountInCents / 100)).toBe('$2.50')
  })

  it('keeps pure numeric currency formatting separate from converted amounts', () => {
    useLocalePreferences.getState().setCurrency('KRW')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ExchangeRateContext value={1200}>{children}</ExchangeRateContext>
    )
    const { result } = renderHook(useFormatters, { wrapper })
    expect(result.current.formatNumber(2.5, { style: 'currency', currency: 'KRW' })).toBe('₩3')
    expect(result.current.formatMoney(2.5)).toBe('₩3,000')
    expect(result.current.formatMoney(2.5, { minimumFractionDigits: 2 })).toBe('₩3,000.00')
  })

  it.each([null, 0, -1, NaN, Infinity, -Infinity])(
    'never invents a KRW value for an invalid rate: %s',
    (rate) => {
      useLocalePreferences.getState().setCurrency('KRW')
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ExchangeRateContext value={rate}>{children}</ExchangeRateContext>
      )
      const { result } = renderHook(useFormatters, { wrapper })
      expect(result.current.formatMoney(2.5)).toBe('—')
      expect(convertUsdAmount(2.5, 'USD', rate)).toBe(2.5)
    },
  )

  it('preserves precision until display rounding and rejects invalid or overflowing amounts', () => {
    expect(convertUsdAmount(1.234, 'KRW', 1200.5)).toBe(1.234 * 1200.5)
    expect(convertUsdAmount(-2.5, 'KRW', 1200)).toBe(-3000)
    expect(convertUsdAmount(0, 'KRW', 1200)).toBe(0)
    for (const value of [null, undefined, NaN, Infinity, -Infinity]) {
      expect(convertUsdAmount(value, 'USD', null)).toBeNull()
      expect(convertUsdAmount(value, 'KRW', 1200)).toBeNull()
    }
    expect(convertUsdAmount(Number.MAX_VALUE, 'KRW', 1200)).toBeNull()
  })
})
