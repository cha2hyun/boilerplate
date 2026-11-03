interface CommonNumberFormatOptions {
  locale?: string
  notation?: 'standard' | 'compact'
  compactDisplay?: Intl.NumberFormatOptions['compactDisplay']
  useGrouping?: boolean
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  signDisplay?: Intl.NumberFormatOptions['signDisplay']
}

export type NumberFormatOptions = CommonNumberFormatOptions &
  (
    | {
        style?: 'decimal' | 'percent'
        currency?: never
        currencyDisplay?: never
        currencySign?: never
        showCurrency?: never
      }
    | {
        style: 'currency'
        currency: string
        currencyDisplay?: Intl.NumberFormatOptions['currencyDisplay']
        currencySign?: Intl.NumberFormatOptions['currencySign']
        showCurrency?: boolean
      }
  )

const numberFormatters = new Map<string, Intl.NumberFormat>()
const formatterCacheLimit = 64

function getNumberFormatter(options: NumberFormatOptions) {
  const locale = options.locale ?? 'en-US'
  const style = options.style ?? 'decimal'
  const hasPrecision =
    options.minimumFractionDigits !== undefined || options.maximumFractionDigits !== undefined
  const defaultFractionDigits =
    !hasPrecision && (style === 'percent' || options.notation === 'compact') ? 1 : undefined
  const intlOptions: Intl.NumberFormatOptions = {
    style,
    currency: options.currency,
    currencyDisplay: options.currencyDisplay,
    currencySign: options.currencySign,
    notation: options.notation,
    compactDisplay: options.compactDisplay,
    useGrouping: options.useGrouping,
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits ?? defaultFractionDigits,
    signDisplay: options.signDisplay,
  }
  // Fixed property order makes equivalent caller objects share an Intl instance.
  const key = JSON.stringify([locale, intlOptions], (_key, value: unknown) =>
    typeof value === 'number' && !Number.isFinite(value) ? String(value) : value,
  )
  const cached = numberFormatters.get(key)
  if (cached) return cached

  // Let Intl reject invalid locales, currencies and precision instead of hiding mistakes.
  const formatter = new Intl.NumberFormat(locale, intlOptions)
  if (numberFormatters.size >= formatterCacheLimit) {
    const oldestKey = numberFormatters.keys().next().value
    if (oldestKey !== undefined) numberFormatters.delete(oldestKey)
  }
  numberFormatters.set(key, formatter)
  return formatter
}

/** Percent values use human units (12.4 → 12.4%); currency never converts the value. */
export function formatNumber(
  value: number | null | undefined,
  options: NumberFormatOptions = {},
): string {
  if (value == null || !Number.isFinite(value)) return '—'

  const formatter = getNumberFormatter(options)
  const normalizedValue = Object.is(value, -0) ? 0 : value
  const displayValue = options.style === 'percent' ? normalizedValue / 100 : normalizedValue
  if (options.style !== 'currency' || options.showCurrency !== false) {
    return formatter.format(displayValue)
  }

  // Keep currency precision and accounting/sign placement, removing only its label and spacing.
  return formatter
    .formatToParts(displayValue)
    .map((part, index, parts) => {
      if (part.type === 'currency') return ''
      const besideCurrency =
        parts[index - 1]?.type === 'currency' || parts[index + 1]?.type === 'currency'
      return part.type === 'literal' && besideCurrency
        ? part.value.replace(/\s+/gu, '')
        : part.value
    })
    .join('')
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(value))
}

export function formatRelativeTime(value: string, now = new Date()) {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
  if (Math.abs(seconds) < 60) return 'Just now'
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute')
  if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), 'hour')
  return formatter.format(Math.round(seconds / 86400), 'day')
}
