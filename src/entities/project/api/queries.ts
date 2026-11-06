import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api'
import { env } from '@/shared/config'
import { storageKeys } from '@/shared/config/product'
import { markDemoStorageUnavailable } from '@/shared/lib/demo-storage-status'
import type { Project, ProjectInput } from '../model/schema'
import { createDemoProjectAdapter } from './demo'
import { httpProjectAdapter } from './http'

const adapter =
  env.dataSource === 'demo'
    ? createDemoProjectAdapter({
        onStorageUnavailable: () => {
          markDemoStorageUnavailable(storageKeys.demoProjects)
        },
      })
    : httpProjectAdapter
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
}

export function projectsQueryOptions() {
  return queryOptions({
    queryKey: projectKeys.lists(),
    queryFn: ({ signal }) => adapter.list(signal),
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

async function reconcileUncertainMutation(error: Error, queryClient: QueryClient) {
  if (!(error instanceof ApiError) || !error.mayHaveSucceeded) return
  await queryClient.cancelQueries({ queryKey: projectKeys.all })
  await queryClient.invalidateQueries({ queryKey: projectKeys.all })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (input: ProjectInput) => adapter.create(input),
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (project) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all })
      queryClient.setQueryData<Project[]>(projectKeys.lists(), (current) =>
        current ? [project, ...current.filter((item) => item.id !== project.id)] : undefined,
      )
      return queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: ({ id, input }: { id: string; input: ProjectInput }) => adapter.update(id, input),
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (updated) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all })
      queryClient.setQueryData<Project[]>(projectKeys.lists(), (current) =>
        current?.map((project) => (project.id === updated.id ? updated : project)),
      )
      return queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (id: string) => adapter.delete(id),
    onError: (error) => reconcileUncertainMutation(error, queryClient),
    onSuccess: async (_result, id) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all })
      queryClient.setQueryData<Project[]>(projectKeys.lists(), (current) =>
        current?.filter((project) => project.id !== id),
      )
      return queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}
