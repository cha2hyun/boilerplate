import type { PropsWithChildren } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { projectSchema } from '../model/schema'
import { projectKeys, projectsQueryOptions, useCreateProject } from './queries'
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
