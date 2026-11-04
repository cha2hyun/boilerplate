import type { Analytics } from './schema'

const DAY_MS = 24 * 60 * 60 * 1000

/** Select calendar days ending at the latest provided date, including that date. */
export function selectRecentRevenue(data: Analytics['revenue'], days: number) {
  if (data.length === 0 || !Number.isInteger(days) || days < 1) return []
  const latestDate = data.reduce(
    (latest, point) => Math.max(latest, Date.parse(point.date)),
    -Infinity,
  )
  const firstDate = latestDate - (days - 1) * DAY_MS
  return data
    .filter((point) => Date.parse(point.date) >= firstDate)
    .toSorted((left, right) => left.date.localeCompare(right.date))
}
