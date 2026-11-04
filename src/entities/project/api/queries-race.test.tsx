import type { PropsWithChildren } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectSchema } from '../model/schema'
import {
  projectKeys,
  projectsQueryOptions,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from './queries'
import { seedProjects } from './seed'

vi.mock('@/shared/config', () => ({
  env: { dataSource: 'api', apiBaseUrl: '/api' },
}))

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('project mutation and list concurrency', () => {
  it.each(['create', 'update', 'delete'] as const)(
    'reconciles an uncertain %s after cancelling an older list request',
    async (operation) => {
      const existing = seedProjects[0]
      if (!existing) throw new Error('The fixture needs a project to modify.')
      const input = {
        name: 'Applied before disconnection',
        description: '',
        status: 'active' as const,
      }
      const changed = projectSchema.parse({
        ...existing,
        ...input,
        id: operation === 'create' ? 'prj_created' : existing.id,
      })
      const savedProjects =
        operation === 'create'
          ? [changed, ...seedProjects]
          : operation === 'update'
            ? seedProjects.map((project) => (project.id === existing.id ? changed : project))
            : seedProjects.filter((project) => project.id !== existing.id)
      const initialResponse = deferred<Response>()
      const invalidated = deferred<undefined>()
      let firstSignal: AbortSignal | null | undefined
      let reads = 0
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>((_url, options) => {
          if (options?.method) return Promise.reject(new TypeError('Connection lost after commit'))
          reads += 1
          if (reads === 1) {
            firstSignal = options?.signal
            return initialResponse.promise
          }
          return Promise.resolve(Response.json(savedProjects))
        }),
      )
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
      const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
        if (event.type === 'updated' && event.query.state.isInvalidated)
          invalidated.resolve(undefined)
      })
      function Wrapper({ children }: PropsWithChildren) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      }
      try {
        const { result } = renderHook(
          () => ({
            projects: useQuery(projectsQueryOptions()),
            create: useCreateProject(),
            update: useUpdateProject(),
            delete: useDeleteProject(),
          }),
          { wrapper: Wrapper },
        )
        await waitFor(() => {
          expect(reads).toBe(1)
        })

        await act(async () => {
          const pending =
            operation === 'create'
              ? result.current.create.mutateAsync(input)
              : operation === 'update'
                ? result.current.update.mutateAsync({ id: existing.id, input })
                : result.current.delete.mutateAsync(existing.id)
          const outcome = pending.catch((error: unknown) => error)
          await invalidated.promise
          initialResponse.resolve(Response.json(seedProjects))
          expect(await outcome).toMatchObject({ code: 'NETWORK_ERROR', mayHaveSucceeded: true })
        })
        expect(firstSignal?.aborted).toBe(true)
        expect(reads).toBe(2)
        await waitFor(() => {
          expect(result.current.projects.data).toEqual(savedProjects)
          expect(result.current[operation].isError).toBe(true)
        })
      } finally {
        unsubscribe()
        cleanup()
        queryClient.clear()
      }
    },
  )

  it('keeps a successful creation when the initial list response arrives late', async () => {
    const input = { name: 'Created during loading', description: '', status: 'active' as const }
    const created = projectSchema.parse({ ...seedProjects[0], ...input, id: 'prj_created' })
    const initialResponse = deferred<Response>()
    const invalidated = deferred<undefined>()
    let firstSignal: AbortSignal | null | undefined
    let reads = 0
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_url, options) => {
        if (options?.method === 'POST') return Promise.resolve(Response.json(created))
        reads += 1
        if (reads === 1) {
          firstSignal = options?.signal
          return initialResponse.promise
        }
        return Promise.resolve(Response.json([created, ...seedProjects]))
      }),
    )

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.isInvalidated)
        invalidated.resolve(undefined)
    })
    function Wrapper({ children }: PropsWithChildren) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    try {
      const { result } = renderHook(
        () => ({ projects: useQuery(projectsQueryOptions()), create: useCreateProject() }),
        { wrapper: Wrapper },
      )
      await waitFor(() => {
        expect(reads).toBe(1)
      })

      await act(async () => {
        const mutation = result.current.create.mutateAsync(input)
        await invalidated.promise
        initialResponse.resolve(Response.json(seedProjects))
        await mutation
      })

      expect(firstSignal?.aborted).toBe(true)
      expect(reads).toBe(2)
      await waitFor(() => {
        expect(result.current.projects.data).toEqual([created, ...seedProjects])
      })
      expect(queryClient.getQueryData(projectKeys.lists())).toEqual([created, ...seedProjects])
    } finally {
      unsubscribe()
      cleanup()
      queryClient.clear()
    }
  })
})
