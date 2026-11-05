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

export type OrdersSearch = z.infer<typeof ordersSearchSchema>
export const ordersSearchDefaults = ordersSearchSchema.parse({})
