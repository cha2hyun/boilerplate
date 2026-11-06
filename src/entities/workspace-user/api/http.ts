import { ApiError, apiClient } from '@/shared/api'
import {
  workspaceUserIdSchema,
  workspaceUserInviteSchema,
  workspaceUserSchema,
  workspaceUsersSchema,
  workspaceUserUpdateSchema,
} from '../model/schema'
import type { WorkspaceUserAdapter } from './types'

const collection = '/workspace-users'
function memberPath(id: string) {
  if (!workspaceUserIdSchema.safeParse(id).success)
    throw new ApiError('Invalid workspace user ID.', 'HTTP_ERROR', 400)
  return `${collection}/${encodeURIComponent(id)}`
}
const matchingUser = (id: string) =>
  workspaceUserSchema.refine((user) => user.id === id, { message: 'Unexpected workspace user ID.' })

export const httpWorkspaceUserAdapter: WorkspaceUserAdapter = {
  list: (signal) => apiClient(collection, workspaceUsersSchema, { signal }),
  async detail(id, signal) {
    return apiClient(memberPath(id), matchingUser(id), { signal })
  },
  async invite(input, signal) {
    const body = workspaceUserInviteSchema.parse(input)
    const invited = workspaceUserSchema.refine(
      (user) => user.status === 'invited' && user.email === body.email && user.role === body.role,
      { message: 'Unexpected invitation result.' },
    )
    return apiClient(collection, invited, { method: 'POST', body, signal })
  },
  async update(id, input, signal) {
    return apiClient(memberPath(id), matchingUser(id), {
      method: 'PATCH',
      body: workspaceUserUpdateSchema.parse(input),
      signal,
    })
  },
}
