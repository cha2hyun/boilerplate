import { z } from 'zod'
import { apiClient } from '@/shared/api'
import { orderInputSchema, orderSchema, ordersSchema } from '../model/schema'
import type { OrderAdapter } from './types'

export const httpOrderAdapter: OrderAdapter = {
  list: (signal) => apiClient('/orders', ordersSchema, { signal }),
  create: (input, signal) =>
    apiClient('/orders', orderSchema, {
      method: 'POST',
      body: orderInputSchema.parse(input),
      signal,
    }),
  update: (id, input, signal) =>
    apiClient(`/orders/${encodeURIComponent(id)}`, orderSchema, {
      method: 'PATCH',
      body: orderInputSchema.parse(input),
      signal,
    }),
  async delete(id, signal) {
    await apiClient(`/orders/${encodeURIComponent(id)}`, z.null(), { method: 'DELETE', signal })
  },
}
