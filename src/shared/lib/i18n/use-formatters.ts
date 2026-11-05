import { useCallback, useMemo } from 'react'
import {
  formatDate as formatDateValue,
  formatNumber as formatNumericValue,
  formatRelativeTime as formatRelativeTimeValue,
  type DateFormatOptions,
  type NumberFormatOptions,
} from '../format'
import { convertUsdAmount, type MoneyFormatOptions } from './money'
import { useUsdKrwRate } from './exchange-rate-context'
import { useLocalePreferences } from './preferences'

export function useFormatters() {
  const locale = useLocalePreferences((state) => state.locale)
  const currency = useLocalePreferences((state) => state.currency)
  const rate = useUsdKrwRate()
  const conversionRate = currency === 'KRW' ? rate : null
  const localized = useMemo(
    () => ({
      formatNumber: (value: number | null | undefined, options?: NumberFormatOptions) =>
        formatNumericValue(value, { locale, ...options }),
      formatDate: (value: string | Date, options: DateFormatOptions = {}) => {
        const { locale: dateLocale = locale, ...dateOptions } = options
        return formatDateValue(value, { ...dateOptions, locale: dateLocale })
      },
      formatRelativeTime: (value: string, now = new Date()) =>
        formatRelativeTimeValue(value, now, locale),
    }),
    [locale],
  )
  const formatMoney = useCallback(
    (value: number | null | undefined, options?: MoneyFormatOptions) =>
      formatNumericValue(convertUsdAmount(value, currency, conversionRate), {
        locale,
        style: 'currency',
        currency,
        ...options,
      }),
    [locale, currency, conversionRate],
  )
  return useMemo(() => ({ ...localized, formatMoney }), [localized, formatMoney])
}
