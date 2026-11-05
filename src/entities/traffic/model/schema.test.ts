import { describe, expect, it } from 'vitest'
import { getSampleTraffic } from '../api/seed'
import { trafficSchema } from './schema'

describe('traffic response semantics', () => {
  it('normalizes shuffled dates without inventing missing days or changing summary visitors', () => {
    const sample = getSampleTraffic('7')
    const days = sample.days.filter((_, index) => index % 2 === 0).toReversed()
    const result = trafficSchema.parse({ ...sample, days, visitors: 1 })
    expect(result.days.map((day) => day.date)).toEqual(days.map((day) => day.date).toSorted())
    expect(result.days).toHaveLength(days.length)
    expect(result.visitors).toBe(1)
    expect(days[0]?.date).toBe(sample.days.at(-1)?.date)
  })

  it('rejects duplicate dates even when each row is independently valid', () => {
    const sample = getSampleTraffic('7')
    expect(
      trafficSchema.safeParse({ ...sample, days: [...sample.days, sample.days[0]] }).success,
    ).toBe(false)
  })

  it.each([
    { visitors: 3, sessions: 2, pageViews: 4, bounces: 0 },
    { visitors: 1, sessions: 3, pageViews: 2, bounces: 0 },
    { visitors: 1, sessions: 2, pageViews: 4, bounces: 3 },
  ])('rejects inconsistent daily counts: %j', (counts) => {
    expect(
      trafficSchema.safeParse({
        ...getSampleTraffic('7'),
        days: [{ date: '2026-11-01', ...counts }],
      }).success,
    ).toBe(false)
  })

  it.each([
    { visitors: 3, sessions: 2, pageViews: 4 },
    { visitors: 1, sessions: 3, pageViews: 2 },
  ])('rejects inconsistent summary counts: %j', (counts) => {
    expect(trafficSchema.safeParse({ ...getSampleTraffic('7'), ...counts }).success).toBe(false)
  })

  it('accepts an empty response with zero counts and every supported sample period', () => {
    expect(
      trafficSchema.parse({
        days: [],
        visitors: 0,
        sessions: 0,
        pageViews: 0,
        bounceRate: 0,
        sources: [],
        pages: [],
        devices: [],
      }).days,
    ).toEqual([])
    for (const period of ['7', '14', '30'] as const) {
      expect(trafficSchema.parse(getSampleTraffic(period)).days).toHaveLength(Number(period))
    }
  })
})
