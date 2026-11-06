import type { OrderPage } from '@/entities/order'

/** Derive controls only; the server owns filtering, sorting and pagination. */
export function selectOrders(result: OrderPage | undefined) {
  return {
    total: result?.total ?? 0,
    pageCount: Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 6))),
    currentPage: (result?.page ?? 1) - 1,
    visible: result?.items ?? [],
  }
}
