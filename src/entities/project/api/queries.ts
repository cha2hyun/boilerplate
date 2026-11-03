import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/shared/config'
import type { Project, ProjectInput } from '../model/schema'
import { createDemoProjectAdapter } from './demo'
import { httpProjectAdapter } from './http'

const adapter = env.dataSource === 'demo' ? createDemoProjectAdapter() : httpProjectAdapter
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

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectInput) => adapter.create(input),
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
    mutationFn: ({ id, input }: { id: string; input: ProjectInput }) => adapter.update(id, input),
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
    mutationFn: (id: string) => adapter.delete(id),
    onSuccess: async (_result, id) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all })
      queryClient.setQueryData<Project[]>(projectKeys.lists(), (current) =>
        current?.filter((project) => project.id !== id),
      )
      return queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}
