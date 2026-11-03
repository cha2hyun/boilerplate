import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { customersSchema } from '../model/schema'

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
}

export function customersQueryOptions() {
  return queryOptions({
    queryKey: customerKeys.lists(),
    queryFn: ({ signal }) => apiClient('/customers', customersSchema, { signal }),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
