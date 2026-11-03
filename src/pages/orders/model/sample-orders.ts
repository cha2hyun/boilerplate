import type { SampleOrder } from '@/entities/order'

export function orderSubtotal(order: SampleOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

export function orderTotal(order: SampleOrder) {
  return orderSubtotal(order) + order.shipping
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatOrderAmount(cents: number) {
  return currencyFormatter.format(cents / 100)
}

export function formatOrderDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}

export const orderSortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Total: high to low' },
  { value: 'lowest', label: 'Total: low to high' },
] as const

export type OrderSort = (typeof orderSortOptions)[number]['value']

export function compareOrders(left: SampleOrder, right: SampleOrder, sort: OrderSort) {
  if (sort === 'highest') return orderTotal(right) - orderTotal(left)
  if (sort === 'lowest') return orderTotal(left) - orderTotal(right)
  const result = left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
  return sort === 'oldest' ? result : -result
}
