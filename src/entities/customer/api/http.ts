import { z } from 'zod'
import { apiClient } from '@/shared/api'
import { customerInputSchema, customerSchema, customersSchema } from '../model/schema'
import type { CustomerAdapter } from './types'

export const httpCustomerAdapter: CustomerAdapter = {
  list: (signal) => apiClient('/customers', customersSchema, { signal }),
  create: (input, signal) =>
    apiClient('/customers', customerSchema, {
      method: 'POST',
      body: customerInputSchema.parse(input),
      signal,
    }),
  update: (id, input, signal) =>
    apiClient(`/customers/${encodeURIComponent(id)}`, customerSchema, {
      method: 'PATCH',
      body: customerInputSchema.parse(input),
      signal,
    }),
  async delete(id, signal) {
    await apiClient(`/customers/${encodeURIComponent(id)}`, z.null(), {
      method: 'DELETE',
      signal,
    })
  },
}
