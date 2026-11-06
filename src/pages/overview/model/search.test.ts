import { describe, expect, it } from 'vitest'
import { overviewSearchDefaults, overviewSearchSchema } from './search'

describe('overview URL search', () => {
  it('composes revenue period, recent project sorting, and an independently shareable detail', () => {
    expect(
      overviewSearchSchema.parse({ period: 14, sort: 'progress', order: 'asc', detail: ' abc ' }),
    ).toEqual({
      period: '14',
      sort: 'progress',
      order: 'asc',
      detail: 'abc',
    })
    for (const period of ['7', '14', '30', 7, 14, 30]) {
      expect(overviewSearchSchema.parse({ period }).period).toBe(String(period))
    }
  })

  it('rejects unsupported periods and ignores hidden project controls', () => {
    for (const period of ['90', 'invalid', 0, [], {}, true, null]) {
      expect(overviewSearchSchema.parse({ period })).toEqual(overviewSearchDefaults)
    }
    expect(
      overviewSearchSchema.parse({
        q: 'hidden',
        status: 'paused',
        page: 2,
        pageSize: 32,
        period: '7',
      }),
    ).toEqual({ ...overviewSearchDefaults, period: '7' })
  })
})
