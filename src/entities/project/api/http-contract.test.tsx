import type { PropsWithChildren } from 'react'
import { httpProjectAdapter } from './http'
import { seedProjects } from './seed'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import type { Project } from '../model/schema'
import {
  projectKeys,
  projectsQueryOptions,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from './queries'

// Keep the real adapter, transport and Query lifecycle; replace only the server boundary.
vi.mock('@/shared/config', () => ({
  env: { dataSource: 'api', apiBaseUrl: 'https://api.example.test/workspace/v1/' },
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('rejects duplicate identities at the HTTP list boundary', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json([seedProjects[0], seedProjects[0]])),
  )
  await expect(httpProjectAdapter.list()).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
    status: 200,
    mayHaveSucceeded: false,
  })
})

it('sends the HTTP project CRUD contract and synchronizes the active list from server responses', async () => {
  const existing: Project = {
    id: 'existing',
    name: 'Existing project',
    description: '',
    status: 'active',
    owner: { name: 'Sam Lee', email: 'sam@example.test', initials: 'SL' },
    progress: 0,
    updatedAt: '2026-11-03T00:00:00Z',
  }
  const createInput = {
    name: '  HTTP contract  ',
    description: '  Created over HTTP.  ',
    status: 'active' as const,
    id: 'must-not-be-sent',
    progress: 99,
  }
  const createBody = {
    name: 'HTTP contract',
    description: 'Created over HTTP.',
    status: 'active',
  }
  const created: Project = {
    ...existing,
    ...createBody,
    status: 'active',
    id: 'prj /한글?#%',
  }
  const createList = [{ ...created, progress: 15 }, existing]
  const updateInput = {
    name: '  Edited over HTTP  ',
    description: '  Updated description.  ',
    status: 'paused' as const,
    id: 'must-not-be-sent',
    progress: 99,
  }
  const updateBody = {
    name: 'Edited over HTTP',
    description: 'Updated description.',
    status: 'paused',
  }
  const updated: Project = { ...created, ...updateBody, status: 'paused', progress: 25 }
  const updateList = [{ ...updated, progress: 35 }, existing]
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json([existing]))
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockResolvedValueOnce(Response.json(createList))
    .mockResolvedValueOnce(Response.json(updated))
    .mockResolvedValueOnce(Response.json(updateList))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json([existing]))
  vi.stubGlobal('fetch', fetchMock)

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
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
        remove: useDeleteProject(),
      }),
      { wrapper: Wrapper },
    )
    await waitFor(() => {
      expect(result.current.projects.data).toEqual([existing])
    })

    await act(async () => {
      expect(await result.current.create.mutateAsync(createInput)).toEqual(created)
    })
    await waitFor(() => {
      expect(result.current.projects.data).toEqual(createList)
    })
    expect(queryClient.getQueryData(projectKeys.lists())).toEqual(createList)

    await act(async () => {
      expect(
        await result.current.update.mutateAsync({ id: created.id, input: updateInput }),
      ).toEqual(updated)
    })
    await waitFor(() => {
      expect(result.current.projects.data).toEqual(updateList)
    })
    expect(queryClient.getQueryData(projectKeys.lists())).toEqual(updateList)

    await act(async () => {
      await result.current.remove.mutateAsync(created.id)
    })
    await waitFor(() => {
      expect(result.current.projects.data).toEqual([existing])
      expect(result.current.remove.isSuccess).toBe(true)
    })
    expect(queryClient.getQueryData(projectKeys.lists())).toEqual([existing])

    const collectionUrl = 'https://api.example.test/workspace/v1/projects'
    const itemUrl = `${collectionUrl}/prj%20%2F%ED%95%9C%EA%B8%80%3F%23%25`
    expect(
      fetchMock.mock.calls.map(([url, options]) => ({
        url,
        method: options?.method ?? 'GET',
        body: options?.body,
      })),
    ).toEqual([
      { url: collectionUrl, method: 'GET', body: undefined },
      { url: collectionUrl, method: 'POST', body: JSON.stringify(createBody) },
      { url: collectionUrl, method: 'GET', body: undefined },
      { url: itemUrl, method: 'PATCH', body: JSON.stringify(updateBody) },
      { url: collectionUrl, method: 'GET', body: undefined },
      { url: itemUrl, method: 'DELETE', body: undefined },
      { url: collectionUrl, method: 'GET', body: undefined },
    ])
  } finally {
    cleanup()
    queryClient.clear()
  }
})
