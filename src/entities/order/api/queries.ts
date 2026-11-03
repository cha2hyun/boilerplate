import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { ordersSchema } from '../model/schema'

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
}

export function ordersQueryOptions() {
  return queryOptions({
    queryKey: orderKeys.lists(),
    queryFn: ({ signal }) => apiClient('/orders', ordersSchema, { signal }),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
