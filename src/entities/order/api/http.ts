import { z } from 'zod'
import { ApiError, apiClient } from '@/shared/api'
import {
  orderInputSchema,
  orderSchema,
  orderPageSchema,
  orderSummarySchema,
  orderListParamsSchema,
  orderListDefaults,
} from '../model/schema'
import type { OrderAdapter } from './types'

function orderPath(id: string) {
  // URL parsers remove complete dot segments even when percent encoded. Never send a
  // read or destructive request to a collection/parent instead of the requested row.
  if (!id || id === '.' || id === '..')
    throw new ApiError('Invalid order identifier.', 'HTTP_ERROR', 400)
  return `/orders/${encodeURIComponent(id)}`
}
function matchingOrder(id: string) {
  return orderSchema.refine((order) => order.id === id, {
    message: 'The order ID must match the requested record.',
  })
}

export const httpOrderAdapter: OrderAdapter = {
  list: (params = orderListDefaults, signal) => {
    const validated = orderListParamsSchema.parse(params)
    const search = new URLSearchParams(
      Object.entries(validated).map(([key, value]) => [key, String(value)]),
    )
    return apiClient(
      `/orders?${search.toString()}`,
      orderPageSchema.refine(
        (page) =>
          page.pageSize === validated.pageSize &&
          page.page ===
            Math.min(validated.page, Math.max(1, Math.ceil(page.total / validated.pageSize))),
        { message: 'The response must match the requested page size and effective page.' },
      ),
      { signal },
    )
  },
  async detail(id, signal) {
    return apiClient(orderPath(id), matchingOrder(id), { signal })
  },
  summary: (signal) => apiClient('/orders/summary/counts', orderSummarySchema, { signal }),
  create: (input, signal) =>
    apiClient('/orders', orderSchema, {
      method: 'POST',
      body: orderInputSchema.parse(input),
      signal,
    }),
  async update(id, input, revision, signal) {
    const path = orderPath(id)
    if (revision === undefined || !Number.isSafeInteger(revision) || revision < 1)
      throw new ApiError('A valid order revision is required.', 'HTTP_ERROR', 428)
    return apiClient(
      path,
      matchingOrder(id).refine(
        (order) => order.revision !== undefined && order.revision > revision,
        {
          message: 'The conditional update must return a newer revision.',
        },
      ),
      {
        headers: { 'If-Match': `"${String(revision)}"` },
        method: 'PATCH',
        body: orderInputSchema.parse(input),
        signal,
      },
    )
  },
  async delete(id, signal) {
    await apiClient(orderPath(id), z.null(), { method: 'DELETE', signal })
  },
}
