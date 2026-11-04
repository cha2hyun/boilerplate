import type { SampleOrder } from '@/entities/order'

export function orderSubtotal(order: SampleOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

export function orderTotal(order: SampleOrder) {
  return orderSubtotal(order) + order.shipping
}

export const orderSortOptions = [
  { value: 'newest' },
  { value: 'oldest' },
  { value: 'highest' },
  { value: 'lowest' },
] as const

export type OrderSort = (typeof orderSortOptions)[number]['value']

export function compareOrders(left: SampleOrder, right: SampleOrder, sort: OrderSort) {
  if (sort === 'highest') return orderTotal(right) - orderTotal(left)
  if (sort === 'lowest') return orderTotal(left) - orderTotal(right)
  const result = left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
  return sort === 'oldest' ? result : -result
}
