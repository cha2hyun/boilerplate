import { z } from 'zod'
import { trafficPeriodSchema } from '@/entities/traffic'

export const analyticsSearchDefaults = { period: '30' } as const

export const analyticsSearchSchema = z.object({
  period: z
    .preprocess((value) => (typeof value === 'number' ? String(value) : value), trafficPeriodSchema)
    .catch(analyticsSearchDefaults.period)
    .default(analyticsSearchDefaults.period),
})

export type AnalyticsSearch = z.infer<typeof analyticsSearchSchema>
