import { z } from 'zod'
import { orderStatuses } from '@/entities/order'
import { searchPageSchema, searchTextSchema } from '@/shared/lib/search-params'
import { orderSortOptions } from './sample-orders'

export const ordersSearchSchema = z.object({
  q: searchTextSchema,
  status: z
    .enum(['all', ...orderStatuses])
    .default('all')
    .catch('all'),
  sort: z
    .enum(orderSortOptions.map((option) => option.value))
    .default('newest')
    .catch('newest'),
  page: searchPageSchema,
})

export type OrdersSearch = z.infer<typeof ordersSearchSchema>
export const ordersSearchDefaults = ordersSearchSchema.parse({})
