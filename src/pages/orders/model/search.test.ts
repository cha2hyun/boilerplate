import { describe, expect, it } from 'vitest'
import { ordersSearchDefaults, ordersSearchSchema } from './search'

describe('orders URL search', () => {
  it('provides defaults for a bare route and strips unknown fields', () => {
    expect(ordersSearchSchema.parse({ unexpected: 'value' })).toEqual({
      q: '',
      status: 'all',
      sort: 'newest',
      page: 1,
      pageSize: 6,
      detail: '',
    })
  })

  it('restores a valid filter, sort and one-based page', () => {
    const search = { q: 'Canada', status: 'Processing', sort: 'oldest', page: 2 }
    expect(ordersSearchSchema.parse(search)).toEqual({ ...ordersSearchDefaults, ...search })
  })

  it('restores page size and an opaque record detail without losing filters', () => {
    const input = { q: 'Olivia', page: 2, pageSize: '12', detail: 'record:42' }
    expect(ordersSearchSchema.parse(input)).toEqual({
      ...ordersSearchDefaults,
      ...input,
      pageSize: 12,
    })
    expect(ordersSearchSchema.parse({ ...input, pageSize: 999, detail: ['record:42'] })).toEqual({
      ...ordersSearchDefaults,
      q: 'Olivia',
      page: 2,
    })
    expect(ordersSearchSchema.parse({ detail: 'x'.repeat(201) }).detail).toBe('')
    expect(ordersSearchSchema.parse({ detail: 123 }).detail).toBe('123')
    expect(ordersSearchSchema.parse({ detail: '주문/42?revision=2&x=%' }).detail).toBe(
      '주문/42?revision=2&x=%',
    )
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
