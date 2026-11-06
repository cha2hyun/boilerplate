import { afterEach, describe, expect, it, vi } from 'vitest'
import { storageKeys } from '@/shared/config/product'
import { currentDemoUser } from '../model/schema'
import { createDemoWorkspaceUserAdapter } from './demo'
import { seedWorkspaceUsers } from './seed'

const invite = { name: 'Riley Park', email: ' Riley@Example.com ', role: 'viewer' as const }
afterEach(() => {
  vi.unstubAllGlobals()
})
function storageWith(initial: string | null = null) {
  let value = initial
  return {
    getItem: () => value,
    setItem: (key: string, next: string) => {
      expect(key).toBe(storageKeys.demoWorkspaceUsers)
      value = next
    },
  }
}

describe('workspace member demo storage', () => {
  it('creates a pending record and restores an edit across sessions without secure-context UUIDs', async () => {
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    })
    const storage = storageWith()
    const first = createDemoWorkspaceUserAdapter({ storage })
    const added = await first.invite(invite)
    expect(added).toMatchObject({
      name: invite.name,
      email: 'riley@example.com',
      status: 'invited',
      role: 'viewer',
    })
    const reopened = createDemoWorkspaceUserAdapter({ storage })
    expect(await reopened.detail(added.id)).toEqual(added)
    await reopened.update(added.id, { role: 'member', status: 'active' })
    const refreshed = await first.detail(added.id)
    expect(refreshed).toEqual({ ...added, status: 'active', role: 'member' })
    refreshed.name = 'Altered outside the adapter'
    expect((await first.detail(added.id)).name).toBe(invite.name)
  })

  it.each([
    '{',
    JSON.stringify({ version: 2, users: seedWorkspaceUsers }),
    JSON.stringify({ version: 1, users: [] }),
    JSON.stringify({ version: 1, users: [{ ...currentDemoUser, role: 'viewer' }] }),
    JSON.stringify({ version: 1, users: [...seedWorkspaceUsers, currentDemoUser] }),
  ])(
    'recovers corrupt or unrecognized persisted state while retaining the demo owner',
    async (value) => {
      const storage = storageWith(value)
      const adapter = createDemoWorkspaceUserAdapter({ storage })
      expect(await adapter.list()).toEqual(seedWorkspaceUsers)
      expect(JSON.parse(storage.getItem() ?? 'null')).toEqual({
        version: 1,
        users: seedWorkspaceUsers,
      })
    },
  )

  it('continues from the restored data after a write fails and announces the fallback once', async () => {
    const existing = {
      id: 'imported',
      name: 'Existing',
      email: 'existing@example.com',
      role: 'member',
      status: 'active',
    }
    const storage = {
      getItem: () => JSON.stringify({ version: 1, users: [currentDemoUser, existing] }),
      setItem: () => {
        throw new Error('Quota')
      },
    }
    const unavailable = vi.fn(() => {
      throw new Error('Detached listener')
    })
    const adapter = createDemoWorkspaceUserAdapter({ storage, onStorageUnavailable: unavailable })
    const added = await adapter.invite(invite)
    expect(await adapter.detail(existing.id)).toEqual(existing)
    await adapter.update(added.id, { role: 'admin', status: 'suspended' })
    expect(unavailable).toHaveBeenCalledTimes(1)
    expect(await adapter.detail(added.id)).toMatchObject({ role: 'admin', status: 'suspended' })
  })

  it('does not write a canceled invitation', async () => {
    const storage = storageWith()
    const adapter = createDemoWorkspaceUserAdapter({ storage, delayMs: 1_000 })
    const controller = new AbortController()
    const write = adapter.invite(invite, controller.signal)
    controller.abort()
    await expect(write).rejects.toMatchObject({ name: 'AbortError' })
    expect(storage.getItem()).toBeNull()
  })
})
