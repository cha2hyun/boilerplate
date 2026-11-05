import { describe, expect, it } from 'vitest'
import { sampleOrders } from '@/entities/order'
import { ordersSearchDefaults } from './search'
import { selectOrders } from './selectors'

describe('orders list selection', () => {
  it('paginates a larger page while leaving cached source order untouched', () => {
    const source = sampleOrders.map((record) => ({ ...record }))
    const originalIds = source.map((record) => record.id)
    const result = selectOrders(source, { ...ordersSearchDefaults, pageSize: 12, sort: 'highest' })
    expect(result.visible).toHaveLength(12)
    expect(result.pageCount).toBe(1)
    expect(source.map((record) => record.id)).toEqual(originalIds)
    expect(selectOrders(source, { ...ordersSearchDefaults, page: 2 }).visible).toHaveLength(6)
  })

  it('clamps a removed final page and keeps detail selection independent of filters', () => {
    const result = selectOrders(sampleOrders, {
      ...ordersSearchDefaults,
      q: 'olivia@example.com',
      page: 99,
    })
    expect(result.visible).toHaveLength(1)
    expect(result.pageCount).toBe(1)
    expect(result.currentPage).toBe(0)
    expect(selectOrders([], { ...ordersSearchDefaults, page: 99 })).toEqual({
      filtered: [],
      visible: [],
      pageCount: 1,
      currentPage: 0,
    })
  })
})

it('sorts and pages ten thousand orders by exact totals without mutating the source', () => {
  const template = sampleOrders[0]
  if (!template) throw new Error('The sample order fixture is missing.')
  const orders = Array.from({ length: 10_000 }, (_, index) => ({
    ...template,
    id: `scale-${String(index)}`,
    shipping: 0,
    items: [{ name: 'Item', quantity: 1, unitPrice: index + 1 }],
  }))
  const selected = selectOrders(orders, {
    ...ordersSearchDefaults,
    sort: 'highest',
    page: 2,
    pageSize: 24,
  })
  expect(selected.filtered).toHaveLength(10_000)
  expect(selected.visible).toHaveLength(24)
  expect(selected.visible[0]?.items[0]?.unitPrice).toBe(9_976)
  expect(selected.visible.at(-1)?.items[0]?.unitPrice).toBe(9_953)
  expect(orders[0]?.id).toBe('scale-0')
})
