import { z } from 'zod'
import { searchPageSchema, searchTextSchema } from '@/shared/lib/search-params'

export const projectTableSearchSchema = z.object({
  q: searchTextSchema,
  status: z.enum(['all', 'active', 'paused', 'archived']).default('all').catch('all'),
  sort: z.enum(['name', 'progress', 'updatedAt']).default('updatedAt').catch('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc').catch('desc'),
  page: searchPageSchema,
  pageSize: z
    .union([
      z.literal(8),
      z.literal(16),
      z.literal(32),
      z.literal('8'),
      z.literal('16'),
      z.literal('32'),
    ])
    .transform((value) => Number(value) as 8 | 16 | 32)
    .default(8)
    .catch(8),
})

export const projectTableSearchDefaults = projectTableSearchSchema.parse({})
export type ProjectTableSearch = z.infer<typeof projectTableSearchSchema>
