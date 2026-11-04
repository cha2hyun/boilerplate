import { z } from 'zod'
import { searchTextSchema } from '@/shared/lib/search-params'

export const inboxSearchDefaults = { view: 'all', q: '' } as const

export const inboxSearchSchema = z.object({
  view: z
    .enum(['all', 'unread', 'archived'])
    .catch(inboxSearchDefaults.view)
    .default(inboxSearchDefaults.view),
  q: searchTextSchema,
})

export type InboxSearch = z.infer<typeof inboxSearchSchema>
