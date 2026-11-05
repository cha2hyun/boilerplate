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

export type NumberFormatter = (value: number | null | undefined) => string
export type DateFormatOptions = Intl.DateTimeFormatOptions & { locale?: string }

interface CachedNumberFormatter {
  format: NumberFormatter
  withoutCurrency: NumberFormatter
}

const numberFormatters = new Map<string, CachedNumberFormatter>()
const dateFormatters = new Map<string, Intl.DateTimeFormat>()
const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>()
const formatterCacheLimit = 64

function cacheFormatter<T>(cache: Map<string, T>, key: string, formatter: T) {
  if (cache.size >= formatterCacheLimit) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  cache.set(key, formatter)
  return formatter
}

function serializeOptions(value: unknown) {
  return JSON.stringify(value, (_key, entry: unknown) =>
    typeof entry === 'number' && !Number.isFinite(entry) ? String(entry) : entry,
  )
}

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
  const key = serializeOptions([locale, intlOptions])
  const cached = numberFormatters.get(key)
  if (cached) return cached

  // Let Intl reject invalid locales, currencies and precision instead of hiding mistakes.
  const formatter = new Intl.NumberFormat(locale, intlOptions)
  const format = bindNumberFormatter(formatter, style, false)
  return cacheFormatter(numberFormatters, key, {
    format,
    withoutCurrency: style === 'currency' ? bindNumberFormatter(formatter, style, true) : format,
  })
}

function bindNumberFormatter(
  formatter: Intl.NumberFormat,
  style: NonNullable<NumberFormatOptions['style']>,
  hideCurrency: boolean,
): NumberFormatter {
  return (value) => {
    if (value == null || !Number.isFinite(value)) return '—'
    const normalizedValue = Object.is(value, -0) ? 0 : value
    const displayValue = style === 'percent' ? normalizedValue / 100 : normalizedValue
    if (!hideCurrency) return formatter.format(displayValue)

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
}

/** Bind the common formatting contract once when many values share the same options. */
export function createNumberFormatter(options: NumberFormatOptions = {}): NumberFormatter {
  const formatter = getNumberFormatter(options)
  return options.style === 'currency' && options.showCurrency === false
    ? formatter.withoutCurrency
    : formatter.format
}

/** Percent values use human units (12.4 → 12.4%); currency never converts the value. */
export function formatNumber(
  value: number | null | undefined,
  options: NumberFormatOptions = {},
): string {
  // Missing values keep their placeholder even when no valid formatter can be constructed.
  if (value == null || !Number.isFinite(value)) return '—'
  return createNumberFormatter(options)(value)
}

export function formatDate(value: string | Date, options: DateFormatOptions = {}) {
  const { locale = 'en-US', ...dateOptions } = options
  const defaults =
    dateOptions.dateStyle || dateOptions.timeStyle
      ? {}
      : { month: 'short' as const, day: 'numeric' as const }
  const intlOptions = { ...defaults, timeZone: 'UTC', ...dateOptions }
  // Equivalent option objects share a formatter regardless of caller property order.
  const entries = Object.keys(intlOptions)
    .sort()
    .flatMap((key) => {
      const value = intlOptions[key as keyof typeof intlOptions]
      return value === undefined ? [] : [[key, value]]
    })
  const key = serializeOptions([locale, entries])
  const formatter =
    dateFormatters.get(key) ??
    cacheFormatter(dateFormatters, key, new Intl.DateTimeFormat(locale, intlOptions))
  return formatter.format(new Date(value))
}

export function formatRelativeTime(value: string, now = new Date(), locale = 'en-US') {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000)
  const formatter =
    relativeTimeFormatters.get(locale) ??
    cacheFormatter(
      relativeTimeFormatters,
      locale,
      new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
    )
  if (Math.abs(seconds) < 60) return locale === 'ko-KR' ? '방금 전' : 'Just now'
  if (Math.abs(seconds) < 3600) return formatter.format(Math.round(seconds / 60), 'minute')
  if (Math.abs(seconds) < 86400) return formatter.format(Math.round(seconds / 3600), 'hour')
  return formatter.format(Math.round(seconds / 86400), 'day')
}
