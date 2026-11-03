import type { StateStorage } from 'zustand/middleware'

type BrowserStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getBrowserStorage(): BrowserStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Preferences stay usable for this session if persistent browser storage fails. */
export function createPreferenceStorage(initialStorage = getBrowserStorage()): StateStorage {
  let persistentStorage = initialStorage
  const memory = new Map<string, string>()

  return {
    getItem(name) {
      if (persistentStorage) {
        try {
          const value = persistentStorage.getItem(name)
          if (value === null) memory.delete(name)
          else memory.set(name, value)
          return value
        } catch {
          persistentStorage = null
        }
      }
      return memory.get(name) ?? null
    },
    setItem(name, value) {
      memory.set(name, value)
      try {
        persistentStorage?.setItem(name, value)
      } catch {
        persistentStorage = null
      }
    },
    removeItem(name) {
      memory.delete(name)
      try {
        persistentStorage?.removeItem(name)
      } catch {
        persistentStorage = null
      }
    },
  }
}
