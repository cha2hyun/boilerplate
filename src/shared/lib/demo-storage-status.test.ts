import { describe, expect, it, vi } from 'vitest'
import { createDemoStorageStatus } from './demo-storage-status'

describe('demo storage status', () => {
  it('retains session-only status for late subscribers without repeating the same failure', () => {
    const status = createDemoStorageStatus()
    const listener = vi.fn()
    expect(status.getSnapshot()).toBe(false)
    const unsubscribe = status.subscribe(listener)
    status.markUnavailable('demo-records')
    status.markUnavailable('demo-records')
    expect(status.getSnapshot()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    status.markUnavailable('other-records')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(status.getSnapshot()).toBe(true)
    expect(createDemoStorageStatus().getSnapshot()).toBe(false)
  })
})
