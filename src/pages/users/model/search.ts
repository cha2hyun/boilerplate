import { z } from 'zod'
import { workspaceUserIdSchema, workspaceUserStatuses } from '@/entities/workspace-user'
import { searchTextSchema } from '@/shared/lib/search-params'

export const usersSearchSchema = z.object({
  q: searchTextSchema,
  status: z
    .enum(['all', ...workspaceUserStatuses])
    .catch('all')
    .default('all'),
  id: searchTextSchema
    .transform((value) => value.trim())
    .pipe(z.union([z.literal(''), workspaceUserIdSchema]))
    .catch(''),
})

export type UsersSearch = z.infer<typeof usersSearchSchema>
export const usersSearchDefaults = usersSearchSchema.parse({})
