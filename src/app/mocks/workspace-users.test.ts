// @vitest-environment node
import { QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  currentDemoUser,
  createDemoWorkspaceUserAdapter,
  workspaceUserKeys,
  workspaceUserQueryOptions,
  workspaceUsersQueryOptions,
} from '@/entities/workspace-user'
import { createDemoHandlers } from './handlers'

vi.mock('@/shared/config', () => ({
  env: { dataSource: 'demo', apiBaseUrl: 'http://localhost/api' },
}))
const collection = 'http://localhost/api/workspace-users'
const server = setupServer()
let client: QueryClient
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})
beforeEach(() => {
  server.resetHandlers(
    ...createDemoHandlers({
      workspaceUsers: createDemoWorkspaceUserAdapter({ storage: null }),
      delayMs: 0,
    }),
  )
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => {
  client.clear()
})
afterAll(() => {
  server.close()
})
function send(url: string, method: string, input: unknown) {
  return fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
}

describe('workspace users HTTP and read cache', () => {
  it('invites, rejects duplicate email, updates another member, and protects the current account', async () => {
    expect(await client.query(workspaceUsersQueryOptions())).toContainEqual(currentDemoUser)
    const input = { name: ' Jamie ', email: ' JAMIE@Example.com ', role: 'member' }
    const invited = await send(collection, 'POST', {
      ...input,
      id: 'injected',
      status: 'active',
      password: 'unused',
    })
    expect(invited.status).toBe(201)
    expect(invited.headers.get('cache-control')).toBe('no-store')
    const member = (await invited.json()) as { id: string }
    expect(member).toMatchObject({
      name: 'Jamie',
      email: 'jamie@example.com',
      role: 'member',
      status: 'invited',
    })
    expect(member.id).not.toBe('injected')
    expect(member).not.toHaveProperty('password')
    expect((await send(collection, 'POST', { ...input, email: 'jamie@example.com' })).status).toBe(
      409,
    )
    expect(
      (
        await send(`${collection}/${currentDemoUser.id}`, 'PATCH', {
          role: 'viewer',
          status: 'suspended',
        })
      ).status,
    ).toBe(403)
    expect(await client.query(workspaceUserQueryOptions(currentDemoUser.id))).toEqual(
      currentDemoUser,
    )
    const patch = { role: 'viewer', status: 'active' }
    expect(
      (
        await send(`${collection}/${member.id}`, 'PATCH', {
          ...patch,
          email: 'override@example.com',
        })
      ).status,
    ).toBe(200)
    expect(await client.query(workspaceUserQueryOptions(member.id))).toMatchObject({
      ...member,
      ...patch,
    })
    await client.invalidateQueries({ queryKey: workspaceUserKeys.all })
    expect(await client.query(workspaceUsersQueryOptions())).toHaveLength(5)
  })
  it('reads the canonical owner profile and keeps older or missing-photo members usable', async () => {
    expect(await client.query(workspaceUserQueryOptions(currentDemoUser.id))).toMatchObject({
      name: 'soohyun chae',
      givenName: 'soohyun',
      familyName: 'chae',
      nickname: 'soohyun',
      avatarUrl: '/avatars/soohyun-chae.svg',
    })
    const member = {
      id: 'legacy-user',
      name: 'Other Member',
      email: 'other@example.com',
      role: 'member',
      status: 'active',
    }
    server.use(
      http.get(collection, () =>
        HttpResponse.json([
          member,
          {
            ...member,
            id: 'missing-photo',
            email: 'another@example.com',
            nickname: 'Another',
            avatarUrl: '//invalid.example/picture',
          },
        ]),
      ),
    )
    const users = await client.query(workspaceUsersQueryOptions())
    expect(users[0]).toEqual(member)
    expect(users[1]?.nickname).toBe('Another')
    expect(users[1]?.avatarUrl).toBeUndefined()
  })
  it('rejects malformed inputs, returns 404 for missing records and never treats invalid lists as empty', async () => {
    expect(
      (await send(collection, 'POST', { name: 'Invalid', email: 'bad', role: 'owner' })).status,
    ).toBe(400)
    expect(
      (await send(`${collection}/missing`, 'PATCH', { role: 'viewer', status: 'active' })).status,
    ).toBe(404)
    expect((await send(`${collection}/usr_jordan`, 'PATCH', { role: 'viewer' })).status).toBe(400)
    expect(await client.query(workspaceUserQueryOptions('missing'))).toBeNull()
    server.use(
      http.get(collection, () =>
        HttpResponse.json([
          currentDemoUser,
          { ...currentDemoUser, id: 'other', email: 'ADMIN@EXAMPLE.COM' },
        ]),
      ),
    )
    await expect(client.query(workspaceUsersQueryOptions())).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
    expect(client.getQueryData(workspaceUserKeys.list())).toBeUndefined()
  })
})
