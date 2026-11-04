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
})

export type CustomersSearch = z.infer<typeof customersSearchSchema>
export const customersSearchDefaults = customersSearchSchema.parse({})
