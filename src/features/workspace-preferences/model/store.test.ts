import { describe, expect, it } from 'vitest'
import { createPreferenceStorage } from './storage'
import { createPreferencesStore } from './store'

const key = 'blueprint-preferences'

function createStorage(initial?: string) {
  const memory = new Map<string, string>()
  if (initial !== undefined) memory.set(key, initial)
  return {
    getItem: (name: string) => memory.get(name) ?? null,
    setItem: (name: string, value: string) => {
      memory.set(name, value)
    },
    removeItem: (name: string) => {
      memory.delete(name)
    },
  }
}

describe('workspace preferences', () => {
  it('persists validated preferences and hydrates a new store', () => {
    const storage = createStorage()
    const first = createPreferencesStore(createPreferenceStorage(storage))
    first.getState().save({ workspaceName: '  Design Studio  ', compactMode: true })
    const second = createPreferencesStore(createPreferenceStorage(storage))
    expect(second.getState()).toMatchObject({ workspaceName: 'Design Studio', compactMode: true })
    expect(JSON.parse(storage.getItem(key) ?? 'null')).toEqual({
      state: { workspaceName: 'Design Studio', compactMode: true },
      version: 1,
    })
  })

  it.each([
    '{not json',
    JSON.stringify({ state: { workspaceName: 123, compactMode: 'yes' }, version: 1 }),
    JSON.stringify({ state: { workspaceName: 'Old format', compactMode: true }, version: 0 }),
  ])('retains safe defaults for malformed or unsupported persisted preferences', (raw) => {
    const store = createPreferencesStore(createPreferenceStorage(createStorage(raw)))
    expect(store.getState()).toMatchObject({ workspaceName: 'Acme Studio', compactMode: false })
    expect(typeof store.getState().save).toBe('function')
  })

  it('rejects invalid input without changing state or persistence', () => {
    const storage = createStorage()
    const store = createPreferencesStore(createPreferenceStorage(storage))
    expect(() => {
      store.getState().save({ workspaceName: ' ', compactMode: true })
    }).toThrow()
    expect(store.getState().workspaceName).toBe('Acme Studio')
    expect(storage.getItem(key)).toBeNull()
  })

  it('keeps preferences usable when storage access is denied', () => {
    const fallback = createPreferenceStorage({
      getItem: () => {
        throw new DOMException('Access denied', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('Access denied', 'SecurityError')
      },
      removeItem: () => {
        throw new DOMException('Access denied', 'SecurityError')
      },
    })
    const store = createPreferencesStore(fallback)
    expect(() => {
      store.getState().save({ workspaceName: 'Private session', compactMode: true })
    }).not.toThrow()
    expect(createPreferencesStore(fallback).getState()).toMatchObject({
      workspaceName: 'Private session',
      compactMode: true,
    })
    store.getState().reset()
    expect(createPreferencesStore(fallback).getState()).toMatchObject({
      workspaceName: 'Acme Studio',
      compactMode: false,
    })
  })

  it('falls back to the latest session value after a quota error', () => {
    const storage = createStorage(
      JSON.stringify({ state: { workspaceName: 'Previous name', compactMode: false }, version: 1 }),
    )
    const fallback = createPreferenceStorage({
      ...storage,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      },
    })
    const store = createPreferencesStore(fallback)
    store.getState().save({ workspaceName: 'New name', compactMode: true })
    expect(createPreferencesStore(fallback).getState()).toMatchObject({
      workspaceName: 'New name',
      compactMode: true,
    })
  })
})
