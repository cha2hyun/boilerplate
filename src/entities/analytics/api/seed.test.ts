import { describe, expect, it } from 'vitest'
import { analyticsSchema } from '../model/schema'
import { demoAnalytics } from './seed'

describe('analytics fixture', () => {
  it('has a revenue KPI consistent with the daily chart and its comparison period', () => {
    const data = analyticsSchema.parse(demoAnalytics)
    const revenue = data.kpis.find((kpi) => kpi.id === 'revenue')
    const total = data.revenue.reduce((sum, day) => sum + day.revenue, 0)
    const previous = data.revenue.reduce((sum, day) => sum + day.previousRevenue, 0)
    expect(revenue?.value).toBe(total)
    expect(revenue?.change).toBe(Math.round(((total - previous) / previous) * 1000) / 10)
    expect(new Set(data.revenue.map((day) => day.date)).size).toBe(30)
  })

  it('rejects impossible calendar dates before they reach chart formatting', () => {
    expect(
      analyticsSchema.safeParse({
        ...demoAnalytics,
        revenue: [{ date: '2026-02-30', revenue: 100, previousRevenue: 90 }],
      }).success,
    ).toBe(false)
  })
})
