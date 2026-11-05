import { describe, expect, it } from 'vitest'
import { orderSchema, sampleOrders } from '@/entities/order'
import { initialOrderForm, parseOrderForm } from './form'

const order = orderSchema.parse(sampleOrders[0])
const input = initialOrderForm(order)

describe('order form money conversion', () => {
  it('converts decimal USD text to exact integer cents without binary rounding', () => {
    const parsed = parseOrderForm({
      ...input,
      shipping: '0.29',
      items: [{ name: 'Item', quantity: '3', unitPrice: '10.25' }],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) throw parsed.error
    expect(parsed.data.shipping).toBe(29)
    expect(parsed.data.items[0]).toMatchObject({ quantity: 3, unitPrice: 1025 })
    expect(initialOrderForm({ ...order, shipping: 29 }).shipping).toBe('0.29')
  })

  it.each(['', ' ', '-1', 'NaN', 'Infinity', '1e2', '1.001', '1,000', '1000000.01'])(
    'rejects invalid or excessive money %j',
    (value) => {
      expect(parseOrderForm({ ...input, shipping: value }).success).toBe(false)
      expect(
        parseOrderForm({ ...input, items: [{ name: 'Item', quantity: '1', unitPrice: value }] })
          .success,
      ).toBe(false)
    },
  )

  it.each(['', ' ', '0', '-1', '1.5', '1e2', '10001', 'Infinity'])(
    'rejects invalid quantities %j',
    (quantity) => {
      expect(
        parseOrderForm({ ...input, items: [{ name: 'Item', quantity, unitPrice: '1.00' }] })
          .success,
      ).toBe(false)
    },
  )

  it('accepts explicit zero amounts and common decimal input', () => {
    const parsed = parseOrderForm({
      ...input,
      shipping: '0',
      items: [{ name: 'Item', quantity: '1', unitPrice: '.50' }],
    })
    expect(parsed.success && parsed.data.items[0]?.unitPrice).toBe(50)
  })
})
