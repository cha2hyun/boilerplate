import { useMemo } from 'react'
import { formatNumber as formatNumericValue, type NumberFormatOptions } from '../format'
import { convertUsdAmount, type MoneyFormatOptions } from './money'
import { useUsdKrwRate } from './exchange-rate-context'
import { useLocalePreferences } from './preferences'

type DateOptions = Intl.DateTimeFormatOptions & { locale?: string }

export function useFormatters() {
  const locale = useLocalePreferences((state) => state.locale)
  const currency = useLocalePreferences((state) => state.currency)
  const rate = useUsdKrwRate()
  return useMemo(
    () => ({
      formatNumber: (value: number | null | undefined, options?: NumberFormatOptions) =>
        formatNumericValue(value, { locale, ...options }),
      formatMoney: (value: number | null | undefined, options?: MoneyFormatOptions) =>
        formatNumericValue(convertUsdAmount(value, currency, rate), {
          locale,
          style: 'currency',
          currency,
          ...options,
        }),
      formatDate: (value: string | Date, options: DateOptions = {}) => {
        const { locale: dateLocale = locale, ...dateOptions } = options
        const defaults =
          dateOptions.dateStyle || dateOptions.timeStyle
            ? {}
            : { month: 'short' as const, day: 'numeric' as const }
        return new Intl.DateTimeFormat(dateLocale, {
          ...defaults,
          timeZone: 'UTC',
          ...dateOptions,
        }).format(new Date(value))
      },
      formatRelativeTime: (value: string, now = new Date()) => {
        const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000)
        const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
        if (Math.abs(seconds) < 60) return locale === 'ko-KR' ? '방금 전' : 'Just now'
        if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute')
        if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), 'hour')
        return formatter.format(Math.round(seconds / 86400), 'day')
      },
    }),
    [locale, currency, rate],
  )
}
