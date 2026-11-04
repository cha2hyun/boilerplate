import { describe, expect, it } from 'vitest'
import { analyticsSchema } from './schema'
import { selectRecentRevenue } from './revenue'

const point = (date: string, revenue = 1) => ({ date, revenue, previousRevenue: 0 })

describe('daily revenue contract', () => {
  it('normalizes unordered responses and selects dates within the final provided seven days', () => {
    const revenue = [
      point('2026-11-03', 30),
      point('2026-10-27', 270),
      point('2026-10-28', 280),
      point('2026-10-30', 300),
      point('2026-10-01', 100),
    ]
    const data = analyticsSchema.parse({ kpis: [], revenue, activity: [] })
    expect(data.revenue.map((day) => day.date)).toEqual([
      '2026-10-01',
      '2026-10-27',
      '2026-10-28',
      '2026-10-30',
      '2026-11-03',
    ])
    const selected = selectRecentRevenue(data.revenue, 7)
    expect(selected.map((day) => day.date)).toEqual(['2026-10-28', '2026-10-30', '2026-11-03'])
    expect(selected.reduce((sum, day) => sum + day.revenue, 0)).toBe(610)
    expect(selectRecentRevenue(data.revenue, 1)).toEqual([point('2026-11-03', 30)])
    expect(revenue[0]?.date).toBe('2026-11-03')
  })

  it('rejects duplicate calendar dates rather than double-counting revenue', () => {
    expect(
      analyticsSchema.safeParse({
        kpis: [],
        revenue: [point('2026-11-03', 30), point('2026-11-03', 40)],
        activity: [],
      }).success,
    ).toBe(false)
  })

  it('handles empty data and UTC calendar boundaries independently of the current date', () => {
    expect(selectRecentRevenue([], 7)).toEqual([])
    expect(
      selectRecentRevenue(
        [point('2024-03-02'), point('2024-02-29'), point('2024-02-28'), point('2024-03-01')],
        3,
      ).map((day) => day.date),
    ).toEqual(['2024-02-29', '2024-03-01', '2024-03-02'])
  })
})
