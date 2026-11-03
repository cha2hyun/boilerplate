import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import { trafficSchema, type TrafficPeriod } from '../model/schema'

export const trafficKeys = {
  all: ['traffic'] as const,
  summaries: () => [...trafficKeys.all, 'summary'] as const,
  summary: (period: TrafficPeriod) => [...trafficKeys.summaries(), { period }] as const,
}

export function trafficQueryOptions(period: TrafficPeriod) {
  return queryOptions({
    queryKey: trafficKeys.summary(period),
    queryFn: ({ signal }) => apiClient(`/traffic?period=${period}`, trafficSchema, { signal }),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
