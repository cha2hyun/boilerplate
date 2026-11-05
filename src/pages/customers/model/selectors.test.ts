import { describe, expect, it } from 'vitest'
import { sampleCustomers } from '@/entities/customer'
import { customersSearchDefaults } from './search'
import { selectCustomers } from './selectors'

describe('customers list selection', () => {
  it('paginates a larger page while leaving cached source order untouched', () => {
    const source = sampleCustomers.map((record) => ({ ...record }))
    const originalIds = source.map((record) => record.id)
    const result = selectCustomers(source, {
      ...customersSearchDefaults,
      pageSize: 12,
      sort: 'highest',
    })
    expect(result.visible).toHaveLength(12)
    expect(result.pageCount).toBe(1)
    expect(source.map((record) => record.id)).toEqual(originalIds)
    expect(selectCustomers(source, { ...customersSearchDefaults, page: 2 }).visible).toHaveLength(6)
  })

  it('clamps a removed final page and keeps detail selection independent of filters', () => {
    const result = selectCustomers(sampleCustomers, {
      ...customersSearchDefaults,
      q: 'olivia@example.com',
      page: 99,
    })
    expect(result.visible).toHaveLength(1)
    expect(result.pageCount).toBe(1)
    expect(result.currentPage).toBe(0)
    expect(selectCustomers([], { ...customersSearchDefaults, page: 99 })).toEqual({
      filtered: [],
      visible: [],
      pageCount: 1,
      currentPage: 0,
    })
  })
})
