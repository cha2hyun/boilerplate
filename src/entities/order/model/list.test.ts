import { describe, expect, it } from 'vitest'
import { sampleOrders } from '../api/seed'
import { orderListDefaults, orderPageSchema, orderSummarySchema } from './schema'
import { pageOrders, summarizeOrders } from './list'

describe('demo server order paging', () => {
  it('combines search and status, clamps a deleted final page and preserves source order', () => {
    const ids = sampleOrders.map((order) => order.id)
    const page = pageOrders(sampleOrders, {
      ...orderListDefaults,
      q: 'OLIVIA@EXAMPLE.COM',
      status: 'Processing',
      page: 99,
    })
    expect(page).toMatchObject({ total: 1, page: 1, pageSize: 6 })
    expect(page.items.map((order) => order.id)).toEqual(['ORD-1042'])
    expect(orderPageSchema.parse(page)).toEqual(page)
    expect(sampleOrders.map((order) => order.id)).toEqual(ids)
    expect(pageOrders([], { ...orderListDefaults, page: 99 })).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 6,
    })
  })
  it('sorts ten thousand orders by exact totals and returns only the requested page', () => {
    const template = sampleOrders[0]
    if (!template) throw new Error('Missing order fixture')
    const orders = Array.from({ length: 10_000 }, (_, index) => ({
      ...template,
      id: `scale-${String(index)}`,
      shipping: 0,
      items: [{ name: 'Item', quantity: 1, unitPrice: index + 1 }],
    }))
    const selected = pageOrders(orders, {
      ...orderListDefaults,
      sort: 'highest',
      page: 2,
      pageSize: 24,
    })
    expect(selected.total).toBe(10_000)
    expect(selected.items).toHaveLength(24)
    expect(selected.items[0]?.items[0]?.unitPrice).toBe(9_976)
    expect(selected.items.at(-1)?.items[0]?.unitPrice).toBe(9_953)
    expect(orders[0]?.id).toBe('scale-0')
  })
  it('uses the complete stored collection for summary independently of list filters', () => {
    const summary = summarizeOrders(sampleOrders)
    expect(orderSummarySchema.parse(summary).total).toBe(12)
    expect(Object.values(summary.counts).reduce((sum, count) => sum + count, 0)).toBe(12)
  })
})
