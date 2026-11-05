import { describe, expect, it } from 'vitest'
import { customersSearchDefaults, customersSearchSchema } from './search'

describe('customers URL search', () => {
  it('provides defaults for a bare route and strips unknown fields', () => {
    expect(customersSearchSchema.parse({ unexpected: 'value' })).toEqual({
      q: '',
      status: 'all',
      sort: 'newest',
      page: 1,
      pageSize: 6,
      detail: '',
    })
  })

  it('restores a valid filter, sort and one-based page', () => {
    const search = { q: 'Canada', status: 'Inactive', sort: 'name', page: 2 }
    expect(customersSearchSchema.parse(search)).toEqual({ ...customersSearchDefaults, ...search })
  })

  it('restores page size and an opaque record detail without losing filters', () => {
    const input = { q: 'Olivia', page: 2, pageSize: '12', detail: 'record:42' }
    expect(customersSearchSchema.parse(input)).toEqual({
      ...customersSearchDefaults,
      ...input,
      pageSize: 12,
    })
    expect(customersSearchSchema.parse({ ...input, pageSize: 999, detail: ['record:42'] })).toEqual(
      { ...customersSearchDefaults, q: 'Olivia', page: 2 },
    )
    expect(customersSearchSchema.parse({ detail: 'x'.repeat(201) }).detail).toBe('')
    expect(customersSearchSchema.parse({ detail: 123 }).detail).toBe('123')
    expect(customersSearchSchema.parse({ detail: '주문/42?revision=2&x=%' }).detail).toBe(
      '주문/42?revision=2&x=%',
    )
  })

  it('recovers invalid fields independently without discarding valid filters', () => {
    expect(
      customersSearchSchema.parse({ q: 'Olivia', status: ['Inactive'], sort: 'unknown', page: -1 }),
    ).toEqual({ ...customersSearchDefaults, q: 'Olivia' })
    expect(
      customersSearchSchema.parse({
        q: { text: 'Olivia' },
        status: 'Inactive',
        sort: 'name',
        page: 1.5,
      }),
    ).toEqual({ ...customersSearchDefaults, status: 'Inactive', sort: 'name' })
  })
})
