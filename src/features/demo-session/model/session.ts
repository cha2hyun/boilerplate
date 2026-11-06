import { currentDemoUser } from '@/entities/workspace-user'
import { storageKeys } from '@/shared/config/product'
import type { DemoSession } from './login-contract'

const demoSession: DemoSession = Object.freeze({ id: currentDemoUser.id })
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Constructing the store does not read window or storage. The first route read restores the tab. */
export function createDemoSessionStore(resolveStorage: () => SessionStorage | null) {
  let current: DemoSession | null = null
  let memoryOnly = false
  const listeners = new Set<() => void>()

  function getSnapshot() {
    if (!memoryOnly) {
      try {
        const storage = resolveStorage()
        if (storage) {
          current = storage.getItem(storageKeys.demoSession) === demoSession.id ? demoSession : null
        } else {
          memoryOnly = true
        }
      } catch {
        memoryOnly = true
      }
    }
    return current
  }

  function publish(next: DemoSession | null) {
    current = next
    try {
      // Always attempt removal on sign-out, even if an earlier write failed.
      const storage = resolveStorage()
      if (next === null) storage?.removeItem(storageKeys.demoSession)
      else if (storage && !memoryOnly) storage.setItem(storageKeys.demoSession, next.id)
      if (!storage) memoryOnly = true
    } catch {
      memoryOnly = true
    }
    for (const listener of listeners) listener()
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    // Recheck sessionStorage when a cached document returns through browser history.
    if (typeof window !== 'undefined') window.addEventListener('pageshow', listener)
    return () => {
      listeners.delete(listener)
      if (typeof window !== 'undefined') window.removeEventListener('pageshow', listener)
    }
  }

  return {
    getSnapshot,
    subscribe,
    accept: (session: DemoSession) => {
      publish(session)
    },
    end: () => {
      publish(null)
    },
  }
}

export const sessionStore = createDemoSessionStore(() =>
  typeof window === 'undefined' ? null : window.sessionStorage,
)
