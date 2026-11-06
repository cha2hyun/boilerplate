import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
import type { WorkspaceUser, WorkspaceUserInvite, WorkspaceUserUpdate } from '../model/schema'
import { httpWorkspaceUserAdapter } from './http'

export const workspaceUserKeys = {
  all: ['workspace-users'] as const,
  list: () => [...workspaceUserKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceUserKeys.all, 'detail', id] as const,
}

export function workspaceUsersQueryOptions() {
  return queryOptions({
    queryKey: workspaceUserKeys.list(),
    queryFn: ({ signal }) => httpWorkspaceUserAdapter.list(signal),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
export function workspaceUserQueryOptions(id: string) {
  return queryOptions({
    queryKey: workspaceUserKeys.detail(id),
    queryFn: async ({ signal }) => {
      try {
        return await httpWorkspaceUserAdapter.detail(id, signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
    enabled: id.length > 0,
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

async function reconcileUncertain(error: Error, client: QueryClient) {
  if (!(error instanceof ApiError && error.mayHaveSucceeded)) return
  await client.cancelQueries({ queryKey: workspaceUserKeys.all })
  await client.invalidateQueries({ queryKey: workspaceUserKeys.all })
}

async function reconcileConfirmed(client: QueryClient, user: WorkspaceUser, invited: boolean) {
  await client.cancelQueries({ queryKey: workspaceUserKeys.all })
  client.setQueryData(workspaceUserKeys.detail(user.id), user)
  client.setQueryData<WorkspaceUser[]>(workspaceUserKeys.list(), (users) => {
    if (!users) return undefined
    if (invited) return [user, ...users.filter(({ id }) => id !== user.id)]
    return users.map((existing) => (existing.id === user.id ? user : existing))
  })
  await client.invalidateQueries({ queryKey: workspaceUserKeys.all })
}

export function useInviteWorkspaceUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: WorkspaceUserInvite) => httpWorkspaceUserAdapter.invite(input),
    retry: false,
    onError: (error) => reconcileUncertain(error, client),
    onSuccess: (user) => reconcileConfirmed(client, user, true),
  })
}
export function useUpdateWorkspaceUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WorkspaceUserUpdate }) =>
      httpWorkspaceUserAdapter.update(id, input),
    retry: false,
    onError: (error) => reconcileUncertain(error, client),
    onSuccess: (user) => reconcileConfirmed(client, user, false),
  })
}
