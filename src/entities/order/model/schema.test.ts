import { describe, expect, it } from 'vitest'
import { sampleOrders } from '../api/seed'
import { orderInputSchema, orderLimits, orderSchema } from './schema'

const input = orderInputSchema.parse(sampleOrders[0])

describe('order validation boundaries', () => {
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
