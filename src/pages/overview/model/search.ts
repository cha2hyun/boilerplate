import type { z } from 'zod'
import { projectTableSearchSchema } from '@/widgets/project-table/search'
import { revenueChartSearchSchema } from '@/widgets/revenue-chart/search'

export const overviewSearchSchema = projectTableSearchSchema
  .pick({ sort: true, order: true, detail: true })
  .extend(revenueChartSearchSchema.shape)

export const overviewSearchDefaults = overviewSearchSchema.parse({})
export type OverviewSearch = z.infer<typeof overviewSearchSchema>
