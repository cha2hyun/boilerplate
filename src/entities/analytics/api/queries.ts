import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { analyticsSchema } from '../model/schema'

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
}

export function analyticsQueryOptions() {
  return queryOptions({
    queryKey: analyticsKeys.summary(),
    queryFn: ({ signal }) => apiClient('/analytics', analyticsSchema, { signal }),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
