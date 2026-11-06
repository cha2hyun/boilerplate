import { describe, expect, it } from 'vitest'
import { sampleOrders } from '@/entities/order'
import { selectOrders } from './selectors'

describe('server order page presentation', () => {
  it('uses authoritative total and effective page without filtering or sorting returned items', () => {
    const items = sampleOrders.slice(0, 2).toReversed()
    expect(selectOrders({ items, total: 14, page: 3, pageSize: 6 })).toEqual({
      total: 14,
      pageCount: 3,
      currentPage: 2,
      visible: items,
    })
  })
  it('does not invent records or a zero-page result before loading', () => {
    expect(selectOrders(undefined)).toEqual({ total: 0, pageCount: 1, currentPage: 0, visible: [] })
  })
})
