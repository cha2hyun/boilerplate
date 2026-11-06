import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { currentDemoUser, type WorkspaceUser } from '../model/schema'
import { httpWorkspaceUserAdapter } from './http'
import { workspaceUsersQueryOptions, useUpdateWorkspaceUser } from './queries'

vi.mock('@/shared/config', () => ({ env: { dataSource: 'api', apiBaseUrl: '/api' } }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('cancels stale reads and reconciles an uncertain member update without re-sending it', async () => {
  const member: WorkspaceUser = {
    ...currentDemoUser,
    id: 'usr_1',
    email: 'first@example.com',
    role: 'member',
  }
  const updated = { ...member, role: 'viewer' as const }
  let reads = 0
  let writes = 0
  let firstReadSignal: AbortSignal | null | undefined
  let releaseFirstRead!: (response: Response) => void
  const firstRead = new Promise<Response>((resolve) => {
    releaseFirstRead = resolve
  })
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>((_url, options) => {
      if (options?.method === 'PATCH') {
        writes++
        return Promise.resolve(new Response(null, { status: 502 }))
      }
      if (++reads === 1) {
        firstReadSignal = options?.signal
        return firstRead
      }
      return Promise.resolve(Response.json([currentDemoUser, updated]))
    }),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 2 } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  try {
    const { result } = renderHook(
      () => ({ members: useQuery(workspaceUsersQueryOptions()), update: useUpdateWorkspaceUser() }),
      { wrapper },
    )
    await waitFor(() => {
      expect(reads).toBe(1)
    })
    await act(async () => {
      await expect(
        result.current.update.mutateAsync({
          id: updated.id,
          input: { role: 'viewer', status: 'active' },
        }),
      ).rejects.toMatchObject({ status: 502, mayHaveSucceeded: true })
      releaseFirstRead(Response.json([currentDemoUser, member]))
    })
    await waitFor(() => {
      expect(result.current.members.data).toEqual([currentDemoUser, updated])
    })
    expect(firstReadSignal?.aborted).toBe(true)
    expect(result.current.update.isError).toBe(true)
    expect(writes).toBe(1)
    expect(reads).toBe(2)
  } finally {
    cleanup()
    client.clear()
  }
})

it('blocks unsafe ID segments and treats a wrong successful PATCH identity as uncertain', async () => {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(currentDemoUser)))
  vi.stubGlobal('fetch', fetchMock)
  const update = { role: 'viewer' as const, status: 'active' as const }
  for (const id of ['', '.', '..']) {
    await expect(httpWorkspaceUserAdapter.update(id, update)).rejects.toMatchObject({
      status: 400,
      mayHaveSucceeded: false,
    })
  }
  expect(fetchMock).not.toHaveBeenCalled()
  await expect(httpWorkspaceUserAdapter.update('not the owner', update)).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
    mayHaveSucceeded: true,
  })
  expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/workspace-users/not%20the%20owner')
})
