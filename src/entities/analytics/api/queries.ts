import { queryOptions } from '@tanstack/react-query'
import { apiClient, delay } from '@/shared/api'
import { env } from '@/shared/config'
import { analyticsSchema } from '../model/schema'
import { demoAnalytics } from './seed'

export function analyticsQueryOptions() {
  return queryOptions({
    queryKey: ['analytics'] as const,
    queryFn: async ({ signal }) => {
      if (env.dataSource === 'api') {
        return apiClient('/analytics', analyticsSchema, { signal })
      }
      await delay(350, signal)
      return analyticsSchema.parse(demoAnalytics)
    },
    staleTime: 60_000,
  })
}
