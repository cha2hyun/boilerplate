// @vitest-environment jsdom
import type { PropsWithChildren } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  projectKeys,
  projectsQueryOptions,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from './queries'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('project query integration', () => {
  it('keeps an active query synchronized through create, update and delete', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    function Wrapper({ children }: PropsWithChildren) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
    const { result } = renderHook(
      () => ({
        projects: useQuery(projectsQueryOptions()),
        create: useCreateProject(),
        update: useUpdateProject(),
        remove: useDeleteProject(),
      }),
      { wrapper: Wrapper },
    )

    await waitFor(() => {
      expect(result.current.projects.isSuccess).toBe(true)
    })
    const initialProjects = result.current.projects.data
    if (!initialProjects) throw new Error('The initial query did not return projects.')
    const initialCount = initialProjects.length
    let id = ''
    const input = {
      name: 'Query integration',
      description: 'A synchronized project.',
      status: 'active' as const,
    }

    await act(async () => {
      id = (await result.current.create.mutateAsync(input)).id
    })
    expect(result.current.projects.data).toHaveLength(initialCount + 1)
    expect(result.current.projects.data.find((project) => project.id === id)?.name).toBe(
      'Query integration',
    )

    await act(async () => {
      await result.current.update.mutateAsync({
        id,
        input: { ...input, name: 'Updated name', status: 'paused' },
      })
    })
    expect(result.current.projects.data.find((project) => project.id === id)).toMatchObject({
      name: 'Updated name',
      status: 'paused',
    })

    await act(async () => {
      await result.current.remove.mutateAsync(id)
    })
    expect(result.current.projects.data).toHaveLength(initialCount)
    expect(result.current.projects.data.some((project) => project.id === id)).toBe(false)
    expect(invalidate).toHaveBeenCalledTimes(3)
    expect(invalidate).toHaveBeenLastCalledWith({ queryKey: projectKeys.all })
    queryClient.clear()
  })
})
