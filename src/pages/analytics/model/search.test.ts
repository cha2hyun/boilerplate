import { describe, expect, it } from 'vitest'
import { analyticsSearchDefaults, analyticsSearchSchema } from './search'

describe('analytics search state', () => {
  it('defaults omitted parameters and excludes unrelated URL state', () => {
    expect(analyticsSearchSchema.parse({})).toEqual(analyticsSearchDefaults)
    expect(analyticsSearchSchema.parse({ period: '14', selected: 'visitors' })).toEqual({
      period: '14',
    })
  })

  it.each(['7', '14', '30', 7, 14, 30])('accepts the supported URL period %s', (period) => {
    expect(analyticsSearchSchema.parse({ period })).toEqual({ period: String(period) })
  })

  it.each(['90', '', 0, -7, 7.5, true, null, ['7'], { days: 7 }])(
    'recovers from an unsupported or malformed period: %j',
    (period) => {
      expect(analyticsSearchSchema.parse({ period })).toEqual(analyticsSearchDefaults)
    },
  )
})
