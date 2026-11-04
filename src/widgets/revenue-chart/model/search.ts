import { z } from 'zod'

export const revenueChartSearchSchema = z.object({
  period: z
    .union([z.enum(['7', '14', '30']), z.literal(7), z.literal(14), z.literal(30)])
    .transform((value) => String(value) as '7' | '14' | '30')
    .default('30')
    .catch('30'),
})

export const revenueChartSearchDefaults = revenueChartSearchSchema.parse({})
export type RevenueChartSearch = z.infer<typeof revenueChartSearchSchema>
