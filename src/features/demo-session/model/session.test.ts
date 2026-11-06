import { describe, expect, it, vi } from 'vitest'
import { storageKeys } from '@/shared/config/product'
import { currentDemoUser } from '@/entities/workspace-user'
import { createDemoSessionStore } from './session'

const verified = { id: currentDemoUser.id }

function browserStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key)
    }),
  }
}

describe('tab demo session', () => {
  it('restores only the known demo ID and stores no credentials or unrelated data', () => {
    const storage = browserStorage()
    const resolve = vi.fn(() => storage)
    const store = createDemoSessionStore(resolve)
    expect(resolve).not.toHaveBeenCalled()
    storage.setItem(storageKeys.demoSession, JSON.stringify({ id: 'other' }))
    expect(store.getSnapshot()).toBeNull()
    storage.setItem('unrelated', 'keep')
    storage.setItem.mockClear()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.accept(verified)
    expect(storage.setItem.mock.calls).toEqual([[storageKeys.demoSession, 'usr_demo']])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toBe(store.getSnapshot())
    const reload = createDemoSessionStore(resolve)
    expect(reload.getSnapshot()).toEqual({ id: 'usr_demo' })
    const otherTabStorage = browserStorage()
    expect(createDemoSessionStore(() => otherTabStorage).getSnapshot()).toBeNull()
    unsubscribe()
    store.end()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(storage.removeItem.mock.calls).toEqual([[storageKeys.demoSession]])
    expect(storage.getItem('unrelated')).toBe('keep')
    expect(reload.getSnapshot()).toBeNull()
  })

  it('keeps login and logout usable in memory when accessing or writing storage fails', () => {
    const blocked = () => {
      throw new DOMException('Blocked', 'SecurityError')
    }
    const readOnly = browserStorage()
    readOnly.setItem.mockImplementation(blocked)
    for (const resolve of [blocked, () => readOnly]) {
      const store = createDemoSessionStore(resolve)
      expect(store.getSnapshot()).toBeNull()
      store.accept(verified)
      expect(store.getSnapshot()).toEqual({ id: 'usr_demo' })
      expect(createDemoSessionStore(resolve).getSnapshot()).toBeNull()
      store.end()
      expect(store.getSnapshot()).toBeNull()
    }
  })

  it('rechecks the marker when browser history restores a cached document', () => {
    const storage = browserStorage()
    const store = createDemoSessionStore(() => storage)
    store.accept(verified)
    let observed = store.getSnapshot()
    const off = store.subscribe(() => {
      observed = store.getSnapshot()
    })
    storage.removeItem(storageKeys.demoSession)
    window.dispatchEvent(new Event('pageshow'))
    expect(observed).toBeNull()
    off()
  })
})
