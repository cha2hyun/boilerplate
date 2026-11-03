export function formatCurrency(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    ...options,
  }).format(value)
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat('en-US', options).format(value)
}

/** Accepts percentages in human units: 12.4 becomes 12.4%. */
export function formatPercent(value: number, fractionDigits = 1) {
  return `${formatNumber(value, { maximumFractionDigits: fractionDigits })}%`
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
