import { describe, expect, it } from 'vitest'
import { ordersSearchDefaults, ordersSearchSchema } from './search'

describe('orders URL search', () => {
  it('provides defaults for a bare route and strips unknown fields', () => {
    expect(ordersSearchSchema.parse({ unexpected: 'value' })).toEqual({
      q: '',
      status: 'all',
      sort: 'newest',
      page: 1,
    })
  })

  it('restores a valid filter, sort and one-based page', () => {
    const search = { q: 'Canada', status: 'Processing', sort: 'oldest', page: 2 }
    expect(ordersSearchSchema.parse(search)).toEqual(search)
  })

  it('recovers invalid fields independently without discarding valid filters', () => {
    expect(
      ordersSearchSchema.parse({ q: 'Olivia', status: ['Processing'], sort: 'unknown', page: -1 }),
    ).toEqual({ ...ordersSearchDefaults, q: 'Olivia' })
    expect(
      ordersSearchSchema.parse({
        q: { text: 'Olivia' },
        status: 'Processing',
        sort: 'oldest',
        page: 1.5,
      }),
    ).toEqual({ ...ordersSearchDefaults, status: 'Processing', sort: 'oldest' })
  })
})
