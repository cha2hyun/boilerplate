import { describe, expect, it } from 'vitest'
import { sampleOrders } from '../api/seed'
import {
  orderHistoryEntrySchema,
  orderInputSchema,
  orderLimits,
  orderSchema,
  ordersSchema,
  orderListParamsSchema,
  orderPageSchema,
  orderSummarySchema,
} from './schema'

const input = orderInputSchema.parse(sampleOrders[0])

describe('order validation boundaries', () => {
  it('defaults missing legacy history to empty without accepting fabricated or malformed events', () => {
    const { history, ...legacy } = orderSchema.parse(sampleOrders[0])
    expect(history).toEqual([])
    expect(orderSchema.parse(legacy).history).toEqual([])
    const valid = {
      field: 'status',
      occurredAt: '2026-11-05T10:00:00+09:00',
      from: 'Processing',
      to: 'Shipped',
    }
    expect(orderHistoryEntrySchema.parse(valid)).toEqual(valid)
    expect(orderInputSchema.parse({ ...input, history: [valid] })).not.toHaveProperty('history')
    for (const invalid of [
      { ...valid, from: 'Paid' },
      { ...valid, to: 'Processing' },
      { ...valid, occurredAt: 'yesterday' },
      { ...valid, field: 'payment', from: 'Pending', to: 'Shipped' },
    ])
      expect(orderHistoryEntrySchema.safeParse(invalid).success).toBe(false)
    expect(
      orderSchema.safeParse({
        ...legacy,
        history: Array.from({ length: orderLimits.history + 1 }, () => valid),
      }).success,
    ).toBe(false)
  })

  it('rejects repeated identities without rejecting a valid empty or distinct list', () => {
    const order = orderSchema.parse(sampleOrders[0])
    expect(ordersSchema.safeParse([order, { ...order, city: 'Different city' }]).success).toBe(
      false,
    )
    expect(ordersSchema.parse([])).toEqual([])
    expect(ordersSchema.parse([order, { ...order, id: 'unique-order' }])).toHaveLength(2)
  })

  it('strips server-owned fields and trims submitted text', () => {
    expect(orderInputSchema.parse({ ...sampleOrders[0], city: ' Seoul ' })).toEqual({
      ...input,
      city: 'Seoul',
    })
    expect(input.customer).not.toHaveProperty('initials')
    expect(input).not.toHaveProperty('id')
  })

  it.each([Number.NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER, orderLimits.money + 1])(
    'rejects invalid cent amounts: %s',
    (amount) => {
      expect(orderInputSchema.safeParse({ ...input, shipping: amount }).success).toBe(false)
      expect(
        orderInputSchema.safeParse({
          ...input,
          items: [{ name: 'Item', quantity: 1, unitPrice: amount }],
        }).success,
      ).toBe(false)
    },
  )

  it.each([0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER, orderLimits.quantity + 1])(
    'rejects invalid quantities: %s',
    (quantity) => {
      expect(
        orderInputSchema.safeParse({
          ...input,
          items: [{ name: 'Item', quantity, unitPrice: 100 }],
        }).success,
      ).toBe(false)
    },
  )

  it('requires one to fifty items and keeps the greatest supported total safe', () => {
    expect(orderInputSchema.safeParse({ ...input, items: [] }).success).toBe(false)
    const items = Array.from({ length: orderLimits.items }, () => ({
      name: 'Item',
      quantity: orderLimits.quantity,
      unitPrice: orderLimits.money,
    }))
    const maximum = orderInputSchema.parse({ ...input, items, shipping: orderLimits.money })
    expect(
      Number.isSafeInteger(
        maximum.shipping +
          maximum.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      ),
    ).toBe(true)
    expect(orderInputSchema.safeParse({ ...input, items: [...items, items[0]] }).success).toBe(
      false,
    )
  })

  it('rejects incomplete records, impossible dates, and unknown status values', () => {
    for (const changed of [
      { customer: { name: ' ', email: 'invalid' } },
      { date: '2026-02-30' },
      { status: 'Unknown' },
      { payment: 'Unknown' },
      { city: ' ' },
      { country: ' ' },
    ])
      expect(orderInputSchema.safeParse({ ...input, ...changed }).success).toBe(false)
  })

  it('retains long server content without silently applying editor length limits', () => {
    const customer = { ...sampleOrders[0]?.customer, name: 'Long customer '.repeat(30) }
    expect(orderSchema.parse({ ...sampleOrders[0], customer }).customer.name).toBe(customer.name)
    expect(orderInputSchema.safeParse({ ...input, customer }).success).toBe(false)
  })
})

it('rejects invalid server page metadata, duplicate records and mismatched summary counts', () => {
  const page = { items: sampleOrders.slice(0, 6), total: 12, page: 1, pageSize: 6 }
  expect(orderPageSchema.parse(page)).toEqual(page)
  for (const invalid of [
    { ...page, total: -1 },
    { ...page, page: 3 },
    { ...page, pageSize: 7 },
    { ...page, items: [] },
    { ...page, items: Array(6).fill(sampleOrders[0]) },
    { ...page, pageSize: undefined },
  ])
    expect(orderPageSchema.safeParse(invalid).success).toBe(false)
  for (const invalid of [
    { page: 0 },
    { page: '2' },
    { pageSize: 500 },
    { sort: 'unknown' },
    { q: 'x'.repeat(201) },
  ])
    expect(orderListParamsSchema.safeParse(invalid).success).toBe(false)
  expect(
    orderSummarySchema.safeParse({
      total: 4,
      counts: { Processing: 1, Shipped: 1, Delivered: 1, Cancelled: 0 },
    }).success,
  ).toBe(false)
})
