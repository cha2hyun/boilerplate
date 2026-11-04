import type { z } from 'zod'
import { projectTableSearchSchema } from '@/widgets/project-table'
import { revenueChartSearchSchema } from '@/widgets/revenue-chart'

export const overviewSearchSchema = projectTableSearchSchema
  .pick({ sort: true, order: true })
  .extend(revenueChartSearchSchema.shape)

export const overviewSearchDefaults = overviewSearchSchema.parse({})
export type OverviewSearch = z.infer<typeof overviewSearchSchema>
