import { describe, expect, it, vi } from 'vitest'
import { createDemoProjectAdapter, PROJECT_STORAGE_KEY } from './demo'
import { seedProjects } from './seed'

function memoryStorage(initial?: string) {
  const values = new Map<string, string>()
  if (initial !== undefined) values.set(PROJECT_STORAGE_KEY, initial)
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

const input = {
  name: 'Launch checklist',
  description: 'Prepare our next release.',
  status: 'active' as const,
}

describe('persistent demo adapter', () => {
  it('persists create, edit and delete across independent adapter instances', async () => {
    const storage = memoryStorage()
    const firstSession = createDemoProjectAdapter({
      storage,
      delayMs: 0,
      createId: () => 'prj_test',
      now: () => new Date('2026-11-03T10:00:00.000Z'),
    })
    const created = await firstSession.create(input)
    expect(created).toMatchObject({ ...input, id: 'prj_test', progress: 0 })
    expect(created.owner.email).toBe('alex@example.com')

    const secondSession = createDemoProjectAdapter({ storage, delayMs: 0 })
    expect(await secondSession.list()).toHaveLength(seedProjects.length + 1)
    await secondSession.update(created.id, { ...input, name: 'Ready to launch', status: 'paused' })

    const thirdSession = createDemoProjectAdapter({ storage, delayMs: 0 })
    expect((await thirdSession.list()).find((project) => project.id === created.id)).toMatchObject({
      name: 'Ready to launch',
      status: 'paused',
      progress: 0,
    })
    await thirdSession.delete(created.id)
    expect(await firstSession.list()).toHaveLength(seedProjects.length)
    expect((await firstSession.list()).some((project) => project.id === created.id)).toBe(false)
  })

  it.each([
    '{not json',
    JSON.stringify({ version: 99, projects: [] }),
    JSON.stringify({ version: 1, projects: [{ id: 'broken' }] }),
    JSON.stringify({ version: 1, projects: [seedProjects[0], seedProjects[0]] }),
  ])('recovers corrupt storage without passing malformed data to the UI', async (raw) => {
    const storage = memoryStorage(raw)
    const adapter = createDemoProjectAdapter({ storage, delayMs: 0 })
    expect(await adapter.list()).toEqual(seedProjects)
    expect(JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? 'null')).toEqual({
      version: 1,
      projects: seedProjects,
    })
  })

  it('preserves an intentionally empty project list', async () => {
    const storage = memoryStorage(JSON.stringify({ version: 1, projects: [] }))
    expect(await createDemoProjectAdapter({ storage, delayMs: 0 }).list()).toEqual([])
  })

  it('rejects a generated ID collision without replacing existing projects', async () => {
    const storage = memoryStorage()
    const adapter = createDemoProjectAdapter({ storage, delayMs: 0, createId: () => 'collision' })
    await adapter.create(input)
    const before = storage.getItem(PROJECT_STORAGE_KEY)
    await expect(adapter.create({ ...input, name: 'Second project' })).rejects.toMatchObject({
      status: 409,
    })
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBe(before)
    expect((await adapter.list()).filter((project) => project.id === 'collision')).toHaveLength(1)
  })

  it('keeps mutations working when storage is unavailable', async () => {
    const onStorageUnavailable = vi.fn()
    const adapter = createDemoProjectAdapter({
      onStorageUnavailable,
      storage: {
        getItem: () => {
          throw new DOMException('Access denied', 'SecurityError')
        },
        setItem: () => {
          throw new DOMException('Access denied', 'SecurityError')
        },
      },
      delayMs: 0,
      createId: () => 'prj_memory',
    })
    await adapter.create(input)
    expect((await adapter.list()).map((project) => project.id)).toContain('prj_memory')
    expect(onStorageUnavailable).toHaveBeenCalledTimes(1)
  })

  it('does not lose a mutation when writing to storage exceeds its quota', async () => {
    const onStorageUnavailable = vi.fn()
    const adapter = createDemoProjectAdapter({
      onStorageUnavailable,
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        },
      },
      delayMs: 0,
      createId: () => 'prj_quota',
    })
    await adapter.create(input)
    expect((await adapter.list()).map((project) => project.id)).toContain('prj_quota')
    expect(onStorageUnavailable).toHaveBeenCalledTimes(1)
  })

  it('cancels a delayed mutation before writing any data', async () => {
    const storage = memoryStorage()
    const adapter = createDemoProjectAdapter({ storage, delayMs: 1000 })
    const controller = new AbortController()
    const pending = adapter.create(input, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull()
  })

  it('returns a typed 404 for editing or deleting a missing project', async () => {
    const adapter = createDemoProjectAdapter({ storage: null, delayMs: 0 })
    await expect(adapter.update('missing', input)).rejects.toMatchObject({ status: 404 })
    await expect(adapter.delete('missing')).rejects.toMatchObject({ status: 404 })
  })

  it('validates input before changing persistent data', async () => {
    const storage = memoryStorage()
    const adapter = createDemoProjectAdapter({ storage, delayMs: 0 })
    await expect(adapter.create({ ...input, name: ' ' })).rejects.toThrow()
    expect(storage.getItem(PROJECT_STORAGE_KEY)).toBeNull()
  })
})
