/** Session-only status, never demo records or browser storage contents. */
export function createDemoStorageStatus() {
  const unavailable = new Set<string>()
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => unavailable.size > 0,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    markUnavailable: (key: string) => {
      if (unavailable.has(key)) return
      unavailable.add(key)
      for (const listener of listeners) listener()
    },
  }
}

export const demoStorageStatus = createDemoStorageStatus()
export const markDemoStorageUnavailable = demoStorageStatus.markUnavailable
