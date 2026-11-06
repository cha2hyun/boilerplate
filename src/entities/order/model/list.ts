import type { OrderListParams, OrderPage, OrderSummary, SampleOrder } from './schema'

export function orderSubtotal(order: SampleOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}
export function orderTotal(order: SampleOrder) {
  return orderSubtotal(order) + order.shipping
}

/** Demo server implementation. API mode performs this work on the real server. */
export function pageOrders(orders: SampleOrder[], params: OrderListParams): OrderPage {
  const query = params.q.trim().toLowerCase()
  const filtered = orders.filter(
    (order) =>
      (params.status === 'all' || order.status === params.status) &&
      `${order.id} ${order.customer.name} ${order.customer.email}`.toLowerCase().includes(query),
  )
  if (params.sort === 'highest' || params.sort === 'lowest') {
    const totals = new Map(filtered.map((order) => [order, orderTotal(order)]))
    const direction = params.sort === 'highest' ? -1 : 1
    filtered.sort(
      (left, right) =>
        direction * ((totals.get(left) ?? 0) - (totals.get(right) ?? 0)) ||
        left.id.localeCompare(right.id),
    )
  } else {
    const direction = params.sort === 'oldest' ? 1 : -1
    filtered.sort(
      (left, right) =>
        direction * (left.date.localeCompare(right.date) || left.id.localeCompare(right.id)),
    )
  }
  const page = Math.min(params.page, Math.max(1, Math.ceil(filtered.length / params.pageSize)))
  return {
    items: filtered.slice((page - 1) * params.pageSize, page * params.pageSize),
    total: filtered.length,
    page,
    pageSize: params.pageSize,
  }
}

export function summarizeOrders(orders: SampleOrder[]): OrderSummary {
  const counts = { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 }
  for (const order of orders) counts[order.status] += 1
  return { total: orders.length, counts }
}
