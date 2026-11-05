import { describe, expect, it, vi } from 'vitest'
import {
  createNumberFormatter,
  formatDate,
  formatNumber,
  formatRelativeTime,
  type NumberFormatOptions,
} from './format'

describe('formatNumber', () => {
  it('uses English grouping by default and supports disabling it', () => {
    expect(formatNumber(1234567.89)).toBe('1,234,567.89')
    expect(formatNumber(1234567.89, { useGrouping: false })).toBe('1234567.89')
    expect(formatNumber(1234567.89, { locale: 'de-DE' })).toBe('1.234.567,89')
  })

  it('preserves Intl decimal rounding unless precision is supplied', () => {
    expect(formatNumber(1234.56789)).toBe('1,234.568')
    expect(formatNumber(1234.56789, { maximumFractionDigits: 2 })).toBe('1,234.57')
    expect(formatNumber(12, { minimumFractionDigits: 2 })).toBe('12.00')
  })

  it('uses the selected currency minor units without converting the amount', () => {
    expect(formatNumber(1234.5, { style: 'currency', currency: 'USD' })).toBe('$1,234.50')
    expect(formatNumber(1234.5, { style: 'currency', currency: 'KRW' })).toBe('₩1,235')
    expect(formatNumber(1234.5, { style: 'currency', currency: 'KRW', locale: 'ko-KR' })).toBe(
      '₩1,235',
    )
    expect(
      formatNumber(1234.5, {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'code',
      }),
    ).toBe('USD\u00a01,234.50')
  })

  it.each(['symbol', 'narrowSymbol', 'code', 'name'] as const)(
    'hides the %s currency label and its spacing while retaining precision and signs',
    (currencyDisplay) => {
      expect(
        formatNumber(-1234.5, {
          style: 'currency',
          currency: 'USD',
          currencyDisplay,
          showCurrency: false,
        }),
      ).toBe('-1,234.50')
      expect(
        formatNumber(1234.5, {
          style: 'currency',
          currency: 'KRW',
          currencyDisplay,
          showCurrency: false,
          useGrouping: false,
          signDisplay: 'always',
        }),
      ).toBe('+1235')
    },
  )

  it('hides currency without stripping accounting parentheses or locale grouping spaces', () => {
    expect(
      formatNumber(-1234.5, {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'code',
        currencySign: 'accounting',
        showCurrency: false,
      }),
    ).toBe('(1,234.50)')
    expect(
      formatNumber(-1234.5, {
        style: 'currency',
        currency: 'USD',
        currencySign: 'accounting',
        showCurrency: false,
        locale: 'fr-FR',
      }),
    ).toBe('(1\u202f234,50)')
  })

  it('uses locale compact units, one decimal by default and Intl rounding at boundaries', () => {
    expect(formatNumber(100400, { notation: 'compact' })).toBe('100.4K')
    expect(formatNumber(999950, { notation: 'compact' })).toBe('1M')
    expect(formatNumber(100400, { notation: 'compact', maximumFractionDigits: 0 })).toBe('100K')
    expect(formatNumber(100400, { notation: 'compact', compactDisplay: 'long' })).toBe(
      '100.4 thousand',
    )
    expect(formatNumber(100400, { notation: 'compact', locale: 'ko-KR' })).toBe('10만')
    expect(formatNumber(100400, { notation: 'compact', style: 'currency', currency: 'USD' })).toBe(
      '$100.4K',
    )
  })

  it('accepts percent values in human units and applies sign, precision and locale options', () => {
    expect(formatNumber(12.4, { style: 'percent' })).toBe('12.4%')
    expect(formatNumber(0.124, { style: 'percent' })).toBe('0.1%')
    expect(formatNumber(-12.45, { style: 'percent' })).toBe('-12.5%')
    expect(formatNumber(12.4, { style: 'percent', signDisplay: 'always' })).toBe('+12.4%')
    expect(formatNumber(12.4, { style: 'percent', maximumFractionDigits: 0 })).toBe('12%')
    expect(formatNumber(12.4, { style: 'percent', minimumFractionDigits: 2 })).toBe('12.40%')
    expect(formatNumber(12.4, { style: 'percent', locale: 'de-DE' })).toBe('12,4\u00a0%')
  })

  it('normalizes negative zero before applying signs and currency accounting', () => {
    expect(formatNumber(-0)).toBe('0')
    expect(formatNumber(-0, { signDisplay: 'always' })).toBe('+0')
    expect(formatNumber(-0, { style: 'percent' })).toBe('0%')
    expect(
      formatNumber(-0, { style: 'currency', currency: 'USD', currencySign: 'accounting' }),
    ).toBe('$0.00')
  })

  it.each([null, undefined, NaN, Infinity, -Infinity])('uses a placeholder for %s', (value) => {
    expect(formatNumber(value)).toBe('—')
    expect(formatNumber(value, { style: 'currency', currency: 'USD' })).toBe('—')
  })

  it.each<NumberFormatOptions>([
    { minimumFractionDigits: -1 },
    { maximumFractionDigits: 101 },
    { maximumFractionDigits: NaN },
    { minimumFractionDigits: 3, maximumFractionDigits: 2 },
    { locale: 'invalid_locale' },
    { style: 'currency', currency: 'US' },
  ])('rejects invalid Intl options %j instead of coercing them', (options) => {
    expect(() => formatNumber(1234.5, options)).toThrow(RangeError)
  })

  it('does not reuse a runtime null precision formatter for invalid nonfinite precision', () => {
    const runtimeOptions = { minimumFractionDigits: null } as unknown as NumberFormatOptions
    expect(formatNumber(12.34, runtimeOptions)).toBe('12.34')

    for (const minimumFractionDigits of [NaN, Infinity, -Infinity]) {
      expect(() => formatNumber(12.34, { minimumFractionDigits })).toThrow(RangeError)
    }
  })

  it('shares a formatter across property order, values and currency label visibility', async () => {
    vi.resetModules()
    const { formatNumber: formatFreshNumber } = await import('./format')
    const constructor = vi.spyOn(Intl, 'NumberFormat')

    formatFreshNumber(1, { style: 'currency', currency: 'USD', useGrouping: false })
    formatFreshNumber(2, {
      useGrouping: false,
      currency: 'USD',
      style: 'currency',
      showCurrency: false,
    })

    expect(constructor).toHaveBeenCalledTimes(1)
  })

  it('evicts old formatters once the 64-entry cache is full', async () => {
    vi.resetModules()
    const { formatNumber: formatFreshNumber } = await import('./format')
    const constructor = vi.spyOn(Intl, 'NumberFormat')

    for (let maximumFractionDigits = 0; maximumFractionDigits <= 64; maximumFractionDigits++) {
      formatFreshNumber(1.25, { maximumFractionDigits })
    }
    formatFreshNumber(1.25, { maximumFractionDigits: 64 })
    expect(constructor).toHaveBeenCalledTimes(65)
    formatFreshNumber(1.25, { maximumFractionDigits: 0 })
    expect(constructor).toHaveBeenCalledTimes(66)
  })
})

describe('bound number formatting', () => {
  it('reuses one resolved formatter for a batch without rebuilding cache keys', () => {
    const options = {
      style: 'currency',
      currency: 'USD',
      currencySign: 'accounting',
      showCurrency: false,
    } satisfies NumberFormatOptions
    const format = createNumberFormatter(options)
    const serialize = vi.spyOn(JSON, 'stringify')
    expect([-1234.5, -0, 12.5, null, NaN].map(format)).toEqual([
      '(1,234.50)',
      '0.00',
      '12.50',
      '—',
      '—',
    ])
    expect(serialize).not.toHaveBeenCalled()
    serialize.mockRestore()
    expect(
      createNumberFormatter({
        showCurrency: false,
        currencySign: 'accounting',
        currency: 'USD',
        style: 'currency',
      }),
    ).toBe(format)
  })

  it('retains bound options when caller objects change and validates options when bound', () => {
    const options: NumberFormatOptions = { style: 'percent', maximumFractionDigits: 1 }
    const format = createNumberFormatter(options)
    options.maximumFractionDigits = 0
    expect(format(12.45)).toBe('12.5%')
    expect(createNumberFormatter(options)(12.45)).toBe('12%')
    expect(() => createNumberFormatter({ maximumFractionDigits: NaN })).toThrow(RangeError)
    expect(() => createNumberFormatter({ locale: 'invalid_locale' })).toThrow(RangeError)
  })
})

describe('cached date and relative-time formatting', () => {
  it('preserves UTC defaults, locale overrides, time zones and Intl style validation', () => {
    const value = '2026-11-04T00:15:00+09:00'
    expect(formatDate(value)).toBe('Nov 3')
    expect(formatDate(value, { locale: 'ko-KR', timeZone: 'Asia/Seoul' })).toBe('11월 4일')
    expect(formatDate(value, { dateStyle: 'medium', timeStyle: 'short' })).toBe(
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(value)),
    )
    expect(() => formatDate(value, { dateStyle: 'short', month: 'long' })).toThrow(TypeError)
    expect(() => formatDate(value, { timeZone: 'invalid-zone' })).toThrow(RangeError)
    expect(() => formatDate(value, { locale: 'invalid_locale' })).toThrow(RangeError)
    expect(() => formatDate(value, { fractionalSecondDigits: NaN as 1 })).toThrow(RangeError)
  })

  it('shares date instances across option order while formatting each current value', async () => {
    vi.resetModules()
    const { formatDate: formatFreshDate } = await import('./format')
    const constructor = vi.spyOn(Intl, 'DateTimeFormat')
    expect(formatFreshDate('2026-11-04', { locale: 'ko-KR', year: 'numeric' })).toBe(
      '2026년 11월 4일',
    )
    expect(formatFreshDate('2026-11-05', { year: 'numeric', locale: 'ko-KR' })).toBe(
      '2026년 11월 5일',
    )
    expect(constructor).toHaveBeenCalledTimes(1)
  })

  it('reuses relative-time instances without caching the current-time result', async () => {
    vi.resetModules()
    const { formatRelativeTime: formatFreshRelativeTime } = await import('./format')
    const constructor = vi.spyOn(Intl, 'RelativeTimeFormat')
    const value = '2026-11-04T00:00:00Z'
    expect(formatFreshRelativeTime(value, new Date('2026-11-04T00:02:00Z'))).toBe('2 minutes ago')
    expect(formatFreshRelativeTime(value, new Date('2026-11-04T00:03:00Z'))).toBe('3 minutes ago')
    expect(constructor).toHaveBeenCalledTimes(1)
    expect(formatFreshRelativeTime(value, new Date('2026-11-04T00:02:00Z'), 'ko-KR')).toBe('2분 전')
    expect(constructor).toHaveBeenCalledTimes(2)
    expect(formatRelativeTime(value, new Date(value), 'ko-KR')).toBe('방금 전')
    expect(() => formatFreshRelativeTime(value, new Date(value), 'invalid_locale')).toThrow(
      RangeError,
    )
  })

  it.each(['date', 'relative'] as const)(
    'bounds the %s formatter cache to 64 entries',
    async (kind) => {
      vi.resetModules()
      const fresh = await import('./format')
      const constructor = vi.spyOn(Intl, kind === 'date' ? 'DateTimeFormat' : 'RelativeTimeFormat')
      const format = (index: number) => {
        const locale = `en-US-x-cache-${String(index)}`
        return kind === 'date'
          ? fresh.formatDate('2026-11-04', { locale })
          : fresh.formatRelativeTime('2026-11-04', new Date('2026-11-05'), locale)
      }
      for (let index = 0; index <= 64; index++) format(index)
      format(64)
      expect(constructor).toHaveBeenCalledTimes(65)
      format(0)
      expect(constructor).toHaveBeenCalledTimes(66)
    },
  )
})
