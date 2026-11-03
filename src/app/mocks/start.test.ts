import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startDemoMocks } from './start'

const { mockEnv, start } = vi.hoisted(() => ({
  mockEnv: { dataSource: 'demo' },
  start: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/shared/config', () => ({ env: mockEnv }))
vi.mock('./browser', () => ({ worker: { start } }))

beforeEach(() => {
  mockEnv.dataSource = 'demo'
  start.mockReset()
  start.mockResolvedValue(undefined)
})

describe('demo network startup', () => {
  it('never starts the mock worker in API mode', async () => {
    mockEnv.dataSource = 'api'
    await startDemoMocks()
    expect(start).not.toHaveBeenCalled()
  })

  it('waits for the demo worker before allowing the application to mount', async () => {
    let ready!: () => void
    start.mockReturnValue(
      new Promise<void>((resolve) => {
        ready = resolve
      }),
    )
    let settled = false
    const startup = startDemoMocks().then(() => {
      settled = true
    })

    await vi.waitFor(() => {
      expect(start).toHaveBeenCalledOnce()
    })
    expect(settled).toBe(false)
    expect(start).toHaveBeenCalledWith({
      serviceWorker: { url: '/mockServiceWorker.js' },
      onUnhandledFrame: 'bypass',
      quiet: true,
    })

    ready()
    await startup
    expect(settled).toBe(true)
  })

  it('propagates startup errors so the app can show a retry screen', async () => {
    const failure = new Error('Service worker registration failed')
    start.mockRejectedValue(failure)
    await expect(startDemoMocks()).rejects.toBe(failure)
  })
})
