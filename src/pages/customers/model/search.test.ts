import { describe, expect, it } from 'vitest'
import { customersSearchDefaults, customersSearchSchema } from './search'

describe('customers URL search', () => {
  it('provides defaults for a bare route and strips unknown fields', () => {
    expect(customersSearchSchema.parse({ unexpected: 'value' })).toEqual({
      q: '',
      status: 'all',
      sort: 'newest',
      page: 1,
    })
  })

  it('restores a valid filter, sort and one-based page', () => {
    const search = { q: 'Canada', status: 'Inactive', sort: 'name', page: 2 }
    expect(customersSearchSchema.parse(search)).toEqual(search)
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
