import type { SampleOrder } from '@/entities/order'
import { compareOrders, orderTotal } from './sample-orders'
import type { OrdersSearch } from './search'

export function selectOrders(orders: SampleOrder[], search: Omit<OrdersSearch, 'detail'>) {
  const query = search.q.trim().toLowerCase()
  const filtered = orders.filter(
    (order) =>
      (search.status === 'all' || order.status === search.status) &&
      `${order.id} ${order.customer.name} ${order.customer.email}`.toLowerCase().includes(query),
  )
  if (search.sort === 'highest' || search.sort === 'lowest') {
    // Sum each order once; comparing a large list must not rescan its line items.
    const totals = new Map(filtered.map((order) => [order, orderTotal(order)]))
    const direction = search.sort === 'highest' ? -1 : 1
    filtered.sort((left, right) => direction * ((totals.get(left) ?? 0) - (totals.get(right) ?? 0)))
  } else {
    filtered.sort((left, right) => compareOrders(left, right, search.sort))
  }
  const pageCount = Math.max(1, Math.ceil(filtered.length / search.pageSize))
  const currentPage = Math.min(search.page, pageCount) - 1
  return {
    filtered,
    pageCount,
    currentPage,
    visible: filtered.slice(currentPage * search.pageSize, (currentPage + 1) * search.pageSize),
  }
}

export function summarizeOrders(orders: SampleOrder[]) {
  return orders.reduce(
    (summary, order) => {
      summary[order.status] += 1
      return summary
    },
    { Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 },
  )
}
