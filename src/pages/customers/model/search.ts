import { z } from 'zod'
import { customerStatuses } from '@/entities/customer'
import { searchPageSchema, searchTextSchema } from '@/shared/lib/search-params'
import { customerSortOptions } from './sample-customers'

export const customersSearchSchema = z.object({
  q: searchTextSchema,
  status: z
    .enum(['all', ...customerStatuses])
    .default('all')
    .catch('all'),
  sort: z
    .enum(customerSortOptions.map((option) => option.value))
    .default('newest')
    .catch('newest'),
  page: searchPageSchema,
  pageSize: z
    .union([
      z.literal(6),
      z.literal(12),
      z.literal(24),
      z.literal('6'),
      z.literal('12'),
      z.literal('24'),
    ])
    .transform((value) => Number(value) as 6 | 12 | 24)
    .default(6)
    .catch(6),
  detail: searchTextSchema.transform((value) => value.trim()),
})

export type CustomersSearch = z.infer<typeof customersSearchSchema>
export const customersSearchDefaults = customersSearchSchema.parse({})
